-- Property lifetime totals and a nonblocking reader-facing refresh workflow.
-- Gross booked revenue includes all three booking statuses in this assignment.

CREATE MATERIALIZED VIEW mv_property_summary AS
SELECT
    p.id AS property_id,
    p.title,
    COUNT(b.id) AS total_bookings,
    COALESCE(SUM(b.nights), 0)::BIGINT AS total_nights_booked,
    COALESCE(SUM(b.total_cost), 0)::NUMERIC AS total_revenue
FROM properties p
LEFT JOIN bookings b ON b.property_id = p.id
GROUP BY p.id, p.title;

-- LEFT JOIN retains properties without bookings. The unique, unfiltered index
-- is required for REFRESH ... CONCURRENTLY to match old/new materialized rows.
CREATE UNIQUE INDEX idx_mv_property_summary_id
    ON mv_property_summary (property_id);
CREATE INDEX idx_mv_property_revenue
    ON mv_property_summary (total_revenue DESC, property_id);

INSERT INTO analytics_refresh_state
VALUES ('property_summary', clock_timestamp());

CREATE OR REPLACE FUNCTION refresh_property_summary()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql AS $$
DECLARE
    v_refreshed TIMESTAMPTZ;
BEGIN
    -- Use a fixed advisory-lock namespace to serialize this application's refresh
    -- requests. The transaction releases the lock automatically when it finishes.
    PERFORM pg_advisory_xact_lock(302, 3);
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_property_summary;

    -- Save the completion clock, not an optimistic time before work started.
    -- Both the refreshed view and this timestamp commit together.
    v_refreshed := clock_timestamp();
    UPDATE analytics_refresh_state
    SET refreshed_at = v_refreshed
    WHERE name = 'property_summary';
    RETURN v_refreshed;
END;
$$;
