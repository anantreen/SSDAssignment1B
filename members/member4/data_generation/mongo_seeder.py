"""Generate bounded-batch MongoDB search sessions, reviews and flexible catalogs.

Read actual guest/property IDs from PostgreSQL so documents reference real records.
Collection validators/indexes must already be installed. Existing documents are
not reset: this script refuses nonempty target collections and propagates failures.
Mongo batches are separate writes, not a distributed transaction with PostgreSQL.
"""

import argparse
import os
import random
from datetime import datetime, timedelta, timezone
import psycopg
from pymongo import MongoClient


def insert_batches(collection, documents, size=5000):
    """Consume an iterable of documents and insert at most size buffered records at a time.
    ordered=False avoids serial stop-at-first-error insertion, but duplicate/validation
    errors still propagate. Flush the last short batch so remainder documents are kept.
    """
    batch = []
    for doc in documents:
        batch.append(doc)
        if len(batch) == size:
            collection.insert_many(batch, ordered=False)
            batch = []
    # A final partial batch is normal whenever document count is not a multiple of size.
    if batch:
        collection.insert_many(batch, ordered=False)


def main():
    """Validate requested counts and seed document collections after relational data exists.
    The fixed RNG makes distributions repeatable; current UTC dates keep telemetry live.
    Returns None; prints counts only after every requested collection is seeded.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("--pings", type=int, default=500000)
    parser.add_argument("--reviews", type=int, default=50000)
    args = parser.parse_args()
    if min(vars(args).values()) < 1:
        parser.error("Counts must be positive")
    rng = random.Random(302)
    now = datetime.now(timezone.utc)
    with psycopg.connect(
        os.environ.get(
            "DATABASE_URL", "postgresql://stayspot:stayspot@localhost:5432/stayspot"
        )
    ) as conn:
        # Use authoritative integer IDs instead of inventing cross-database foreign
        # keys.
        guests = [r[0] for r in conn.execute("SELECT id FROM guests ORDER BY id")]
        properties = [
            r[0] for r in conn.execute("SELECT id FROM properties ORDER BY id")
        ]
    if not guests or not properties:
        raise SystemExit("Seed PostgreSQL first")
    # MONGO_URL selects the server and MONGO_DB selects its separate logical database.
    client = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    db = client[os.environ.get("MONGO_DB", "stayspot")]
    # Check each target collection before writing. A failed later batch can still leave
    # earlier
    # Mongo inserts present, so repeat a failed full seed on a fresh database
    # deliberately.
    if any(
        db[name].find_one()
        for name in ["SearchSessions", "PropertyReviews", "PropertyAmenities"]
    ):
        raise SystemExit(
            "Refusing to reseed nonempty collections. Choose a fresh database."
        )
    cities = [
        (78.4867, 17.385),
        (77.209, 28.6139),
        (72.8777, 19.076),
        (77.5946, 12.9716),
        (80.2707, 13.0827),
    ]

    def pings():
        """Yield one recent GeoJSON search session without storing the entire ping dataset.
        MongoDB expects [longitude, latitude]; jitter clusters sessions around the seed cities.
        All timestamps are within the last hour, safely inside the two-hour TTL at creation.
        """
        for i in range(args.pings):
            lon, lat = cities[i % len(cities)]
            yield {
                "session_id": f"seed-{i}",
                "user_device": rng.choice(["Mobile", "Desktop"]),
                "location": {
                    "type": "Point",
                    "coordinates": [
                        lon + rng.uniform(-0.15, 0.15),
                        lat + rng.uniform(-0.15, 0.15),
                    ],
                },
                "created_at": now - timedelta(seconds=rng.randrange(3600)),
            }

    insert_batches(db.SearchSessions, pings())
    # Catalog fields are nested/flexible while property_id remains a stable lookup key.
    rules = ["No smoking", "Quiet hours 10 PM to 8 AM", "Check-out by 11 AM"]
    features = ["Step-free access", "Wide doorways", "Elevator"]
    insert_batches(
        db.PropertyAmenities,
        (
            {
                "property_id": pid,
                "house_rules": rng.sample(rules, 2),
                "accessibility_features": rng.sample(features, 2),
                "amenities": {
                    "essentials": ["Wi-Fi", "Kitchen", "Workspace"],
                    "outdoors": ["Balcony", "Garden"],
                },
            }
            for pid in properties
        ),
    )
    # Use integer stars for the five rating buckets; each review may carry several
    # unique tags.
    tags = [
        "Scenic View",
        "Near Transit",
        "Quiet Neighborhood",
        "Downtown",
        "Great Workspace",
    ]
    insert_batches(
        db.PropertyReviews,
        (
            {
                "property_id": rng.choice(properties),
                "guest_id": rng.choice(guests),
                "rating": rng.choices([1, 2, 3, 4, 5], [2, 4, 10, 34, 50])[0],
                "review_text": "Comfortable stay with helpful hosts.",
                "location_tags": rng.sample(tags, rng.randint(1, 3)),
                "timestamp": now - timedelta(days=rng.randrange(365)),
            }
            for _ in range(args.reviews)
        ),
    )
    print(
        f"Seeded {args.pings} clustered search sessions, {args.reviews} integer-star reviews, {len(properties)} matching catalogs."
    )
    # Release the client after successful bulk work; uncaught errors still fail the
    # process.
    client.close()


if __name__ == "__main__":
    main()
