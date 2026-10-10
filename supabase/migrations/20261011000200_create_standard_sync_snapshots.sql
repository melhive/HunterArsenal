-- Standard cloud sync snapshots contain PLAINTEXT HunterArsenal state.
-- Privileged database operators can read this table. This is not end-to-end encryption.
-- Separate from hunterarsenal_vault; never store standard snapshots in the encrypted vault.
BEGIN;

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

CREATE TABLE public.hunterarsenal_standard_snapshots (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  revision bigint NOT NULL CHECK (revision BETWEEN 1 AND 9007199254740991),
  snapshot jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT hunterarsenal_standard_snapshot_shape CHECK ((
    jsonb_typeof(snapshot) = 'object'
    AND snapshot ->> 'app' = 'HunterArsenal'
    AND snapshot ->> 'format' = 'standard-cloud-snapshot'
    AND snapshot ->> 'formatVersion' = '1'
    AND snapshot ->> 'schemaVersion' = '4'
    AND jsonb_typeof(snapshot -> 'state') = 'object'
    AND snapshot -> 'state' ->> 'v' = '4'
  ) IS TRUE)
);

ALTER TABLE public.hunterarsenal_standard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hunterarsenal_standard_snapshots FORCE ROW LEVEL SECURITY;

CREATE POLICY hunterarsenal_standard_snapshot_select_own
  ON public.hunterarsenal_standard_snapshots FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE FUNCTION public.hunterarsenal_standard_snapshot_revision_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION USING ERRCODE = '22000', MESSAGE = 'snapshot owner is immutable';
  END IF;
  IF OLD.revision = 9007199254740991 OR NEW.revision <> OLD.revision + 1 THEN
    RAISE EXCEPTION USING ERRCODE = '22000', MESSAGE = 'snapshot revision must advance by exactly one';
  END IF;
  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER hunterarsenal_standard_snapshot_revision_guard
  BEFORE UPDATE ON public.hunterarsenal_standard_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.hunterarsenal_standard_snapshot_revision_guard();

-- expected_revision = 0 creates only when no row exists. Updates compare the
-- observed revision atomically. A stale write returns false and is never retried.
-- Ownership comes only from auth.uid(); the caller cannot supply a user id.
-- The SECURITY DEFINER postgres owner bypasses FORCE RLS; ownership is therefore
-- explicitly bound to auth.uid() in every INSERT/UPDATE statement.
CREATE FUNCTION public.write_hunterarsenal_standard_snapshot(
  p_expected_revision bigint,
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
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'authenticated snapshot owner is required';
  END IF;
  IF p_expected_revision IS NULL OR p_expected_revision < 0 OR p_expected_revision >= 9007199254740991 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'expected snapshot revision is invalid';
  END IF;

  IF p_expected_revision = 0 THEN
    INSERT INTO public.hunterarsenal_standard_snapshots (user_id, revision, snapshot)
    VALUES (caller_id, 1, p_snapshot)
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    UPDATE public.hunterarsenal_standard_snapshots
    SET revision = p_expected_revision + 1,
        snapshot = p_snapshot
    WHERE user_id = caller_id
      AND revision = p_expected_revision;
  END IF;

  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  RETURN changed_rows = 1;
END;
$function$;

ALTER FUNCTION public.write_hunterarsenal_standard_snapshot(bigint, jsonb) OWNER TO postgres;

-- service_role remains a Supabase BYPASSRLS role; these revokes do not remove
-- that property. Browser clients get read-only table access and write only by RPC.
REVOKE ALL ON TABLE public.hunterarsenal_standard_snapshots FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.hunterarsenal_standard_snapshots TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
REVOKE ALL ON FUNCTION public.hunterarsenal_standard_snapshot_revision_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.write_hunterarsenal_standard_snapshot(bigint, jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.write_hunterarsenal_standard_snapshot(bigint, jsonb) TO authenticated;

COMMENT ON TABLE public.hunterarsenal_standard_snapshots IS
  'Standard sync only: stores plaintext HunterArsenal snapshots readable by privileged database operators; not end-to-end encrypted.';

COMMIT;
