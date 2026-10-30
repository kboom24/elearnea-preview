/* Elearnea voice, "say, then": ElVoice.sayThen(text, opts, then, gap, sayFn) speaks a line and calls then(why) EXACTLY ONCE when it
   has really finished, so a game never moves on while Wick/Bella is still talking (praise and feedback lines are never cut off):
   - normally `gap` ms (default 300) after the line's last clip fires 'ended' (or the device voice's onend);
   - watchdog, so a round can never hang: recorded clips: the playing clip's duration / playbackRate + 1.5 s, re-armed for every clip
     of the line (9 s until its duration is known); device speech: an estimate of the spoken length + 1.5 s;
   - nothing heard (voice off, no clip and no device voice): after `gap`.
   sayFn: the say function to go through (default ElVoice.say; games pass host.say so the grown-up's voice/speed settings apply).
   Returns { heard, why, cancel() }. Loaded after voice/voice.js; it does not change ElVoice.say itself. */
(function (root) {
  'use strict';
  const V = root.ElVoice; if (!V || V.sayThen) return;
  const SLACK = 1500, GUESS = 9000, MS_PER_CHAR = 85;
  V.sayThen = function (text, o, then, gap, sayFn) {
    o = o || {}; gap = gap == null ? 300 : gap;
    let fired = false, dog = null, el = null;
    const res = { heard: false, why: null, cancel() { fired = true; off(); } };
    function off() { clearTimeout(dog); dog = null; if (el) ['loadedmetadata', 'durationchange', 'playing'].forEach(ev => el.removeEventListener(ev, arm)); }
    function fire(why) { if (fired) return; fired = true; off(); res.why = why; if (then) setTimeout(() => then(why), why === 'watchdog' ? 0 : gap); }
    function arm() { if (fired) return; clearTimeout(dog); const d = el.duration, r = el.playbackRate || 1;
      dog = setTimeout(() => fire('watchdog'), isFinite(d) && d > 0 ? Math.max(0, d - (el.currentTime || 0)) / r * 1000 + SLACK : GUESS); }
    const user = o.onend, opts = Object.assign({}, o, { onend: () => { if (user) { try { user(); } catch (e) {} } fire('ended'); } });
    res.heard = !!(sayFn || V.say.bind(V))(text, opts);
    if (fired) return res;
    if (!res.heard) { dog = setTimeout(() => fire('silent'), 250); return res; } // onend normally comes first (10 ms)
    el = V.el;
    if (el && !el.paused && el.src && el.src.indexOf('data:') !== 0) { ['loadedmetadata', 'durationchange', 'playing'].forEach(ev => el.addEventListener(ev, arm)); arm(); }
    else { const s = [].concat(text).join(' '), r = Math.max(.5, Math.min(1.3, (o.rate || .9) * (V.rate || 1)));
      dog = setTimeout(() => fire('watchdog'), s.length * MS_PER_CHAR / r + SLACK); }
    return res;
  };
})(window);
