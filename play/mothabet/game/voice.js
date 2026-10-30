/* Mothabet: voice. Web Speech API (on-device voices only; no network) with a real no-voice fallback.
   When no voice is available (or the grown-up turned it off) the game switches to visual cues: picture hints,
   "look, cover, spell" word flashes, and synthesized chimes. Speech always respects the in-game mute. */
(function (root) {
  'use strict';
  const MB = root.MB;
  const SS = root.speechSynthesis || null;
  const V = MB.Voice = {
    supported: !!(SS && root.SpeechSynthesisUtterance), voice: null, voices: [], enabled: true, rate: 1, speaking: false, unlocked: false, _onend: null, _t: 0, _listeners: [],
    get ok() { return this.supported && this.enabled && !!this.voice; },
    init() {
      if (!this.supported) return;
      const pick = () => {
        let vs = []; try { vs = SS.getVoices() || []; } catch (e) { vs = []; }
        this.voices = vs; const en = vs.filter(v => /^en([-_]|$)/i.test(v.lang || '') && v.localService !== false); /* Elearnea: on-device voices only, never network voices */
        const pref = [/samantha/i, /ava/i, /allison/i, /google us english/i, /aria/i, /jenny/i, /zira/i, /karen/i, /moira/i, /serena/i, /female/i];
        let best = null; for (const re of pref) { best = en.find(v => re.test(v.name) && v.localService !== false) || en.find(v => re.test(v.name)); if (best) break; }
        // prefer on-device voices (no network); fall back to any English voice
        this.voice = best || en[0] || null; this._listeners.forEach(f => { try { f(); } catch (e) {} });
      };
      pick(); try { SS.addEventListener ? SS.addEventListener('voiceschanged', pick) : (SS.onvoiceschanged = pick); } catch (e) {}
      // iOS: the first utterance must come from a user gesture
      const unlock = () => { if (this.unlocked || !this.supported) return; this.unlocked = true; try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; SS.speak(u); } catch (e) {} };
      ['pointerdown', 'touchend', 'keydown'].forEach(ev => root.addEventListener(ev, unlock, { capture: true, passive: true }));
    },
    onChange(f) { this._listeners.push(f); },
    // say(text, {rate, pitch, onend}). Returns false when speech isn't available (caller shows the visual cue).
    say(text, o) {
      o = o || {}; if (!this.ok || HX.Audio.muted || !text) { if (o.onend) setTimeout(o.onend, 10); return false; }
      try {
        SS.cancel(); const u = new SpeechSynthesisUtterance(String(text)); u.voice = this.voice; u.lang = this.voice.lang || 'en-US';
        u.rate = Math.max(.5, Math.min(1.3, (o.rate || .9) * this.rate)); u.pitch = o.pitch || 1.08; u.volume = 1;
        const id = ++this._t; this.speaking = true; this._duck(true);
        const done = () => { if (id !== this._t) return; this.speaking = false; this._duck(false); if (o.onend) o.onend(); };
        u.onend = done; u.onerror = done; SS.speak(u);
        setTimeout(() => { if (id === this._t && this.speaking) done(); }, 1500 + String(text).length * 140); // watchdog (Safari sometimes never fires onend)
        return true;
      } catch (e) { this.speaking = false; return false; }
    },
    stop() { this._t++; this.speaking = false; this._duck(false); try { if (this.supported) SS.cancel(); } catch (e) {} },
    _duck(on) { const A = HX.Audio; if (A.musicGain && A.ctx) { try { A.musicGain.gain.setTargetAtTime(on ? .08 : (MB.musicVol == null ? .3 : MB.musicVol), A.ctx.currentTime, .08); } catch (e) {} } }
  };
  root.addEventListener('pagehide', () => V.stop());
  document.addEventListener('visibilitychange', () => { if (document.hidden) V.stop(); });
})(window);
