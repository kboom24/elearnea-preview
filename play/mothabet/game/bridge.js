/* Elearnea bridge for the Mothabet frame (same-origin parent only, postMessage, no network).
   Lesson mode (?lesson=1&band=s|f&stageId=s1, or &stage=N as a fallback), used by every Reading-path lesson:
     frame -> parent  {type:'ready', lesson:true, band, stage, stageId, pool:[words]}
     parent -> frame  {type:'start', words:[...], d}   words chosen by El.Learn.pick, d = El.Learn.difficulty(skill)
     frame -> parent  {type:'word', item, correct, firstTry}   once per planned word (first attempt), recorded by El.Learn
     frame -> parent  {type:'progress', done, total}
     parent -> frame  {type:'sound', on}   Elearnea's top-bar sound button (the only sound control in lesson mode)
     frame -> parent  {type:'results', mode:'lesson', total, done, firstTry, planned, ...}   total = ATTEMPTED words only; parent calls host.end
   El.Learn is the only spaced-repetition / difficulty source in lesson mode; Mothabet's MB.recordWord/MB.adapt/pickRound are not used.
   If no parent answers (the frame opened on its own), the stage's words are picked locally so the page still plays.
   Without ?lesson=1 the old deep link (?band&stage opens that stage's goal card) still works. ?qa=1 enables window.__qa. */
(function (root) {
  'use strict';
  const q = new URLSearchParams(location.search);
  const framed = root.parent && root.parent !== root;
  function toParent(msg) { try { if (framed) root.parent.postMessage(Object.assign({ el: 1, src: 'mothabet' }, msg), location.origin); } catch (e) {} }
  const B = root.ElearneaBridge = {
    lesson: q.get('lesson') === '1',
    qa: q.get('qa') === '1',
    target: null, plan: null, // plan = {items, d} once the parent (or the local fallback) has chosen the words
    resolve(MB) {
      const band = MB.STAGES[q.get('band')] ? q.get('band') : 's', st = MB.STAGES[band];
      let stage = st.findIndex(s => s.id === q.get('stageId')); if (stage < 0) stage = parseInt(q.get('stage'), 10);
      if (!(stage >= 0 && stage < st.length)) stage = 0;
      return (B.target = { band, stage, stageId: st[stage].id });
    },
    boot(game, MB, M) {
      if (B.lesson) {
        const t = B.target || B.resolve(MB), items = MB.stageItems(t.band, t.stage);
        const local = () => { if (!B.plan) B.plan = { items: MB.pickRound(MB.data(game.save), t.band, t.stage, HX.RNG((Date.now() ^ 0x5bd1) >>> 0), 10), d: null, local: true }; };
        root.addEventListener('message', (e) => { const m = e.data; if (e.origin !== location.origin || e.source !== root.parent || !m || m.el !== 1) return;
          if (m.type === 'sound') { try { B.onSound && B.onSound(!!m.on); } catch (er) {} return; }
          if (m.type !== 'start' || B.plan) return;
          const byW = new Map(items.map(it => [it.w, it])), list = (m.words || []).map(w => byW.get(String(w))).filter(Boolean);
          if (!list.length) return local(); B.plan = { items: list, d: typeof m.d === 'number' ? Math.max(0, Math.min(1, m.d)) : null }; });
        toParent({ type: 'ready', lesson: true, band: t.band, stage: t.stage, stageId: t.stageId, pool: items.map(it => it.w) });
        setTimeout(local, framed ? 2000 : 0);
        return;
      }
      const band = q.get('band'), stage = parseInt(q.get('stage'), 10);
      if (!band || !MB.STAGES[band] || !(stage >= 0 && stage < MB.STAGES[band].length)) { toParent({ type: 'ready' }); return; }
      setTimeout(() => { try { const m = MB.data(game.save); m.set.band = band; game.save.write(); game.push('goal', { mode: 'stage', band, stage }); } catch (e) { console.warn('[Elearnea] deep link', e); } toParent({ type: 'ready', band, stage }); }, 80);
    },
    word(ev) { toParent(Object.assign({ type: 'word' }, ev)); },
    progress(done, total) { toParent({ type: 'progress', done, total }); },
    results(r) {
      const t = B.target, sid = r.mode === 'lesson' && t ? t.stageId : (r.mode === 'stage' && root.MB.STAGES[r.band][r.stage]) ? root.MB.STAGES[r.band][r.stage].id : null;
      toParent({ type: 'results', mode: r.mode, planned: r.planned | 0, band: r.band, stage: r.stage, stageId: sid, total: r.total | 0, firstTry: r.firstTry | 0,
        score: r.score | 0, words: r.done | 0, perfect: r.perfect | 0, acc: r.acc | 0, stars: r.stars | 0, hints: r.hints | 0, why: r.why });
    }
  };
})(window);
