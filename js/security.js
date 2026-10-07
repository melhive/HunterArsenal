/* HunterArsenal security: App Lock (passcode + optional biometrics) and encrypted backups.
 *
 * Honest scope:
 *  - App Lock is a SCREEN lock. It keeps people out of the app UI. The progress data itself stays in this
 *    browser's storage, which a determined person with access to the unlocked browser profile could still read.
 *  - Biometrics use the device's own passkey sensor (WebAuthn, platform authenticator, user verification
 *    required). The app never sees your fingerprint or face. The passcode is always available as a fallback.
 *  - Encrypted backups use AES-256-GCM with a key derived from your passphrase (PBKDF2-SHA-256, 600,000
 *    rounds). There is no recovery: lose the passphrase and that backup cannot be opened.
 */
(function (g) {
  'use strict';
  const HA = (g.HA = g.HA || {});
  const KEY = 'hunterarsenal.lock.v1';
  const PBKDF2_ITER = 600000, PIN_ITER = 200000;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const subtle = g.crypto && g.crypto.subtle;
  const AUTO_CHOICES = [[0, 'Immediately'], [30, 'After 30 seconds'], [60, 'After 1 minute'], [300, 'After 5 minutes']];

  /* ---------------------------------------------------------------- byte helpers */
  const rnd = n => g.crypto.getRandomValues(new Uint8Array(n));
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const ub64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r) => (r || document).querySelector(s);

  async function pbkdf2Bits(secret, salt, iter) {
    const k = await subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, k, 256));
  }

  /* ---------------------------------------------------------------- encrypted backups */
  const AAD = enc.encode('HunterArsenal|backup|v1');
  async function encryptBackup(plainText, passphrase) {
    const salt = rnd(16), iv = rnd(12);
    const bits = await pbkdf2Bits(passphrase, salt, PBKDF2_ITER);
    const key = await subtle.importKey('raw', bits, 'AES-GCM', false, ['encrypt']);
    const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, key, enc.encode(plainText)));
    return JSON.stringify({
      app: 'HunterArsenal', format: 'encrypted-backup', v: 1, createdAt: new Date().toISOString(), appVersion: g.APP_VERSION || '',
      kdf: { name: 'PBKDF2', hash: 'SHA-256', iter: PBKDF2_ITER, salt: b64(salt) },
      cipher: { name: 'AES-256-GCM', iv: b64(iv) }, data: b64(ct)
    }, null, 2);
  }
  function parseEnvelope(text) {
    let j; try { j = JSON.parse(text); } catch (e) { return null; }
    return j && j.app === 'HunterArsenal' && j.format === 'encrypted-backup' && j.v === 1 && j.kdf && j.cipher && typeof j.data === 'string' ? j : null;
  }
  const isEncrypted = text => !!parseEnvelope(text);
  async function decryptBackup(text, passphrase) {
    const j = parseEnvelope(text); if (!j) throw new Error('Not an encrypted backup');
    const iter = Number(j.kdf.iter);
    if (!(iter >= 100000 && iter <= 5000000)) throw new Error('Unsupported key settings');   // refuse absurd values from a hostile file
    const bits = await pbkdf2Bits(passphrase, ub64(j.kdf.salt), iter);
    const key = await subtle.importKey('raw', bits, 'AES-GCM', false, ['decrypt']);
    const pt = await subtle.decrypt({ name: 'AES-GCM', iv: ub64(j.cipher.iv), additionalData: AAD }, key, ub64(j.data));
    return dec.decode(pt);
  }

  /* ---------------------------------------------------------------- lock config */
  function cfg() { try { const c = JSON.parse(g.localStorage.getItem(KEY) || 'null'); return c && c.hash && c.salt ? c : null; } catch (e) { return null; } }
  function putCfg(c) { try { if (c) g.localStorage.setItem(KEY, JSON.stringify(c)); else g.localStorage.removeItem(KEY); return true; } catch (e) { return false; } }
  const enabled = () => !!cfg();
  async function makePin(pin, prev) {
    const salt = rnd(16);
    return Object.assign({}, prev || {}, { v: 1, salt: b64(salt), iter: PIN_ITER, hash: b64(await pbkdf2Bits(pin, salt, PIN_ITER)), len: pin.length, fails: 0, until: 0 });
  }
  async function checkPin(pin) {
    const c = cfg(); if (!c) return false;
    return same(await pbkdf2Bits(pin, ub64(c.salt), c.iter || PIN_ITER), ub64(c.hash));
  }

  /* ---------------------------------------------------------------- biometrics (WebAuthn platform authenticator) */
  async function bioSupported() {
    try {
      return !!(g.isSecureContext && g.PublicKeyCredential && g.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable &&
        await g.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
    } catch (e) { return false; }
  }
  async function bioRegister() {
    const cred = await navigator.credentials.create({ publicKey: {
      rp: { name: 'HunterArsenal', id: location.hostname }, user: { id: rnd(16), name: 'hunter', displayName: 'Hunter' },
      challenge: rnd(32), pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      attestation: 'none', timeout: 60000
    } });
    return cred ? b64(new Uint8Array(cred.rawId)) : null;
  }
  async function bioAuth() {
    const c = cfg(); if (!c || !c.bio) return false;
    const cred = await navigator.credentials.get({ publicKey: {
      challenge: rnd(32), rpId: location.hostname, userVerification: 'required', timeout: 60000,
      allowCredentials: [{ type: 'public-key', id: ub64(c.bio), transports: ['internal'] }]
    } });
    if (!cred || b64(new Uint8Array(cred.rawId)) !== c.bio) return false;
    const ad = new Uint8Array(cred.response.authenticatorData);
    const rpHash = new Uint8Array(await subtle.digest('SHA-256', enc.encode(location.hostname)));
    if (!same(ad.subarray(0, 32), rpHash)) return false;        // asserted for this site
    return (ad[32] & 0x01) !== 0 && (ad[32] & 0x04) !== 0;       // user present AND user verified by the device
  }

  /* ---------------------------------------------------------------- lock screen */
  let overlay = null, entry = '', busy = false, locked = false, hiddenAt = 0, tick = null;
  const guarded = ['app', 'layer', 'notice'];
  function setInert(on) { guarded.forEach(id => { const e = document.getElementById(id); if (!e) return; if (on) { e.setAttribute('inert', ''); e.setAttribute('aria-hidden', 'true'); } else { e.removeAttribute('inert'); e.removeAttribute('aria-hidden'); } }); }
  function closeOverlay() { clearInterval(tick); tick = null; if (overlay) { overlay.remove(); overlay = null; } entry = ''; locked = false; setInert(false); document.documentElement.classList.remove('is-locked'); }

  function padHTML(c) {
    const k = n => `<button class="lk-key" data-k="${n}" aria-label="${n}">${n}</button>`;
    const bio = c.bio ? `<button class="lk-key lk-fn" data-lk="bio" aria-label="Use device unlock"><svg class="ico" viewBox="0 0 24 24"><circle cx="8" cy="12" r="4"/><path d="M12 12h9m-3 0v3m-3-3v2"/></svg></button>` : '<span></span>';
    return `<div class="lk-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k).join('')}${bio}${k(0)}<button class="lk-key lk-fn" data-lk="del" aria-label="Delete"><svg class="ico" viewBox="0 0 24 24"><path d="M21 5H9l-6 7 6 7h12zM15 9l-4 6M11 9l4 6"/></svg></button></div>`;
  }
  function drawDots() {
    const c = cfg(), n = (c && c.len) || 6, box = $('.lk-dots', overlay); if (!box) return;
    box.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < entry.length ? 'on' : ''}"></i>`).join('');
  }
  function say(msg, bad) { const m = $('.lk-msg', overlay); if (m) { m.textContent = msg || ''; m.classList.toggle('bad', !!bad); } }
  function lockoutLeft() { const c = cfg(); return c && c.until > Date.now() ? Math.ceil((c.until - Date.now()) / 1000) : 0; }
  function showLockout() {
    clearInterval(tick);
    const upd = () => { const s = lockoutLeft(); if (!s) { clearInterval(tick); say(''); return; } say(`Too many attempts. Try again in ${s >= 60 ? Math.ceil(s / 60) + ' min' : s + ' s'}.`, true); };
    upd(); tick = setInterval(upd, 1000);
  }

  function showCover() {
    if (!overlay) { overlay = document.createElement('div'); document.body.appendChild(overlay); }
    overlay.className = 'lk-wrap lk-cover'; overlay.innerHTML = '<div class="lk-top">RESTRICTED // PERSONAL</div><div class="lk-body"><div class="lk-mark">HA</div></div>';
    document.documentElement.classList.add('is-locked'); setInert(true);
  }
  function showLock(autoBio) {
    const c = cfg(); if (!c) return;
    locked = true; entry = '';
    if (!overlay) { overlay = document.createElement('div'); document.body.appendChild(overlay); }
    overlay.className = 'lk-wrap'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', 'App locked');
    overlay.innerHTML = `<div class="lk-top"><span>RESTRICTED // PERSONAL</span><span>ACCESS CONTROL</span></div>
      <div class="lk-body">
        <img class="lk-logo" src="assets/branding/hunterarsenal-logo.png" data-fallback="assets/fallback/logo-mark.svg" alt="">
        <h2>ACCESS RESTRICTED</h2><p class="lk-sub">Enter passcode to continue</p>
        <div class="lk-dots" aria-hidden="true"></div><div class="lk-msg" role="status" aria-live="polite"></div>
        ${padHTML(c)}
        <button class="lk-link" data-lk="forgot">Forgot passcode?</button>
      </div>`;
    document.documentElement.classList.add('is-locked'); setInert(true); drawDots();
    const im = $('.lk-logo', overlay); if (im) im.addEventListener('error', () => { if (!im.dataset.fb) { im.dataset.fb = '1'; im.src = im.dataset.fallback; } });
    if (lockoutLeft()) showLockout();
    if (autoBio && c.bio) setTimeout(() => { if (locked) bioUnlock(true); }, 250);
  }

  async function submit() {
    if (busy) return; const c = cfg(); if (!c) return closeOverlay();
    if (lockoutLeft()) { showLockout(); entry = ''; drawDots(); return; }
    busy = true;
    let ok = false; try { ok = await checkPin(entry); } catch (e) { ok = false; }
    busy = false;
    if (ok) { putCfg(Object.assign(c, { fails: 0, until: 0 })); closeOverlay(); return; }
    const fails = (c.fails || 0) + 1, wait = fails >= 5 ? Math.min(900, 30 * Math.pow(2, fails - 5)) : 0;
    putCfg(Object.assign(c, { fails, until: wait ? Date.now() + wait * 1000 : 0 }));
    entry = ''; drawDots(); const w = $('.lk-dots', overlay); if (w) { w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); }
    if (wait) showLockout(); else say(`Incorrect passcode. ${5 - fails} attempt${5 - fails === 1 ? '' : 's'} before lockout.`, true);
    if (g.navigator.vibrate) g.navigator.vibrate(60);
  }
  async function bioUnlock(silent) {
    if (busy) return; busy = true;
    try { if (await bioAuth()) { busy = false; const c = cfg(); if (c) putCfg(Object.assign(c, { fails: 0, until: 0 })); closeOverlay(); return; } if (!silent) say('Biometric check failed. Use your passcode.', true); }
    catch (e) { if (!silent) { const reason=e&&e.name==='NotAllowedError'?'Device authentication was cancelled or not accepted.':e&&e.name==='NotSupportedError'?'This device does not support biometric unlock.':e&&e.name==='SecurityError'?'Biometric unlock requires a secure connection.':'Biometric unlock is unavailable right now.'; say(`${reason} Use your passcode.`, true); } }
    busy = false;
  }

  document.addEventListener('click', (e) => {
    if (!overlay || !overlay.contains(e.target)) return;
    const k = e.target.closest('[data-k]'), a = e.target.closest('[data-lk]');
    if (k) { const c = cfg(); if (!c || busy || lockoutLeft()) return; if (entry.length < c.len) { entry += k.dataset.k; drawDots(); say(''); if (entry.length === c.len) submit(); } }
    else if (a) {
      const act = a.dataset.lk;
      if (act === 'del') { entry = entry.slice(0, -1); drawDots(); }
      else if (act === 'bio') bioUnlock(false);
      else if (act === 'forgot') forgot();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (!overlay || !locked || document.querySelector('.sx-modal')) return;
    const c = cfg(); if (!c || busy || lockoutLeft()) return;
    if (/^\d$/.test(e.key)) { if (entry.length < c.len) { entry += e.key; drawDots(); say(''); if (entry.length === c.len) submit(); } }
    else if (e.key === 'Backspace') { entry = entry.slice(0, -1); drawDots(); }
  });

  /* ---------------------------------------------------------------- dialogs */
  function modal(innerHTML) {
    const m = document.createElement('div'); m.className = 'sx-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = `<div class="sx-card">${innerHTML}</div>`; document.body.appendChild(m); return m;
  }
  // ask({title, body, fields:[{id,label,type,inputmode,maxlength,placeholder,autocomplete}], ok, validate(values)->error string|''})
  function ask(o) {
    return new Promise((resolve) => {
      const m = modal(`<h3>${esc(o.title)}</h3>${o.body ? `<p class="sx-body">${o.body}</p>` : ''}
        ${(o.fields || []).map(f => `<label class="sx-f"><span>${esc(f.label)}</span><input class="input" id="sx-${f.id}" type="${f.type || 'password'}" ${f.inputmode ? `inputmode="${f.inputmode}"` : ''} ${f.maxlength ? `maxlength="${f.maxlength}"` : ''} autocomplete="${f.autocomplete || 'off'}" autocapitalize="off" spellcheck="false" placeholder="${esc(f.placeholder || '')}"></label>`).join('')}
        <div class="sx-err" role="alert"></div>
        <div class="sx-actions"><button class="btn ghost" data-sx="cancel">Cancel</button><button class="btn ${o.danger ? 'danger' : ''}" data-sx="ok">${esc(o.ok || 'OK')}</button></div>`);
      const first = m.querySelector('input'); if (first) setTimeout(() => first.focus(), 50);
      const done = (v) => { document.removeEventListener('keydown', onKey, true); m.remove(); resolve(v); };
      const go = async () => {
        const vals = {}; (o.fields || []).forEach(f => { vals[f.id] = m.querySelector('#sx-' + f.id).value; });
        const err = o.validate ? await o.validate(vals) : ''; if (err) { m.querySelector('.sx-err').textContent = err; return; }
        done(vals);
      };
      const onKey = (e) => { if (!m.isConnected) return; if (e.key === 'Escape') { e.stopPropagation(); done(null); } else if (e.key === 'Enter') { e.preventDefault(); go(); } };
      document.addEventListener('keydown', onKey, true);
      m.addEventListener('click', (e) => { const b = e.target.closest('[data-sx]'); if (!b) return; b.dataset.sx === 'ok' ? go() : done(null); });
    });
  }
  function choose(o) {
    return new Promise((resolve) => {
      const m = modal(`<h3>${esc(o.title)}</h3>${o.body ? `<p class="sx-body">${esc(o.body)}</p>` : ''}
        <div class="sx-list">${o.options.map(x => `<button class="sx-opt ${x.danger ? 'danger' : ''}" data-id="${x.id}"><b>${esc(x.label)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</button>`).join('')}</div>
        <div class="sx-actions"><button class="btn ghost" data-sx="cancel">Close</button></div>`);
      const done = (v) => { document.removeEventListener('keydown', onKey, true); m.remove(); resolve(v); };
      const onKey = (e) => { if (m.isConnected && e.key === 'Escape') { e.stopPropagation(); done(null); } };
      document.addEventListener('keydown', onKey, true);
      m.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) return done(b.dataset.id); if (e.target.closest('[data-sx]') || e.target === m) done(null); });
    });
  }
  const notify = (title, body) => ask({ title, body, ok: 'OK', fields: [], validate: null }).then(() => null);

  /* passphrase prompts for backups */
  function askPassphrase(o) {
    o = o || {};
    return ask({
      title: o.title || 'PASSPHRASE', ok: o.confirm ? 'Encrypt' : 'Decrypt',
      body: o.confirm ? 'Choose a passphrase of at least 8 characters. It is never stored or recoverable: without it this backup cannot be opened.' : 'Enter the passphrase used to encrypt this backup.',
      fields: o.confirm ? [{ id: 'p1', label: 'Passphrase', autocomplete: 'new-password' }, { id: 'p2', label: 'Repeat passphrase', autocomplete: 'new-password' }] : [{ id: 'p1', label: 'Passphrase', autocomplete: 'current-password' }],
      validate: v => (o.confirm ? (v.p1.length < 8 ? 'Use at least 8 characters.' : v.p1 !== v.p2 ? 'The passphrases do not match.' : '') : (v.p1 ? '' : 'Enter the passphrase.'))
    }).then(v => (v ? v.p1 : null));
  }

  /* ---------------------------------------------------------------- management flows */
  async function newPin(title) {
    const v = await ask({ title: title || 'SET PASSCODE', ok: 'Set', body: 'Use 4 to 8 digits.',
      fields: [{ id: 'a', label: 'New passcode', inputmode: 'numeric', maxlength: 8, autocomplete: 'new-password' }, { id: 'b', label: 'Repeat passcode', inputmode: 'numeric', maxlength: 8, autocomplete: 'new-password' }],
      validate: x => (!/^\d{4,8}$/.test(x.a) ? 'Passcode must be 4 to 8 digits.' : x.a !== x.b ? 'The passcodes do not match.' : '') });
    return v ? v.a : null;
  }
  async function verifyCurrent(title) {
    const v = await ask({ title: title || 'CONFIRM PASSCODE', ok: 'Confirm', fields: [{ id: 'a', label: 'Current passcode', inputmode: 'numeric', maxlength: 8, autocomplete: 'current-password' }],
      validate: async x => ((await checkPin(x.a)) ? '' : 'Incorrect passcode.') });
    return !!v;
  }
  async function manage(onChange) {
    const changed = () => { try { onChange && onChange(); } catch (e) { /* ignore */ } };
    for (;;) {
      const c = cfg(), bio = await bioSupported();
      const autoLabel = (AUTO_CHOICES.find(x => x[0] === (c ? c.auto : 30)) || AUTO_CHOICES[1])[1];
      const opts = c ? [
        { id: 'auto', label: 'Auto-lock', sub: autoLabel },
        bio || c.bio ? { id: 'bio', label: c.bio ? 'Turn off biometric unlock' : 'Turn on biometric unlock', sub: c.bio ? 'Passcode only' : 'Uses this device’s fingerprint or face sensor' } : null,
        { id: 'change', label: 'Change passcode' }, { id: 'lock', label: 'Lock now' },
        { id: 'off', label: 'Turn off App Lock', danger: true }
      ] : [{ id: 'on', label: 'Turn on App Lock', sub: 'Passcode, with optional biometrics' }];
      const pick = await choose({ title: 'APP LOCK', body: c ? 'App Lock is on. It protects the app screen; use encrypted backups to protect exports.' : 'App Lock is off.', options: opts.filter(Boolean) });
      if (!pick) return;
      if (pick === 'on') {
        const pin = await newPin(); if (!pin) continue;
        putCfg(await makePin(pin, { auto: 30, bio: null })); changed();
        if (bio) { const yes = await choose({ title: 'BIOMETRIC UNLOCK', body: 'Also unlock with this device’s fingerprint or face sensor?', options: [{ id: 'y', label: 'Turn on biometrics' }, { id: 'n', label: 'Passcode only' }] });
          if (yes === 'y') { try { const id = await bioRegister(); if (id) { putCfg(Object.assign(cfg(), { bio: id })); changed(); } } catch (e) { await notify('BIOMETRICS', 'Could not set up biometrics on this device. Passcode lock is still on.'); } } }
      } else if (pick === 'auto') {
        const a = await choose({ title: 'AUTO-LOCK', options: AUTO_CHOICES.map(([s, l]) => ({ id: String(s), label: l, sub: s === c.auto ? 'Current' : '' })) });
        if (a !== null) { putCfg(Object.assign(c, { auto: Number(a) })); changed(); }
      } else if (pick === 'bio') {
        if (c.bio) { putCfg(Object.assign(c, { bio: null })); changed(); }
        else { try { const id = await bioRegister(); if (id) { putCfg(Object.assign(cfg(), { bio: id })); changed(); } } catch (e) { await notify('BIOMETRICS', 'Could not set up biometrics. Make sure this device has a fingerprint or face unlock set up.'); } }
      } else if (pick === 'change') {
        if (!(await verifyCurrent())) continue; const pin = await newPin('NEW PASSCODE'); if (pin) { putCfg(await makePin(pin, { auto: c.auto, bio: c.bio })); changed(); }
      } else if (pick === 'lock') { showLock(true); return; }
      else if (pick === 'off') { if (await verifyCurrent('TURN OFF APP LOCK')) { putCfg(null); changed(); } }
    }
  }
  async function forgot() {
    const v = await ask({ title: 'FORGOT PASSCODE', ok: 'Erase everything', danger: true,
      body: 'The passcode cannot be recovered. The only way back in is to erase all data on this device and start over. If you have a backup you can restore it afterwards.<br><br>Type <b>ERASE</b> to confirm.',
      fields: [{ id: 'w', label: 'Confirmation', type: 'text' }], validate: x => (x.w.trim().toUpperCase() === 'ERASE' ? '' : 'Type ERASE to confirm.') });
    if (!v) return;
    try { if (HA.Store && HA.Store.wipe) HA.Store.wipe(); g.localStorage.removeItem('hunterarsenal.v2'); } catch (e) { /* ignore */ }
    putCfg(null); g.location.reload();
  }

  /* ---------------------------------------------------------------- auto-lock on background */
  document.addEventListener('visibilitychange', () => {
    const c = cfg(); if (!c) return;
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); if (!locked) showCover(); }
    else if (!locked) { if (Date.now() - hiddenAt >= (c.auto || 0) * 1000) showLock(true); else closeOverlay(); }
  });
  g.addEventListener('pageshow', (e) => { if (e.persisted && cfg() && !locked) showLock(true); });

  HA.Security = { enabled, manage, lock: () => showLock(true), isEncrypted, encryptBackup, decryptBackup, askPassphrase, bioSupported, status: () => { const c = cfg(); return c ? (c.bio ? 'On · passcode + biometrics' : 'On · passcode') : 'Off'; }, _test: { checkPin, makePin, putCfg, cfg } };

  // lock before anything renders
  if (cfg()) { const boot = () => showLock(true); if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot); }
})(typeof self !== 'undefined' ? self : window);
