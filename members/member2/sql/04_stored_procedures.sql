-- Workflow 1: atomic, server-priced booking.
-- The caller owns BEGIN / COMMIT / ROLLBACK. If CALL raises an exception, the
-- caller must roll back; all writes made by this procedure and its trigger undo.
-- Example: BEGIN; CALL create_booking(1, 1, 2, 'CONFIRMED', NULL); COMMIT;
-- Do not put COMMIT inside an EXCEPTION block: PostgreSQL forbids terminating
-- that subtransaction. Propagated SQLSTATEs also let the API show useful errors.

CREATE OR REPLACE PROCEDURE create_booking(
    p_guest_id INTEGER,
    p_property_id INTEGER,
    p_nights INTEGER,
    p_status VARCHAR DEFAULT 'CONFIRMED',
    INOUT p_booking_id INTEGER DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_price NUMERIC(10, 2);
    v_total NUMERIC(10, 2);
BEGIN
    -- Validate procedure arguments independently of browser form validation.
    -- 22023 means invalid_parameter_value; completed stays cannot be created here.
    IF p_nights IS NULL OR p_nights NOT BETWEEN 1 AND 365
        OR p_status IS NULL OR p_status NOT IN ('CONFIRMED', 'CHECKED_IN') THEN
        RAISE EXCEPTION 'Choose 1 to 365 nights and a valid starting status'
            USING ERRCODE = '22023';
    END IF;

    -- FOR SHARE stabilizes this property's price against concurrent updates for
    -- the transaction. The client supplies nights, never the authoritative cost.
    SELECT base_price INTO v_price
    FROM properties
    WHERE id = p_property_id
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Property not found' USING ERRCODE = 'P0002';
    END IF;
    v_total := v_price * p_nights;

    -- An UPDATE acquires a guest row lock. Its balance predicate is rechecked
    -- under READ COMMITTED after waiting for competing updates, preventing two
    -- requests from spending the same money. The audit trigger fires on success.
    UPDATE guests
    SET wallet_balance = wallet_balance - v_total
    WHERE id = p_guest_id AND wallet_balance >= v_total;

    IF NOT FOUND THEN
        -- Distinguish a missing actor from an existing wallet that cannot pay.
        IF NOT EXISTS (SELECT 1 FROM guests WHERE id = p_guest_id) THEN
            RAISE EXCEPTION 'Guest not found' USING ERRCODE = 'P0002';
        END IF;
        RAISE EXCEPTION 'Insufficient wallet balance' USING ERRCODE = 'P0001';
    END IF;

    -- CHECK, FK or active-stay uniqueness errors propagate. Therefore a failed
    -- insert cannot leave behind the preceding debit or its audit entry.
    INSERT INTO bookings (guest_id, property_id, total_cost, nights, status)
    VALUES (p_guest_id, p_property_id, v_total, p_nights, p_status)
    RETURNING id INTO p_booking_id;
END;
$$;
