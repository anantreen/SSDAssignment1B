"""Append fresh temporary search telemetry for a later demo without resetting financial data.

Old sessions expire by TTL while this script adds new city-clustered records.
A per-run UUID prefix avoids repeating session IDs across invocations; the RNG
preserves the spatial distribution. Insert at most 5,000 buffered documents at once.
"""

import argparse
import os
import random
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from pymongo import MongoClient

# Validate bounded CLI counts before connecting; defaults recreate the assignment ping
# scale.
parser = argparse.ArgumentParser()
parser.add_argument("--count", type=int, default=500000)
args = parser.parse_args()
if not 1 <= args.count <= 1000000:
    parser.error("Count must be between 1 and 1,000,000")
rng = random.Random(302)
now = datetime.now(timezone.utc)
batch = []
# UUID distinguishes this run; timestamps deliberately use the current UTC clock.
prefix = str(uuid4())
cities = [
    (78.4867, 17.385),
    (77.209, 28.6139),
    (72.8777, 19.076),
    (77.5946, 12.9716),
    (80.2707, 13.0827),
]
with MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017")) as client:
    collection = client[os.environ.get("MONGO_DB", "stayspot")].SearchSessions
    # Coordinates are longitude then latitude, matching the 2dsphere index and GeoJSON
    # spec.
    for i in range(args.count):
        lon, lat = cities[i % len(cities)]
        batch.append(
            {
                "session_id": f"{prefix}-{i}",
                "user_device": "Demo",
                "location": {
                    "type": "Point",
                    "coordinates": [
                        lon + rng.uniform(-0.15, 0.15),
                        lat + rng.uniform(-0.15, 0.15),
                    ],
                },
                "created_at": now - timedelta(seconds=rng.randrange(3600)),
            }
        )
        # Bulk insertion bounds Python memory and reduces one-request-per-document
        # overhead.
        if len(batch) == 5000:
            collection.insert_many(batch, ordered=False)
            batch = []
    # Do not drop the remainder when the requested count is not divisible by batch size.
    if batch:
        collection.insert_many(batch, ordered=False)
print(
    f"Appended {args.count} fresh sessions. TTL will expire old sessions asynchronously."
)
