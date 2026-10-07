-- Query indexes and the active-stay business rule.
-- Indexes speed reads but also add work to writes; each serves a known workflow.

-- Only checked-in bookings participate in uniqueness. Multiple CONFIRMED or
-- COMPLETED bookings remain legal, while a guest can occupy one active stay.
CREATE UNIQUE INDEX idx_active_stay
    ON bookings (guest_id)
    WHERE status = 'CHECKED_IN';

-- Equality on property_id followed by a created_at range supports bounded
-- analytics. INCLUDE exposes values needed for index-only reads when visibility
-- permits; the planner still chooses its own access method.
CREATE INDEX idx_bookings_property_date
    ON bookings (property_id, created_at)
    INCLUDE (total_cost, nights);

-- Actor-specific browsing and status-filtered browsing avoid scanning all stays.
CREATE INDEX idx_bookings_guest_id ON bookings (guest_id, id DESC);
CREATE INDEX idx_bookings_status_id ON bookings (status, id);

-- Audit pages seek within one guest's chronological ledger. id breaks ties when
-- timestamps coincide; included monetary fields can reduce table-page fetches.
CREATE INDEX idx_audit_guest_time
    ON wallet_audit_logs (guest_id, timestamp, id)
    INCLUDE (amount_changed, action_type, balance_after);

-- Trigram GIN indexes support ILIKE substring search on human-readable names.
-- Very short/common search strings can still have low selectivity.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_guests_name ON guests USING gin (name gin_trgm_ops);
CREATE INDEX idx_properties_title ON properties USING gin (title gin_trgm_ops);
