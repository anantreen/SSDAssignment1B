-- Workflow 2: bounded daily revenue, seven-day moving averages and dense ranks.
-- Inputs: inclusive UTC dates and a selected property-ID array. The API bounds
-- its requested period/cohort; this SQL function itself does not impose that cap.

CREATE OR REPLACE FUNCTION revenue_analytics(
    p_start DATE,
    p_end DATE,
    p_property_ids INTEGER[]
)
RETURNS TABLE (
    property_id INTEGER,
    booking_date DATE,
    daily_total NUMERIC,
    moving_avg_7d NUMERIC,
    revenue_momentum_rank BIGINT
)
LANGUAGE sql STABLE AS $$
WITH selected AS (
    -- Restrict calendar expansion to the requested real properties.
    SELECT id FROM properties WHERE id = ANY(p_property_ids)
), daily AS (
    -- Aggregate qualifying bookings before joining the property/day calendar.
    -- The raw created_at range can use the property/date index; applying DATE()
    -- to that column in the WHERE predicate would obstruct timestamp pruning.
    SELECT
        b.property_id,
        (b.created_at AT TIME ZONE 'UTC')::date AS day,
        SUM(b.total_cost) AS revenue
    FROM bookings b
    WHERE b.property_id = ANY(p_property_ids)
        AND b.created_at >= (p_start - 6)::timestamp AT TIME ZONE 'UTC'
        AND b.created_at < (p_end + 1)::timestamp AT TIME ZONE 'UTC'
    GROUP BY b.property_id, (b.created_at AT TIME ZONE 'UTC')::date
), calendar AS (
    -- Include six dates before the requested start. The first visible date then
    -- has a complete seven-row frame, even when earlier revenue is zero.
    SELECT s.id, d::date AS day
    FROM selected s
    CROSS JOIN generate_series(
        (p_start - 6)::timestamp,
        p_end::timestamp,
        interval '1 day'
    ) d
), moving AS (
    -- Zero-fill missing days so ROWS refers to consecutive calendar days rather
    -- than consecutive booking events. Each property's frame advances by one day.
    SELECT
        c.id,
        c.day,
        COALESCE(d.revenue, 0) AS daily_total,
        AVG(COALESCE(d.revenue, 0)) OVER (
            PARTITION BY c.id
            ORDER BY c.day
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) AS moving_avg
    FROM calendar c
    LEFT JOIN daily d ON d.property_id = c.id AND d.day = c.day
)
SELECT
    id,
    day,
    daily_total,
    ROUND(moving_avg, 2),
    -- Compare selected properties on the same day. Use the unrounded average
    -- for ties; only the display value is rounded. Hide warm-up dates last.
    DENSE_RANK() OVER (PARTITION BY day ORDER BY moving_avg DESC)
FROM moving
WHERE day BETWEEN p_start AND p_end
ORDER BY day, id;
$$;

-- Independent-script example; the API calls the same installed function.
SELECT * FROM revenue_analytics(
    (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 29,
    (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
    ARRAY[1, 2, 3, 4, 5]
);
