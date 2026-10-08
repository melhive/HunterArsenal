/* System Window: the Hunter System speaking to the user.
 * Notices are queued so several events (level up + title) show one after another.
 * All dynamic text passed in `bodyHTML` MUST already be escaped by the caller. */
(function (g) {
  'use strict';
  const HA = (g.HA = g.HA || {});
  const queue = [];
  let active = null, lastFocus = null;

  const LOGO = 'assets/branding/hunterarsenal-logo.png', LOGO_FALLBACK = 'assets/fallback/logo-emblem.svg';

  function root() { return document.getElementById('notice'); }

  function render(n) {
    const el = root();
    const tone = n.tone || 'var(--accent)';
    el.innerHTML = `
      <div class="nw-backdrop" data-nw="backdrop">
        <div class="nw ${n.systemAlert ? 'system-alert' : ''}" role="alertdialog" aria-modal="true" aria-labelledby="nw-title" style="--tone:${tone}">
          ${n.systemAlert ? '<div class="system-alert-mark" aria-hidden="true">!</div>' : ''}
          <img class="nw-logo" src="${LOGO}" data-fallback="${LOGO_FALLBACK}" alt="">
          <div class="nw-frame"><div class="nw-body">
            <div class="nw-eyebrow"><i></i><span>${n.eyebrow || 'SYSTEM NOTICE'}</span><i></i></div>
            <h2 id="nw-title" class="nw-title">${n.title}${n.subtitle ? `<small>${n.subtitle}</small>` : ''}</h2>
            ${n.bodyHTML ? `<div class="nw-content">${n.bodyHTML}</div>` : ''}
            ${n.quote ? `<p class="nw-quote">${n.quote}</p>` : ''}
            <div class="nw-actions ${n.secondary ? 'two' : ''}">
              ${n.secondary ? `<button class="nw-btn ghost" data-nw="secondary">${n.secondary.label}</button>` : ''}
              <button class="nw-btn" data-nw="primary">${n.primary ? n.primary.label : 'OK'}</button>
            </div>
          </div></div>
        </div>
      </div>`;
    el.classList.add('open');
    const btn = el.querySelector('[data-nw="primary"]'); if (btn) btn.focus({ preventScroll: true });
  }

  function next() {
    if (active || !queue.length) return;
    active = queue.shift();
    lastFocus = document.activeElement;
    render(active);
    if (active.sound && HA.Sound) HA.Sound.play(active.sound);
  }

  function close(which) {
    if (!active) return;
    const n = active; active = null;
    const el = root(); el.classList.remove('open'); el.innerHTML = '';
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
    const h = which === 'secondary' ? n.secondary : n.primary;
    try { if (h && h.onClick) h.onClick(); } finally { setTimeout(next, 120); }
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-nw]'); if (!t || !active) return;
    const w = t.dataset.nw;
    if (w === 'primary') close('primary');
    else if (w === 'secondary') close('secondary');
    else if (w === 'backdrop' && e.target === t && active.dismissible) close('secondary');
  });
  document.addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.key === 'Escape') close(active.secondary || active.escapeDismiss ? 'secondary' : 'primary');
    if (e.key === 'Tab') {                                   // keep focus inside the notice
      const f = [...root().querySelectorAll('button')]; if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---- tiny synthesized chimes (Web Audio, no files). Off unless the user enables it. ---- */
  const Sound = {
    enabled: false, ctx: null,
    play(kind) {
      if (!Sound.enabled) return;
      try {
        const AC = g.AudioContext || g.webkitAudioContext; if (!AC) return;
        Sound.ctx = Sound.ctx || new AC();
        const c = Sound.ctx, t0 = c.currentTime;
        const seqs = {
          check: [[660, 0, .08], [880, .07, .1]],
          levelup: [[523, 0, .12], [659, .11, .12], [784, .22, .12], [1046, .33, .3]],
          rankup: [[392, 0, .14], [523, .13, .14], [659, .26, .14], [784, .39, .14], [1046, .52, .45]],
          unlock: [[784, 0, .1], [1175, .09, .22]],
          penalty: [[220, 0, .18], [164, .16, .28]],
          notice: [[587, 0, .08], [740, .08, .14]]
        };
        (seqs[kind] || seqs.notice).forEach(([f, d, len]) => {
          const o = c.createOscillator(), gn = c.createGain();
          o.type = 'sine'; o.frequency.value = f;
          gn.gain.setValueAtTime(0, t0 + d); gn.gain.linearRampToValueAtTime(0.12, t0 + d + 0.015); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + d + len);
          o.connect(gn).connect(c.destination); o.start(t0 + d); o.stop(t0 + d + len + 0.05);
        });
      } catch (e) { /* audio is optional */ }
    }
  };

  HA.Notice = {
    show(n) {
      if (HA.Store && HA.Store.isRecoveryRequired && HA.Store.isRecoveryRequired() && !(n && n.allowDuringRecovery)) return;
      queue.push(Object.assign({ dismissible: false }, n)); next();
    },
    get busy() { return !!active || queue.length > 0; }
  };
  HA.Sound = Sound;
})(window);
