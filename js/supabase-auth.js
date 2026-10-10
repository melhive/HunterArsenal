/* Optional Auth-only adapter. No app state, recovery secret, or vault data is read here. */
(function (g) {
  'use strict';
  const HA = (g.HA = g.HA || {});
  const SDK_URL = 'https://esm.sh/@supabase/supabase-js@2.117.3?bundle';
  const STORAGE_KEY = 'hunterarsenal.supabase.auth.v1';
  let client = null, loadPromise = null;
  const state = { status: 'signed-out', email: '', message: '' };
  const listeners = new Set();

  function publish(next) {
    Object.assign(state, next);
    for (const listener of listeners) { try { listener({ ...state }); } catch (_) {} }
  }
  function configuration() {
    const config = HA.SupabaseConfig;
    if (!config || typeof config.url !== 'string' || typeof config.publishableKey !== 'string' || !config.url.trim() || !config.publishableKey.trim()) throw new Error('Supabase browser configuration is missing.');
    const url = new URL(config.url.trim());
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') || url.username || url.password || url.search || url.hash) throw new Error('Supabase project URL is invalid.');
    if (/service_role|secret/i.test(config.publishableKey)) throw new Error('A public publishable or legacy anon key is required.');
    return { url: url.origin, key: config.publishableKey.trim() };
  }
  async function getClient() {
    if (client) return client;
    if (!loadPromise) loadPromise = (async () => {
      const config = configuration();
      const sdk = await import(SDK_URL);
      if (typeof sdk.createClient !== 'function') throw new Error('Supabase client module is unavailable.');
      client = sdk.createClient(config.url, config.key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: STORAGE_KEY }
      });
      client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') publish({ status: 'signed-out', email: '', message: '' });
        else if (session && session.user) publish({ status: 'signed-in', email: session.user.email || '', message: '' });
      });
      return client;
    })().catch(error => { loadPromise = null; throw error; });
    return loadPromise;
  }
  async function checkSession() {
    publish({ status: 'connecting', email: '', message: '' });
    try {
      const supabase = await getClient();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const user = data.session && data.session.user;
      publish(user ? { status: 'signed-in', email: user.email || '', message: '' } : { status: 'signed-out', email: '', message: '' });
    } catch (_) {
      publish({ status: 'unavailable', email: '', message: 'Could not reach Supabase Auth. Check configuration or connection; local use is unaffected.' });
    }
    return { ...state };
  }
  async function signIn(email, password) {
    publish({ status: 'connecting', email: '', message: '' });
    try {
      const supabase = await getClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email: String(email || '').trim(), password: String(password || '') });
      if (error) throw error;
      publish({ status: 'signed-in', email: data.user && data.user.email || '', message: '' });
    } catch (_) {
      publish({ status: 'signed-out', email: '', message: 'Sign-in failed. Check the account details, account status, and connection.' });
    }
    return { ...state };
  }
  async function signOut() {
    publish({ status: 'connecting', email: '', message: '' });
    let supabase = null;
    try {
      supabase = await getClient();
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!sessionError && !data.session) publish({ status: 'signed-out', email: '', message: '' });
      else if (error || sessionError) throw error || sessionError;
      else throw new Error('Local Supabase session remains active.');
    } catch (_) {
      try {
        if (supabase) {
          const { data, error } = await supabase.auth.getSession();
          if (!error && !data.session) {
            publish({ status: 'signed-out', email: '', message: '' });
            return { ...state };
          }
        }
      } catch (_) {}
      publish({ status: 'unavailable', email: '', message: 'Could not verify sign-out with Supabase. Local use is unaffected.' });
    }
    return { ...state };
  }
  async function authenticatedClient() {
    const supabase = await getClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session || !data.session.user) throw new Error('Sign in is required for cloud snapshots.');
    return supabase;
  }
  async function readStandardSnapshot() {
    const supabase = await authenticatedClient();
    const { data, error } = await supabase.from('hunterarsenal_standard_snapshots')
      .select('revision,snapshot,updated_at').maybeSingle();
    if (error) throw error;
    return data || null;
  }
  async function writeStandardSnapshot(expectedRevision, snapshot, confirmation) {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || !snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('Standard snapshot write arguments are invalid.');
    const expectedConfirmation = expectedRevision === 0 ? 'UPLOAD INITIAL CLOUD SNAPSHOT' : `REPLACE CLOUD REVISION ${expectedRevision} AFTER EXPORTING A COPY`;
    if (confirmation !== expectedConfirmation) throw new Error(`Explicit standard cloud write confirmation is required: ${expectedConfirmation}`);
    const supabase = await authenticatedClient();
    const { data, error } = await supabase.rpc('write_hunterarsenal_standard_snapshot', {
      p_expected_revision: expectedRevision,
      p_snapshot: snapshot
    });
    if (error) throw error;
    return data === true;
  }
  HA.CloudAuth = Object.freeze({
    state: () => ({ ...state }),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    checkSession, signIn, signOut, readStandardSnapshot, writeStandardSnapshot
  });
})(globalThis);
