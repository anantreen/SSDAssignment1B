"""Generate a repeatable PostgreSQL dataset for StaySpot stress tests.

Run after all SQL schema/index/trigger/procedure/view scripts on an empty database.
COPY streams actors, properties and historical bookings; actual wallet UPDATEs
produce a consistent 100,000-entry ledger through the installed audit trigger.
The seed phase commits together. VACUUM/ANALYZE runs separately in autocommit mode.
DATABASE_URL selects the database; CLI counts allow smaller development datasets.
"""

import argparse
import os
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import psycopg
from faker import Faker


def main():
    """Parse counts, seed one empty relational database, then prepare planner statistics.
    Returns None and prints inserted counts after success.
    Raises SystemExit for invalid counts/nonempty data; connection/CHECK/FK errors
    propagate so callers never mistake a partially failed run for successful seeding.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("--guests", type=int, default=1000)
    parser.add_argument("--properties", type=int, default=2000)
    parser.add_argument("--bookings", type=int, default=50000)
    parser.add_argument("--audits", type=int, default=100000)
    args = parser.parse_args()
    if min(vars(args).values()) < 1:
        parser.error("Counts must be positive")
    # A fixed random seed makes names/prices/distributions reproducible; timestamps
    # remain current.
    rng = random.Random(302)
    fake = Faker("en_IN")
    fake.seed_instance(302)
    now = datetime.now(timezone.utc)
    cities = [
        (17.385, 78.4867, "Hyderabad"),
        (28.6139, 77.209, "Delhi"),
        (19.076, 72.8777, "Mumbai"),
        (12.9716, 77.5946, "Bengaluru"),
        (13.0827, 80.2707, "Chennai"),
    ]
    # The context commits on normal exit and rolls back on exceptions.
    # cur is a database cursor; COPY streams rows rather than building a huge Python
    # list.
    with psycopg.connect(
        os.environ.get(
            "DATABASE_URL", "postgresql://stayspot:stayspot@localhost:5432/stayspot"
        )
    ) as conn:
        with conn.cursor() as cur:
            # Refuse existing guest data instead of silently duplicating actors or
            # rewriting wallets.
            cur.execute("SELECT EXISTS(SELECT 1 FROM guests)")
            if cur.fetchone()[0]:
                raise SystemExit(
                    "Refusing to reseed a nonempty database. Create a fresh database to seed again."
                )
            # Every actor starts from a known opening wallet; initial INSERTs do not
            # emit UPDATE audits.
            with cur.copy("COPY guests (name, wallet_balance) FROM STDIN") as copy:
                for i in range(args.guests):
                    copy.write_row(
                        ("Ananya Rao" if i == 0 else fake.name(), Decimal("50000.00"))
                    )
            with cur.copy(
                # Cluster real property coordinates near five cities so the catalog is
                # geographically meaningful.
                "COPY properties (title, base_price, latitude, longitude) FROM STDIN"
            ) as copy:
                for i in range(args.properties):
                    lat, lon, city = cities[i % len(cities)]
                    copy.write_row(
                        (
                            f'{city} {rng.choice(["Garden Studio","Courtyard House","Skyline Loft","Terrace Retreat"])} {i+1}',
                            Decimal(rng.randint(1200, 5500)),
                            round(lat + rng.uniform(-0.04, 0.04), 6),
                            round(lon + rng.uniform(-0.04, 0.04), 6),
                        )
                    )
            # Read the database-generated IDs, including real prices, before assigning
            # foreign keys.
            cur.execute("SELECT id FROM guests ORDER BY id")
            guests = [r[0] for r in cur.fetchall()]
            cur.execute("SELECT id, base_price FROM properties ORDER BY id")
            properties = cur.fetchall()
            with cur.copy(
                # Historical bookings represent previously settled stays before the demo
                # wallet snapshot.
                # These history rows do not pretend to be newly charged transactions.
                "COPY bookings (guest_id,property_id,total_cost,nights,status,created_at) FROM STDIN"
            ) as copy:
                for i in range(args.bookings):
                    pid, price = rng.choice(properties)
                    nights = rng.randint(1, 7)
                    copy.write_row(
                        (
                            rng.choice(guests),
                            pid,
                            price * nights,
                            nights,
                            "CONFIRMED" if i % 10 == 0 else "COMPLETED",
                            now
                            - timedelta(
                                days=rng.randrange(365), seconds=rng.randrange(86400)
                            ),
                        )
                    )
            # Each UPDATE changes every selected wallet once, so the trigger makes a
            # consistent ledger.
            # Alternate small credits/debits through UPDATE. Each selected actor emits
            # one trigger row.
            # Batch the number of actors so arbitrary audit counts, including
            # remainders, are exact.
            remaining = args.audits
            step = 0
            while remaining:
                take = min(remaining, len(guests))
                amount = Decimal("10.00") if step % 2 == 0 else Decimal("-10.00")
                cur.execute(
                    "UPDATE guests SET wallet_balance=wallet_balance+%s WHERE id=ANY(%s)",
                    (amount, guests[:take]),
                )
                remaining -= take
                step += 1
            # Populate the lifetime materialized totals using the same function exposed
            # by the API.
            cur.execute("SELECT refresh_property_summary()")
    # VACUUM cannot run inside the preceding transaction; use a fresh autocommit
    # connection.
    # Statistics and visibility information help the planner evaluate the seeded
    # indexes.
    conn = psycopg.connect(
        os.environ.get(
            "DATABASE_URL", "postgresql://stayspot:stayspot@localhost:5432/stayspot"
        ),
        autocommit=True,
    )
    with conn:
        conn.execute("VACUUM (ANALYZE) bookings")
        conn.execute("VACUUM (ANALYZE) wallet_audit_logs")
        conn.execute("ANALYZE properties")
        conn.execute("ANALYZE guests")
        conn.execute("ANALYZE mv_property_summary")
    print(
        f"Seeded {args.guests} guests, {args.properties} properties, {args.bookings} bookings and {args.audits} trigger-generated audits."
    )


if __name__ == "__main__":
    main()
