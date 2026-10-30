/* Animal and instrument sounds for the Little Lanterns games.
   - Farm/garden animals (cow duck cat dog sheep pig frog bird owl): REAL recordings, public domain (CC0 1.0) field recordings from
     Freesound, cut to < 2 s, -16 LUFS like the voice clips, shipped in assets/sfx/animals/<id>.opus|.mp3 (sources + licenses:
     assets/sfx/animals/LICENSES.md). Same-origin files, decoded once into WebAudio buffers: no third-party requests at play time.
     El.animal.load() starts the downloads (the games call it at start); until a file is decoded the synthesized sound below plays.
   - elephant, mouse, drum and the fallbacks: synthesized live with WebAudio.
   El.animal.play(id, {gain}) -> duration in seconds (0 when sound is off). El.animal.recorded(id) -> true once the recording is ready.
   Volumes are kept gentle for small ears: "loud" drum peaks at 0.42, "quiet" at 0.05. */
(function () {
  'use strict';
  const El = window.El;
  function noiseBuf(c) { if (c._nb) return c._nb; const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0); let s = 7; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; } return (c._nb = b); }
  // one voiced "syllable": oscillator -> (optional vibrato) -> band/lowpass formant -> envelope
  function voice(c, out, t, o) {
    const osc = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    osc.type = o.type || 'sawtooth'; f.type = o.ftype || 'bandpass'; f.Q.value = o.q || 2;
    (o.pitch || [[0, 200]]).forEach(([dt, v], i) => i ? osc.frequency.linearRampToValueAtTime(v, t + dt) : osc.frequency.setValueAtTime(v, t + dt));
    (o.formant || [[0, 900]]).forEach(([dt, v], i) => i ? f.frequency.linearRampToValueAtTime(v, t + dt) : f.frequency.setValueAtTime(v, t + dt));
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + o.dur + .05); }
    if (o.am) { const l = c.createOscillator(), lg = c.createGain(), ag = c.createGain(); l.type = 'square'; l.frequency.value = o.am; lg.gain.value = .5; ag.gain.value = .5; l.connect(lg); lg.connect(ag.gain); osc.connect(ag); ag.connect(f); l.start(t); l.stop(t + o.dur + .05); } else osc.connect(f);
    const a = o.att || .03, v = o.vol || .3; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.setValueAtTime(v, t + Math.max(a, o.dur - (o.rel || .12))); g.gain.exponentialRampToValueAtTime(.0008, t + o.dur);
    f.connect(g); g.connect(out); osc.start(t); osc.stop(t + o.dur + .05);
  }
  function noise(c, out, t, o) { const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = noiseBuf(c); f.type = o.ftype || 'lowpass'; f.frequency.value = o.freq || 800; f.Q.value = o.q || 1;
    g.gain.setValueAtTime(o.vol || .2, t); g.gain.exponentialRampToValueAtTime(.0008, t + o.dur); s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + o.dur + .02); }
  function thump(c, out, t, o) { const osc = c.createOscillator(), g = c.createGain(); osc.frequency.setValueAtTime(o.from || 150, t); osc.frequency.exponentialRampToValueAtTime(o.to || 50, t + o.dur);
    g.gain.setValueAtTime(o.vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + o.dur); osc.connect(g); g.connect(out); osc.start(t); osc.stop(t + o.dur + .02); }
  const S = {
    cow(c, o, t) { voice(c, o, t, { dur: 1.25, att: .12, rel: .35, vol: .5, pitch: [[0, 104], [.25, 128], [.9, 118], [1.25, 92]], formant: [[0, 320], [.35, 820], [1.25, 380]], ftype: 'lowpass', q: 4, vib: [5, 2.5] }); return 1.3; },
    duck(c, o, t) { for (let i = 0; i < 2; i++) voice(c, o, t + i * .26, { dur: .19, att: .01, rel: .06, vol: .38, pitch: [[0, 300], [.19, 250]], formant: [[0, 1350], [.19, 1050]], q: 5, am: 90 }); return .5; },
    cat(c, o, t) { voice(c, o, t, { dur: .85, att: .06, rel: .3, vol: .3, pitch: [[0, 470], [.3, 760], [.85, 430]], formant: [[0, 700], [.35, 1750], [.85, 850]], q: 3, vib: [6, 6] }); return .9; },
    dog(c, o, t) { for (let i = 0; i < 2; i++) { const s = t + i * .3; voice(c, o, s, { dur: .17, att: .008, rel: .08, vol: .5, type: 'square', pitch: [[0, 230], [.17, 140]], formant: [[0, 1100], [.17, 500]], ftype: 'lowpass', q: 2 }); noise(c, o, s, { dur: .09, vol: .18, freq: 1500 }); } return .6; },
    sheep(c, o, t) { voice(c, o, t, { dur: .95, att: .04, rel: .3, vol: .36, pitch: [[0, 330], [.2, 360], [.95, 300]], formant: [[0, 900], [.25, 1300], [.95, 1000]], q: 3, vib: [8, 22] }); return 1; },
    pig(c, o, t) { for (let i = 0; i < 2; i++) { const s = t + i * .22; voice(c, o, s, { dur: .14, att: .01, rel: .05, vol: .45, type: 'square', pitch: [[0, 150], [.14, 120]], formant: [[0, 650], [.14, 450]], ftype: 'lowpass', q: 6, am: 45 }); noise(c, o, s, { dur: .12, vol: .1, freq: 500 }); } return .45; },
    frog(c, o, t) { for (let i = 0; i < 2; i++) voice(c, o, t + i * .36, { dur: .26, att: .01, rel: .05, vol: .42, type: 'square', pitch: [[0, 110], [.26, 98]], formant: [[0, 700], [.26, 900]], q: 4, am: 34 }); return .7; },
    bird(c, o, t) { for (let i = 0; i < 3; i++) voice(c, o, t + i * .16, { dur: .1, att: .01, rel: .04, vol: .22, type: 'sine', pitch: [[0, 2300], [.1, 3900]], formant: [[0, 3000]], ftype: 'lowpass', q: .7 }); return .55; },
    owl(c, o, t) { for (let i = 0; i < 2; i++) voice(c, o, t + i * .55, { dur: .42, att: .08, rel: .2, vol: .4, type: 'sine', pitch: [[0, 390], [.42, 340]], formant: [[0, 1200]], ftype: 'lowpass', q: .7 }); return 1; },
    elephant(c, o, t) { voice(c, o, t, { dur: .9, att: .05, rel: .3, vol: .34, pitch: [[0, 420], [.25, 640], [.9, 560]], formant: [[0, 1500], [.4, 2400], [.9, 1600]], q: 2, vib: [9, 18] }); return .95; },
    mouse(c, o, t) { for (let i = 0; i < 3; i++) voice(c, o, t + i * .14, { dur: .08, att: .005, rel: .03, vol: .14, type: 'sine', pitch: [[0, 3200], [.08, 3700]], formant: [[0, 4000]], ftype: 'lowpass', q: .7 }); return .45; },
    drum(c, o, t, gain) { thump(c, o, t, { from: 160, to: 55, dur: .5, vol: .9 * gain }); noise(c, o, t, { dur: .12, vol: .35 * gain, freq: 2200 }); return .55; }
  };
  // recorded animal sounds: fetched + decoded once (an OfflineAudioContext decodes even while sound is off); Ogg Opus where the
  // browser plays it, else (or when decoding fails, e.g. Safari < 18.4) the mp3 copy
  const REC = ['cow', 'duck', 'cat', 'dog', 'sheep', 'pig', 'frog', 'bird', 'owl'], BUF = {}, P = {};
  let ext = null; const pickExt = () => { if (ext) return ext; let a = null; try { a = document.createElement('audio'); } catch (e) {}
    return (ext = a && a.canPlayType && a.canPlayType('audio/ogg; codecs="opus"') === 'probably' ? 'opus' : 'mp3'); };
  let dc = null; const dctx = () => { if (dc) return dc; const O = window.OfflineAudioContext || window.webkitOfflineAudioContext; try { dc = O ? new O(1, 1, 44100) : null; } catch (e) { dc = null; } return dc; };
  const decode = (ab) => new Promise((res, rej) => { const c = dctx(); if (!c) return rej(new Error('no audio')); try { const p = c.decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(rej); } catch (e) { rej(e); } });
  const grab = (id, e) => fetch(El.url('assets/sfx/animals/' + id + '.' + e)).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(decode);
  const load1 = (id) => P[id] || (P[id] = grab(id, pickExt()).catch(() => { if (ext !== 'opus') throw 0; ext = 'mp3'; return grab(id, 'mp3'); }).then(b => { BUF[id] = b; return b; }).catch(() => null));
  El.animal = {
    has: (id) => !!S[id] || REC.includes(id),
    recorded: (id) => !!BUF[id],
    load(ids) { return Promise.all((ids || REC).filter(id => REC.includes(id)).map(load1)); },
    // gain: 1 = normal; drum uses {gain} for loud (1) / quiet (0.12)
    play(id, o) { o = o || {}; const c = El.audio && El.audio(); if (!c || !El.animal.has(id)) return 0;
      if (BUF[id]) { const src = c.createBufferSource(), g = c.createGain(); src.buffer = BUF[id]; g.gain.value = o.gain == null ? 1 : o.gain; // -16 LUFS, like Bella's clips
        src.connect(g); g.connect(c.destination); src.start(c.currentTime + .02); return BUF[id].duration + .02; }
      if (REC.includes(id)) load1(id); if (!S[id]) return 0;
      const out = c.createGain(); out.gain.value = .85; out.connect(c.destination);
      if (id === 'drum') { out.gain.value = .47; return S.drum(c, out, c.currentTime + .02, o.gain == null ? 1 : o.gain); }
      out.gain.value = .85 * (o.gain == null ? 1 : o.gain); return S[id](c, out, c.currentTime + .02); }
  };
})();
