#!/usr/bin/env bash
# Bootstrap a fresh StaySpot database, not an existing populated installation.
# Run from any shell directory: this script first moves to its repository root.
# SQL and MongoDB servers must already be reachable; this script does not start them.
set -euo pipefail

# -e stops failed commands, -u catches missing variables, and pipefail exposes
# failed pipeline stages. DDL files are separate psql runs, not one giant transaction.
cd "$(dirname "$0")/.."

# Export configured connection values for psql, mongosh and both Python seeders.
# .env is local configuration; the submitted .env.example documents its keys.
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Retain the same portable defaults when a connection value is not supplied.
: "${DATABASE_URL:=postgresql://stayspot:stayspot@localhost:5432/stayspot}"
: "${MONGO_URL:=mongodb://localhost:27017}"
: "${MONGO_DB:=stayspot}"
export DATABASE_URL MONGO_URL MONGO_DB

# Numbered order installs tables before their indexes/triggers/procedures/views.
# ON_ERROR_STOP prevents continuing from a SQL failure into misleading seed output.
for file in sql/0*.sql; do
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file" >/dev/null
done

# Install document validation and indexes BEFORE inserting the generated records.
mongosh "$MONGO_URL/$MONGO_DB" --quiet -f mongo/01_collections_and_indexes.js

# Relational IDs must exist before MongoDB documents can refer to them. PYTHON can
# select a virtual-environment interpreter when the shell has not activated one.
"${PYTHON:-python3}" data_generation/postgres_seeder.py
"${PYTHON:-python3}" data_generation/mongo_seeder.py
