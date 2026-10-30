// Praise / feedback cutoff probe (Hexan 2026-10-30: "it changes to the next sound before the voice is able to finish").
// init: a page init script (runs in every frame, Mothabet's included) that logs every voice clip the shared audio element plays
//   (src, start, natural 'ended', or 'cut' = paused / replaced before it ended) and every game advance (el:progress, el:end).
// check(page, manifestFile): rules, per lesson:
//   1. every PRAISE clip (manifest type "praise", plus Mothabet's word cheers mb/w_* said right after a word is finished) played to its end
//   2. no clip is still playing (or gets cut) when the game advances: at each el:progress (done > 0) / el:end, every clip that started
//      before it had already ended naturally; reports the smallest gap between a clip's end and the next advance
const fs = require('fs'), path = require('path');
const init = () => { if (window.__vp) return; const V = window.__vp = { clips: [], adv: [] };
  const P = HTMLMediaElement.prototype, play = P.play;
  P.play = function () { try { /* src, not currentSrc: currentSrc still names the previous clip until the new one loads */ const src = String(this.src || this.currentSrc || ''); const m = src.match(/\/voice\/((?:clips|mb)\/[^?#]+)\.(?:mp3|opus)/);
      const prev = this.__vpRec; if (prev && prev.end == null && prev.cut == null) prev.cut = Date.now();
      if (m) { const r = { id: m[1], t0: Date.now(), end: null, cut: null, mb: /\/mothabet\//.test(location.pathname) }; V.clips.push(r); this.__vpRec = r; } else this.__vpRec = null;
      if (!this.__vpHook) { this.__vpHook = 1;
        this.addEventListener('ended', () => { const r = this.__vpRec; if (r && r.end == null && r.cut == null) r.end = Date.now(); });
        this.addEventListener('pause', () => { const r = this.__vpRec; if (r && r.end == null && r.cut == null && !this.ended) r.cut = Date.now(); }); } } catch (e) {}
    return play.apply(this, arguments); };
  const adv = (type) => (e) => V.adv.push({ type, t: Date.now(), done: e.detail && e.detail.done });
  addEventListener('el:progress', adv('progress')); addEventListener('el:end', adv('end')); };
function praiseSet(manifestFile) { const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8')), s = new Set(), mb = new Set();
  for (const it of m.items) { const fl = (it.files || []).map(f => f.replace(/^voice\//, '').replace(/\.mp3$/, ''));
    if (it.type === 'praise') fl.forEach(f => s.add(f)); else if ((it.uses || []).some(u => /word completed/.test(u.trigger || ''))) fl.forEach(f => mb.add(f)); }
  s.mb = mb; return s; } // mb: Mothabet's word cheer; those word clips are praise only inside Mothabet (Firefly counts with the same files)
async function check(page, praise) {
  // let a line still playing (e.g. the end-card "Great job…") finish before judging it; up to 8 s
  for (let i = 0; i < 40; i++) { let live = 0; for (const f of page.frames()) { try { live += await f.evaluate(() => window.__vp ? window.__vp.clips.filter(c => c.end == null && c.cut == null).length : 0); } catch (e) {} } if (!live) break; await new Promise(r => setTimeout(r, 200)); }
  const clips = [], adv = [];
  for (const f of page.frames()) { try { const v = await f.evaluate(() => window.__vp ? { clips: window.__vp.clips, adv: window.__vp.adv } : null); if (v) { clips.push(...v.clips); adv.push(...v.adv); } } catch (e) {} }
  const advances = adv.filter(a => a.type === 'end' || a.done > 0).sort((a, b) => a.t - b.t);
  const isPr = (c) => praise.has(c.id) || (c.mb && praise.mb && praise.mb.has(c.id)); const pr = clips.filter(isPr), cutPraise = pr.filter(c => c.end == null), why = (c) => c.cut == null ? 'still playing' : `cut ${c.cut - c.t0}ms in`;
  const overlap = []; let minGap = Infinity;
  for (const a of advances) for (const c of clips) { if (c.t0 >= a.t) continue; const stop = c.end != null ? c.end : c.cut != null ? c.cut : Infinity;
    if (c.end != null && c.end <= a.t) { const nx = a.t - c.end; if (nx < 5000) minGap = Math.min(minGap, nx); continue; }
    if (stop >= a.t - 40) overlap.push(`${c.id} ${c.end == null ? (c.cut == null ? 'still playing' : `cut ${c.cut - a.t}ms after`) : `ended ${c.end - a.t}ms after`} ${a.type}${a.done != null ? ' ' + a.done : ''}`); }
  const ok = !cutPraise.length && !overlap.length && clips.length > 0; // tiny (under-2) lessons have feedback lines but no praise type
  const note = `praise=${pr.length} praiseToEnd=${pr.length - cutPraise.length}/${pr.length} clips=${clips.length} otherCut=${clips.filter(c => c.end == null && !isPr(c)).length} advances=${advances.length} cutByAdvance=${overlap.length} minEndToNext=${isFinite(minGap) ? minGap + 'ms' : '-'}`
    + (cutPraise.length ? ` CUT-PRAISE ${cutPraise.slice(0, 4).map(c => `${c.id} (${why(c)})`).join(', ')}` : '') + (overlap.length ? ` ADVANCE-OVER ${overlap.slice(0, 4).join('; ')}` : '') + (clips.length ? '' : ' NO-VOICE-HEARD');
  return { ok, note, praise: pr.length, cutPraise: cutPraise.length, overlap, minGap: isFinite(minGap) ? minGap : null }; }
module.exports = { init, praiseSet, check };
