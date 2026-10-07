-- Wallet auditing and append-only history.
-- These triggers share the caller's transaction: a failed booking rolls back
-- both its wallet debit and the audit row created by the debit.

CREATE OR REPLACE FUNCTION log_wallet_balance_change()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    -- OLD and NEW are the guest rows before/after an UPDATE. Record the delta,
    -- its direction and the resulting wallet snapshot without API intervention.
    INSERT INTO wallet_audit_logs (
        guest_id,
        amount_changed,
        action_type,
        balance_after
    )
    VALUES (
        NEW.id,
        NEW.wallet_balance - OLD.wallet_balance,
        CASE
            WHEN NEW.wallet_balance > OLD.wallet_balance THEN 'CREDIT'
            ELSE 'DEBIT'
        END,
        NEW.wallet_balance
    );
    RETURN NEW;
END;
$$;

-- Avoid emitting an audit entry for an UPDATE that leaves the balance unchanged.
-- IS DISTINCT FROM handles NULL semantics explicitly, although balances are NOT NULL.
CREATE TRIGGER trg_wallet_balance_audit
AFTER UPDATE OF wallet_balance ON guests
FOR EACH ROW
WHEN (OLD.wallet_balance IS DISTINCT FROM NEW.wallet_balance)
EXECUTE FUNCTION log_wallet_balance_change();

CREATE OR REPLACE FUNCTION reject_audit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    -- 42501 is PostgreSQL's insufficient_privilege SQLSTATE. Normal application
    -- writes may append rows but cannot rewrite financial history. A privileged
    -- database owner can still disable triggers; this is not administrator-proof.
    RAISE EXCEPTION 'Wallet audit records are append-only'
        USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER trg_immutable_audit
BEFORE UPDATE OR DELETE ON wallet_audit_logs
FOR EACH ROW
EXECUTE FUNCTION reject_audit_mutation();

-- TRUNCATE is a statement operation, so it needs its own statement-level trigger.
CREATE TRIGGER trg_no_audit_truncate
BEFORE TRUNCATE ON wallet_audit_logs
FOR EACH STATEMENT
EXECUTE FUNCTION reject_audit_mutation();
