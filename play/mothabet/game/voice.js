/* Mothabet: voice. Elearnea build: a thin wrapper over the shared Elearnea voice module (window.ElVoice, ../../../voice/voice.js),
   which plays the recorded clips listed in voice/manifest.json and falls back to the device's own ON-DEVICE speech voice.
   When nothing can be heard (no clip and no device voice, or the grown-up turned voice off) the game uses its visual cues:
   picture hints, "look, cover, spell" word flashes, and synthesized chimes. Speech always respects the in-game mute. */
(function (root) {
  'use strict';
  const MB = root.MB;
  const core = () => root.ElVoice || null;
  const V = MB.Voice = {
    enabled: true, rate: 1, speaking: false, _t: 0, _listeners: [],
    get supported() { const c = core(); return !!(c && (c.supported || c.ready)); },
    get voice() { const c = core(); return c ? c.voice : null; },
    get clips() { const c = core(); return !!(c && c.ready); },
    get ok() { const c = core(); return this.enabled && !!(c && c.available); },
    init() { const c = core(); if (!c || this._i) return; this._i = true; c.init(); c.onChange(() => this._listeners.forEach(f => { try { f(); } catch (e) {} })); },
    onChange(f) { this._listeners.push(f); },
    // say(text, {rate, pitch, onend}). Returns false when speech isn't available (caller shows the visual cue).
    say(text, o) {
      o = o || {}; const c = core(); if (!this.ok || HX.Audio.muted || !text || !c) { if (o.onend) setTimeout(o.onend, 10); return false; }
      const id = ++this._t; c.rate = this.rate;
      const done = () => { if (id !== this._t) return; this.speaking = false; this._duck(false); if (o.onend) o.onend(); };
      const ok = c.say(text, Object.assign({}, o, { pitch: o.pitch || 1.08, onend: done }));
      if (ok) { this.speaking = true; this._duck(true); } return ok;
    },
    stop() { this._t++; this.speaking = false; this._duck(false); const c = core(); if (c) c.stop(); },
    _duck(on) { const A = HX.Audio; if (A.musicGain && A.ctx) { try { A.musicGain.gain.setTargetAtTime(on ? .08 : (MB.musicVol == null ? .3 : MB.musicVol), A.ctx.currentTime, .08); } catch (e) {} } }
  };
  root.addEventListener('pagehide', () => V.stop());
  document.addEventListener('visibilitychange', () => { if (document.hidden) V.stop(); });
})(window);
