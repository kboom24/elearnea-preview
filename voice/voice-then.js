/* Elearnea voice, "say, then": ElVoice.sayThen(text, opts, then, gap, sayFn) speaks a line and calls then() EXACTLY ONCE, `gap` ms
   (default 300) after the line has finished, so a game never moves on while Wick/Bella is still talking (praise is never cut off).
   It builds on ElVoice's onend contract (voice/voice.js): onend fires exactly once per say(), on the natural end, a playback error,
   an interruption (stop() or a newer say()) or the clip watchdog (clip duration / playbackRate + 1.5 s); with nothing to hear
   (voice off, no clip and no device voice) it fires after 10 ms. So there is no second watchdog here.
   Because an INTERRUPTED line also calls back, callers guard their advance with their own run token / "praising" flag (the games
   never start another line over praise, and a tap during praise is ignored), and cancel() turns a pending then() into a no-op.
   sayFn: the say function to go through (default ElVoice.say; games pass host.say so the grown-up's voice/speed settings apply).
   Returns { heard, cancel() }. Loaded after voice/voice.js. */
(function (root) {
  'use strict';
  const V = root.ElVoice; if (!V || V.sayThen) return;
  V.sayThen = function (text, o, then, gap, sayFn) {
    o = o || {}; gap = gap == null ? 300 : gap; let fired = false, cancelled = false;
    const user = o.onend, opts = Object.assign({}, o, { onend: () => { if (fired) return; fired = true; if (user) { try { user(); } catch (e) {} }
      if (then) setTimeout(() => { if (!cancelled) then(); }, gap); } });
    const heard = !!(sayFn || V.say.bind(V))(text, opts);
    return { heard, cancel() { cancelled = true; } };
  };
})(window);
