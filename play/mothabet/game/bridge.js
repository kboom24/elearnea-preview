/* Elearnea bridge for the Mothabet copy.
   - Deep link from the realm path: ?band=s|f&stage=N opens that stage's goal card.
   - Results are sent to the Elearnea game host (same-origin parent frame only) as a mastery event. No network. */
(function (root) {
  'use strict';
  const q = new URLSearchParams(location.search);
  function toParent(msg) { try { if (root.parent && root.parent !== root) root.parent.postMessage(Object.assign({ el: 1, src: 'mothabet' }, msg), location.origin); } catch (e) {} }
  root.ElearneaBridge = {
    boot(game, MB, M) {
      const band = q.get('band'), stage = parseInt(q.get('stage'), 10);
      if (!band || !MB.STAGES[band] || !(stage >= 0 && stage < MB.STAGES[band].length)) { toParent({ type: 'ready' }); return; }
      setTimeout(() => { try { const m = MB.data(game.save); m.set.band = band; game.save.write(); game.push('goal', { mode: 'stage', band, stage }); } catch (e) { console.warn('[Elearnea] deep link', e); } toParent({ type: 'ready', band, stage }); }, 80);
    },
    results(r) {
      toParent({ type: 'results', mode: r.mode, band: r.band, stage: r.stage, stageId: (r.mode === 'stage' && root.MB.STAGES[r.band][r.stage]) ? root.MB.STAGES[r.band][r.stage].id : null,
        score: r.score | 0, words: r.done | 0, perfect: r.perfect | 0, acc: r.acc | 0, stars: r.stars | 0, hints: r.hints | 0 });
    }
  };
})(window);
