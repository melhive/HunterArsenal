-- Single-row, end-to-end encrypted HunterArsenal vault per Supabase Auth user.
-- The JSON payloads are the exact objects emitted by js/cloud-crypto.js.
-- This migration is local source only; do not apply without an approved review.
BEGIN;

-- Supabase's postgres role is the intended migration and SECURITY DEFINER
-- owner. Fail before creating objects if this is run under a different role.
DO $migration_role$
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Apply this migration as the Supabase postgres role';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname = 'postgres'
      AND (rolsuper OR rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'Supabase postgres must be privileged to own the SECURITY DEFINER writer under FORCE RLS';
  END IF;
END;
$migration_role$;

CREATE TABLE public.hunterarsenal_vault (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  revision bigint NOT NULL CHECK (revision BETWEEN 1 AND 9007199254740991),
  key_envelope jsonb NOT NULL,
  snapshot jsonb NOT NULL,

  CONSTRAINT hunterarsenal_vault_envelope_shape CHECK ((
    jsonb_typeof(key_envelope) = 'object'
    AND key_envelope ->> 'app' = 'HunterArsenal'
    AND key_envelope ->> 'format' = 'vault-key-envelope'
    AND key_envelope ->> 'envelopeVersion' = '1'
    AND key_envelope ->> 'accountId' = user_id::text
    AND key_envelope ->> 'keyVersion' ~ '^[1-9][0-9]*$'
    AND (key_envelope ->> 'keyVersion')::numeric <= 9007199254740991
    AND jsonb_typeof(key_envelope -> 'kdf') = 'object'
    AND key_envelope -> 'kdf' ->> 'name' = 'PBKDF2'
    AND key_envelope -> 'kdf' ->> 'hash' = 'SHA-256'
    AND key_envelope -> 'kdf' ->> 'iterations' ~ '^[0-9]+$'
    AND (key_envelope -> 'kdf' ->> 'iterations')::bigint BETWEEN 600000 AND 5000000
    AND key_envelope -> 'kdf' ->> 'salt' ~ '^[A-Za-z0-9_-]{22}$'
    AND jsonb_typeof(key_envelope -> 'wrap') = 'object'
    AND key_envelope -> 'wrap' ->> 'name' = 'AES-256-GCM'
    AND key_envelope -> 'wrap' ->> 'nonce' ~ '^[A-Za-z0-9_-]{16}$'
    AND key_envelope -> 'wrap' ->> 'ciphertext' ~ '^[A-Za-z0-9_-]{64}$'
  ) IS TRUE),
  CONSTRAINT hunterarsenal_vault_snapshot_shape CHECK ((
    jsonb_typeof(snapshot) = 'object'
    AND snapshot ->> 'app' = 'HunterArsenal'
    AND snapshot ->> 'format' = 'encrypted-vault-snapshot'
    AND snapshot ->> 'accountId' = user_id::text
    AND snapshot ->> 'revision' = revision::text
    AND snapshot ->> 'formatVersion' = '1'
    AND snapshot ->> 'schemaVersion' = '4'
    AND snapshot ->> 'keyVersion' = key_envelope ->> 'keyVersion'
    AND jsonb_typeof(snapshot -> 'cipher') = 'object'
    AND snapshot -> 'cipher' ->> 'name' = 'AES-256-GCM'
    AND snapshot -> 'cipher' ->> 'nonce' ~ '^[A-Za-z0-9_-]{16}$'
    AND snapshot ->> 'ciphertext' ~ '^[A-Za-z0-9_-]{22,}$'
  ) IS TRUE)
);

ALTER TABLE public.hunterarsenal_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hunterarsenal_vault FORCE ROW LEVEL SECURITY;

CREATE POLICY hunterarsenal_vault_select_own
  ON public.hunterarsenal_vault FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY hunterarsenal_vault_delete_own
  ON public.hunterarsenal_vault FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- New rows begin at revision 1. Updates must advance exactly one revision.
CREATE FUNCTION public.hunterarsenal_vault_revision_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION USING ERRCODE = '22000', MESSAGE = 'vault owner is immutable';
  END IF;

  IF OLD.revision = 9223372036854775807 OR NEW.revision <> OLD.revision + 1 THEN
    RAISE EXCEPTION USING ERRCODE = '22000', MESSAGE = 'vault revision must advance by exactly one';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER hunterarsenal_vault_revision_guard
  BEFORE UPDATE ON public.hunterarsenal_vault
  FOR EACH ROW EXECUTE FUNCTION public.hunterarsenal_vault_revision_guard();

-- All client writes go through this authenticated compare-and-swap operation.
-- expected_revision = 0 creates the first row; otherwise the UPDATE predicate
-- compares the observed revision atomically. A stale write returns false.
-- SECURITY DEFINER runs as postgres, which bypasses FORCE RLS. The function
-- therefore derives the only permitted owner from auth.uid() and never accepts
-- a caller-supplied user id. Its fixed search_path prevents name substitution.
CREATE FUNCTION public.write_hunterarsenal_vault(
  p_expected_revision bigint,
  p_key_envelope jsonb,
  p_snapshot jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  caller_id uuid;
  changed_rows integer;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'authenticated vault owner is required';
  END IF;

  IF p_expected_revision IS NULL
     OR p_expected_revision < 0
     OR p_expected_revision >= 9007199254740991 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'expected vault revision is invalid';
  END IF;

  IF p_expected_revision = 0 THEN
    INSERT INTO public.hunterarsenal_vault (user_id, revision, key_envelope, snapshot)
    VALUES (caller_id, 1, p_key_envelope, p_snapshot)
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    UPDATE public.hunterarsenal_vault
    SET revision = p_expected_revision + 1,
        key_envelope = p_key_envelope,
        snapshot = p_snapshot
    WHERE user_id = caller_id
      AND revision = p_expected_revision;
  END IF;

  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  RETURN changed_rows = 1;
END;
$function$;

ALTER FUNCTION public.write_hunterarsenal_vault(bigint, jsonb, jsonb) OWNER TO postgres;

-- service_role remains a Supabase BYPASSRLS role; revoking these table grants
-- does not disable that property. Keep its secret key server-side. Inserts and
-- updates for browser clients are available only via the owner-bound RPC.
REVOKE ALL ON TABLE public.hunterarsenal_vault FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, DELETE ON TABLE public.hunterarsenal_vault TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
REVOKE ALL ON FUNCTION public.hunterarsenal_vault_revision_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.write_hunterarsenal_vault(bigint, jsonb, jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.write_hunterarsenal_vault(bigint, jsonb, jsonb) TO authenticated;

COMMIT;
