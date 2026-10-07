"""Real-engine checks for seeded data, financial invariants and saved index proof.

Each test uses its own PostgreSQL connection; tearDown rolls back fixture writes.
Nested transaction contexts create savepoints so expected errors do not destroy
the outer fixture transaction. MongoDB checks here are read-only.
The 500,000-session check is time-sensitive: TTL expiration is intentional, so
run after a fresh telemetry seed/replenishment when verifying stress-test scale.
"""

import json
import os
import unittest
from pathlib import Path
from datetime import datetime, timedelta, timezone
import psycopg
from pymongo import MongoClient


# Each method is an independent invariant check; the class does not reset seeded user
# data.
class DatabaseChecks(unittest.TestCase):
    def setUp(self):
        """Start the isolated SQL connection/cursor used by this test's fixture."""
        self.conn = psycopg.connect(os.environ["DATABASE_URL"])
        self.cur = self.conn.cursor()

    def tearDown(self):
        """Roll back any fixture writes and release the connection even after a failed assertion."""
        self.conn.rollback()
        self.conn.close()

    def test_required_row_counts(self):
        """Verify persisted relational volumes meet the assignment thresholds."""
        for name, minimum in [("bookings", 50000), ("wallet_audit_logs", 100000)]:
            self.cur.execute("SELECT count(*) FROM " + name)
            self.assertGreaterEqual(self.cur.fetchone()[0], minimum)

    def test_booking_debit_and_trigger_are_atomic(self):
        """Check one successful debit and ensure a conflicting check-in rolls back its second debit/audit.
        Complete the first stay and prove the unique-index slot becomes available again.
        """
        self.cur.execute(
            "INSERT INTO guests(name,wallet_balance) VALUES ('Check fixture',50000) RETURNING id"
        )
        guest = self.cur.fetchone()[0]
        self.cur.execute("CALL create_booking(%s,1,1,'CHECKED_IN',NULL)", (guest,))
        booking = self.cur.fetchone()[0]
        self.cur.execute(
            "SELECT count(*) FROM wallet_audit_logs WHERE guest_id=%s", (guest,)
        )
        self.assertEqual(self.cur.fetchone()[0], 1)
        self.cur.execute("SELECT wallet_balance FROM guests WHERE id=%s", (guest,))
        balance = self.cur.fetchone()[0]
        with self.assertRaises(psycopg.errors.UniqueViolation):
            with self.conn.transaction():
                self.cur.execute(
                    "CALL create_booking(%s,1,1,'CHECKED_IN',NULL)", (guest,)
                )
        self.cur.execute("SELECT wallet_balance FROM guests WHERE id=%s", (guest,))
        self.assertEqual(self.cur.fetchone()[0], balance)
        self.cur.execute(
            "SELECT count(*) FROM wallet_audit_logs WHERE guest_id=%s", (guest,)
        )
        self.assertEqual(self.cur.fetchone()[0], 1)
        self.cur.execute(
            "UPDATE bookings SET status='COMPLETED' WHERE id=%s", (booking,)
        )
        self.cur.execute("CALL create_booking(%s,1,1,'CHECKED_IN',NULL)", (guest,))
        self.assertIsNotNone(self.cur.fetchone()[0])

    def test_insufficient_wallet_rolls_back(self):
        """A tiny wallet cannot buy a night; its balance and audit count must stay unchanged."""
        self.cur.execute(
            "INSERT INTO guests(name,wallet_balance) VALUES ('Poor fixture',1) RETURNING id"
        )
        guest = self.cur.fetchone()[0]
        with self.assertRaises(psycopg.errors.RaiseException):
            with self.conn.transaction():
                self.cur.execute(
                    "CALL create_booking(%s,1,1,'CONFIRMED',NULL)", (guest,)
                )
        self.cur.execute("SELECT wallet_balance FROM guests WHERE id=%s", (guest,))
        self.assertEqual(self.cur.fetchone()[0], 1)
        self.cur.execute(
            "SELECT count(*) FROM wallet_audit_logs WHERE guest_id=%s", (guest,)
        )
        self.assertEqual(self.cur.fetchone()[0], 0)

    def test_negative_null_wallet_and_bad_nights_are_rejected(self):
        """Exercise database constraints and procedure validation independently of the browser."""
        for query in [
            "INSERT INTO guests(name,wallet_balance) VALUES ('Bad',-1)",
            "INSERT INTO guests(name,wallet_balance) VALUES ('Bad',NULL)",
            "CALL create_booking(1,1,0,'CONFIRMED',NULL)",
        ]:
            with self.assertRaises(psycopg.Error):
                with self.conn.transaction():
                    self.cur.execute(query)

    def test_audit_is_immutable(self):
        """Test UPDATE, DELETE and statement-level TRUNCATE guards inside recoverable savepoints."""
        for query in [
            "UPDATE wallet_audit_logs SET balance_after=0 WHERE id=1",
            "DELETE FROM wallet_audit_logs WHERE id=1",
            "TRUNCATE wallet_audit_logs",
        ]:
            with self.assertRaises(psycopg.errors.InsufficientPrivilege):
                with self.conn.transaction():
                    self.cur.execute(query)

    def test_materialized_nights_are_exact(self):
        """Refresh through the real function and compare stored summary nights with source bookings."""
        self.cur.execute("SELECT refresh_property_summary()")
        self.assertIsNotNone(self.cur.fetchone()[0])
        self.cur.execute("SELECT sum(total_nights_booked) FROM mv_property_summary")
        summary = self.cur.fetchone()[0]
        self.cur.execute("SELECT sum(nights) FROM bookings")
        self.assertEqual(summary, self.cur.fetchone()[0])

    def test_mongo_seed_indexes_and_cross_database_ids(self):
        """Check live document count/index definitions and find orphan references using actual SQL IDs."""
        with MongoClient(os.environ["MONGO_URL"]) as client:
            db = client[os.environ.get("MONGO_DB", "stayspot")]
            self.assertGreaterEqual(db.SearchSessions.count_documents({}), 500000)
            ttl = db.SearchSessions.index_information()["idx_sessions_ttl"]
            self.assertEqual(ttl["expireAfterSeconds"], 7200)
            self.assertIn(
                "idx_sessions_geo_recent", db.SearchSessions.index_information()
            )
            self.assertIn(
                "idx_reviews_property_time", db.PropertyReviews.index_information()
            )
            self.cur.execute("SELECT id FROM properties")
            properties = [r[0] for r in self.cur.fetchall()]
            self.cur.execute("SELECT id FROM guests")
            guests = [r[0] for r in self.cur.fetchall()]
            self.assertEqual(
                db.PropertyAmenities.count_documents(
                    {"property_id": {"$nin": properties}}
                ),
                0,
            )
            self.assertEqual(
                db.PropertyReviews.count_documents(
                    {
                        "$or": [
                            {"property_id": {"$nin": properties}},
                            {"guest_id": {"$nin": guests}},
                        ]
                    }
                ),
                0,
            )

    def test_performance_reports_show_real_index_paths(self):
        """Inspect saved measured plans for named indexes and absence of heavy scan paths.
        This checks the recorded evidence; it does not claim a new benchmark was captured now.
        """
        root = Path(__file__).resolve().parents[1]
        p = json.loads((root / "performance/postgres_execution_stats.json").read_text())
        plan = json.dumps(p["postgres"]["optimized_workflow_2"]["plan"])
        self.assertIn("idx_bookings_property_date", plan)
        self.assertNotIn('"Node Type": "Seq Scan"', plan)
        m = json.loads((root / "performance/mongo_execution_stats.json").read_text())
        for workflow in [
            "workflow_3_geoNear_stats",
            "workflow_3_hotspots_stats",
            "workflow_4_facet_stats",
        ]:
            explain = json.dumps(m[workflow])
            self.assertNotIn("COLLSCAN", explain)
            self.assertIn("IXSCAN", explain)
        self.assertTrue(p["same_scope_results_equal"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
