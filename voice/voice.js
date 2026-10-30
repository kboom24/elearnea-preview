/* Elearnea voice: the ONE module every spoken line goes through (Elearnea shell, Lily Pad Hop, Firefly Count, Mothabet).
   - Lines are looked up by id in voice/index.json, which is generated from voice/manifest.json (the full list of spoken lines).
     Lookup: the game's text -> normalized key -> manifest id -> that line's clip file(s), played in order (same-origin files, no
     third-party calls, no runtime TTS). Own lines: voice/clips/<id>; Mothabet lines: sequences of voice/mb/<script clip>.
     Each clip ships as .opus and .mp3; .opus is used where the browser can play Ogg Opus.
   - Swapping voice providers = re-render the files from the manifest (tools/voice/regen.py); no game code changes.
   - Fallback when a line has no clip, the index hasn't loaded, or playback fails: this device's own ON-DEVICE speech voice
     (network voices are never used). Text that is not in the manifest at all is logged to window.__voiceMisses (QA fails on it);
     manifest lines whose clips aren't shipped yet are logged to window.__voicePending.
   API: ElVoice.say(text | [text, ...], {rate, pitch, onend}) -> true if something will be heard; stop(); has(text); id(text);
        available (clips or device voice); device (a device voice exists); onChange(fn); rate (user speed, 0.7-1.3).
   onend contract: fires EXACTLY ONCE per say() that was given one: when the line ends, when playback errors (after the device
   fallback), when it is interrupted by stop() or a newer say() (async, so the newer line is already playing), or from a watchdog.
   Clip watchdog: each clip must end within its duration / playbackRate + 1.5 s (CLIP_SLACK); with no duration known yet,
   CLIP_GUESS ms. When the watchdog fires the clip counts as ended (once): a late real 'ended' is ignored, so a line never
   advances twice. */
