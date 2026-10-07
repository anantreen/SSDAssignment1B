-- StaySpot relational model (Assignment 1, Project 3).
-- Run once against an empty database before indexes, triggers and workflows.
-- PostgreSQL owns financial data; MongoDB documents reuse these integer IDs.

-- A guest is the actor whose wallet funds a booking. NUMERIC stores exact money;
-- NOT NULL prevents missing balances from bypassing the nonnegative CHECK.
CREATE TABLE guests (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(120) NOT NULL CHECK (length(trim(name)) > 0),
    wallet_balance NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (wallet_balance >= 0)
);

-- A property's base_price is the price of one night. Coordinate checks prevent
-- invalid geographic data; the booking procedure reads this price server-side.
CREATE TABLE properties (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price > 0),
    latitude NUMERIC(9, 6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude NUMERIC(9, 6) NOT NULL CHECK (longitude BETWEEN -180 AND 180)
);

-- Foreign keys keep a booking attached to real guest/property records. Nights
-- are stored explicitly because counting bookings cannot measure nights stayed.
-- The partial unique index in 02_indexes.sql governs active CHECKED_IN stays.
CREATE TABLE bookings (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    guest_id INTEGER NOT NULL REFERENCES guests(id),
    property_id INTEGER NOT NULL REFERENCES properties(id),
    total_cost NUMERIC(10, 2) NOT NULL CHECK (total_cost > 0),
    nights INTEGER NOT NULL DEFAULT 1 CHECK (nights BETWEEN 1 AND 365),
    status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED'
        CHECK (status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Each wallet UPDATE creates one signed change through the audit trigger.
-- balance_after is a historical snapshot, so a page can display running balances
-- without summing every older entry. Debit amounts are negative; credits positive.
-- The immutability triggers in 03_triggers_and_audit.sql reject edits/deletion.
CREATE TABLE wallet_audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    guest_id INTEGER NOT NULL REFERENCES guests(id),
    amount_changed NUMERIC(10, 2) NOT NULL CHECK (amount_changed <> 0),
    action_type VARCHAR(6) NOT NULL CHECK (action_type IN ('DEBIT', 'CREDIT')),
    balance_after NUMERIC(10, 2) NOT NULL CHECK (balance_after >= 0),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CHECK (
        (action_type = 'CREDIT' AND amount_changed > 0)
        OR (action_type = 'DEBIT' AND amount_changed < 0)
    )
);

-- A materialized view has no built-in "last refreshed" column. This small table
-- records the actual completion time used by the Analytics screen.
CREATE TABLE analytics_refresh_state (
    name TEXT PRIMARY KEY,
    refreshed_at TIMESTAMPTZ NOT NULL
);