(function (root) {
  'use strict';
  if (root.ElVoice) return;
  const S = document.currentScript && document.currentScript.src;
  const BASE = S ? S.replace(/voice\.js(\?.*)?$/, '') : './voice/';
  const norm = (s) => String(s).toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const SS = root.speechSynthesis || null;
  // 0.05 s of silence (WAV data URI) played on the first tap so iOS lets the shared audio element play later.
  const SILENT = (() => { const n = 1103, b = new Uint8Array(44 + n * 2), v = new DataView(b.buffer), w = (o, s) => { for (let i = 0; i < 4; i++) b[o + i] = s.charCodeAt(i); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 22050, true); v.setUint32(28, 44100, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return 'data:audio/wav;base64,' + btoa(s); })();
  const CLIP_SLACK = 1500, CLIP_GUESS = 9000; // ms
  const misses = root.__voiceMisses = root.__voiceMisses || [], pending = root.__voicePending = root.__voicePending || [];
  const V = root.ElVoice = {
    norm, map: null, files: null, ext: 'mp3', provider: null, rate: 1, speaking: false, _t: 0, el: null, _ls: [], _cur: null,
    supported: !!(SS && root.SpeechSynthesisUtterance), voice: null,
    get ready() { return !!(this.map && this.files && Object.keys(this.files).length); },
    get device() { return this.supported && !!this.voice; },
    get available() { return this.ready || this.device; },
    load() { if (this._p) return this._p;
      this._p = fetch(BASE + 'index.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => { if (j && j.map) { this.map = j.map; this.files = j.files || {}; this.provider = j.voice || null;
          const fm = j.formats || ['mp3']; let a = null; try { a = document.createElement('audio'); } catch (e) {}
          this.ext = fm.includes('opus') && a && a.canPlayType && a.canPlayType('audio/ogg; codecs="opus"') === 'probably' ? 'opus' : 'mp3'; } this._emit(); }).catch(() => {});
      return this._p; },
    onChange(f) { this._ls.push(f); },
    _emit() { this._ls.forEach(f => { try { f(); } catch (e) {} }); },
    id(text) { return this.map ? this.map[norm(text)] || null : null; },
    known(text) { return !!this.id(text); },
    // clip urls for one line ([] when its clips aren't shipped)
    urls(text) { const i = this.id(text), f = i && this.files ? this.files[i] : null; if (!f) return []; return (f === 1 ? ['clips/' + i] : f).map(p => BASE + p + '.' + this.ext); },
    has(text) { const a = Array.isArray(text) ? text : [text]; return a.length > 0 && a.every(t => this.urls(t).length > 0); },
    _el() { if (!this.el) { this.el = new Audio(); this.el.preload = 'auto'; try { this.el.preservesPitch = true; } catch (e) {} } return this.el; },
    say(text, o) { o = o || {}; const list = (Array.isArray(text) ? text : [text]).map(t => String(t == null ? '' : t)).filter(t => norm(t));
      this.stop(); if (!list.length) { if (o.onend) setTimeout(o.onend, 10); return false; }
      o = this._job(o);
      if (this.map) { list.forEach(t => { if (!this.known(t)) { if (misses.length < 200) misses.push(norm(t)); } else if (!this.urls(t).length && pending.length < 200) pending.push(norm(t)); });
        if (this.has(list)) return this._clips(list.flatMap(t => this.urls(t)), Object.assign({}, o, { _text: list.join(' ') })); }
      return this._device(list.join(' '), o); },
    // one job per say(): o.onend is wrapped so it can only ever run once; stop() fires the pending one (interrupted)
    _job(o) { const user = o.onend; let done = false; const j = Object.assign({}, o);
      j.onend = () => { if (done) return; done = true; if (this._cur === j) this._cur = null; if (user) user(); };
      j._pending = () => !done; this._cur = j; return j; },
    _clips(list, o) { const id = ++this._t, el = this._el(); let k = 0, ended = false, dog = null; this.speaking = true;
      const clear = () => { clearTimeout(dog); dog = null; el.onloadedmetadata = el.ondurationchange = null; };
      const fin = (failed) => { if (ended || id !== this._t) return; ended = true; clear(); el.onended = el.onerror = null; this.speaking = false;
        if (failed) { this._device(o._text || '', o); } else if (o.onend) o.onend(); };
      const next = () => { if (id !== this._t) return; if (k >= list.length) return fin(false);
        const ci = k; let adv = false; // this clip advances once: real 'ended' or the watchdog, whichever comes first
        const advance = () => { if (adv || id !== this._t || k !== ci) return; adv = true; clear(); k++; setTimeout(next, 90); };
        const arm = () => { clearTimeout(dog); const d = el.duration, r = el.playbackRate || 1;
          dog = setTimeout(advance, isFinite(d) && d > 0 ? d / r * 1000 + CLIP_SLACK : CLIP_GUESS); };
        el.onended = advance; el.onloadedmetadata = el.ondurationchange = () => { if (!adv && id === this._t) arm(); };
        // Ogg Opus is preferred (half the bytes); Safari < 18.4 can't decode it, so on a decode error switch to the .mp3 copies for good
        el.onerror = () => { if (this.ext === 'opus' && /\.opus$/.test(list[k])) { this.ext = 'mp3'; list = list.map(u => u.replace(/\.opus$/, '.mp3')); el.src = list[k]; const q = el.play(); if (q && q.catch) q.catch(() => fin(true)); el.onerror = () => fin(true); } else fin(true); };
        el.src = list[k]; el.playbackRate = Math.max(.7, Math.min(1.3, this.rate || 1));
        arm(); // until metadata arrives: CLIP_GUESS
        const p = el.play(); if (p && p.catch) p.catch(() => fin(true)); };
      next(); return true; },
    _device(str, o) { if (!this.device) { if (o.onend) setTimeout(o.onend, 10); return false; }
      try { SS.cancel(); const u = new SpeechSynthesisUtterance(str); u.voice = this.voice; u.lang = this.voice.lang || 'en-US';
        u.rate = Math.max(.5, Math.min(1.3, (o.rate || .9) * (this.rate || 1))); u.pitch = o.pitch || 1.1; u.volume = 1;
        const id = ++this._t; this.speaking = true; const done = () => { if (id !== this._t) return; this._t++; this.speaking = false; if (o.onend) o.onend(); };
        u.onend = done; u.onerror = done; SS.speak(u); setTimeout(() => { if (id === this._t) done(); }, 1500 + str.length * 140); // watchdog (Safari sometimes never fires onend)
        return true; } catch (e) { this.speaking = false; return false; } },
    stop() { const j = this._cur; this._cur = null; if (j && j._pending()) setTimeout(j.onend, 0); // interrupted: its onend still fires, once
      this._t++; this.speaking = false; if (this.el) { try { this.el.onended = this.el.onerror = null; this.el.pause(); } catch (e) {} } try { if (this.supported) SS.cancel(); } catch (e) {} },
    init() { if (this._init) return; this._init = true; this.load();
      if (this.supported) { const pick = () => { let vs = []; try { vs = SS.getVoices() || []; } catch (e) {}
          const en = vs.filter(v => /^en([-_]|$)/i.test(v.lang || '') && v.localService !== false); // on-device voices only, never network voices
          const pref = [/samantha/i, /ava/i, /allison/i, /aria/i, /jenny/i, /zira/i, /karen/i, /moira/i, /serena/i, /female/i];
          let best = null; for (const re of pref) { best = en.find(v => re.test(v.name)); if (best) break; }
          this.voice = best || en[0] || null; this._emit(); };
        pick(); try { SS.addEventListener ? SS.addEventListener('voiceschanged', pick) : (SS.onvoiceschanged = pick); } catch (e) {} }
      const unlock = () => { if (this._unlocked) return; this._unlocked = true;
        if (this.supported) { try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; SS.speak(u); } catch (e) {} }
        if (!this.speaking) { try { const el = this._el(); el.src = SILENT; const p = el.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} } };
      ['pointerdown', 'touchend', 'keydown'].forEach(ev => root.addEventListener(ev, unlock, { capture: true, passive: true }));
      root.addEventListener('pagehide', () => this.stop());
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.stop(); }); }
  };
  V.init();
})(window);
