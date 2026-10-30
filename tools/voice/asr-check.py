#!/usr/bin/env python3
"""Automatic intelligibility check: transcribes each rendered clip with an offline speech recognizer (faster-whisper base.en, CPU)
and stores check.asr = {heard, score, ok} in voice/manifest.json. ok=false lines get listed for a human ear check by build-manifest.js.
Phonemes are skipped (they always need a human). Short words are judged by letter similarity because recognizers mishear isolated words.
  asr-check.py --start 0 --end 1000      (run through qa-slot.sh; ~0.35 s per clip with 2 threads)"""
import argparse, json, os, re, subprocess, sys, time, difflib
import numpy as np
from faster_whisper import WhisperModel
APP = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); MANIFEST = os.path.join(APP, 'voice', 'manifest.json')
NUM = {str(i): w for i, w in enumerate('zero one two three four five six seven eight nine ten eleven twelve'.split())}
# Homophones and recognizer habits that are not voice errors ("That says" is often transcribed "That's his").
HOMO = [('to', 'too', 'two'), ('know', 'no'), ('knew', 'new'), ('by', 'buy', 'bye'), ('be', 'bee', 'b'), ('see', 'sea', 'c'), ('an', 'n'), ('are', 'r'), ('for', 'four'), ('would', 'wood'), ('which', 'witch'),
        ('their', 'there', 'theyre'), ('right', 'write'), ('one', 'won'), ('eight', 'ate'), ('i', 'eye'), ('our', 'hour', 'are'), ('sun', 'son'), ('hi', 'high'), ('red', 'read'), ('blue', 'blew'),
        ('its', 'it s'), ('seem', 'seam'), ('made', 'maid'), ('tail', 'tale'), ('meat', 'meet'), ('sail', 'sale'), ('pair', 'pear'), ('flower', 'flour'), ('night', 'knight'), ('whole', 'hole'), ('ant', 'aunt'), ('mail', 'male'), ('not', 'knot'), ('week', 'weak'), ('plane', 'plain'), ('road', 'rode'), ('so', 'sew'), ('way', 'weigh'), ('hear', 'here'), ('wear', 'where'), ('wait', 'weight'), ('rain', 'reign'), ('peace', 'piece'), ('in', 'inn'), ('bear', 'bare'), ('dear', 'deer'), ('wood', 'would'), ('new', 'knew'), ('cent', 'sent', 'scent'), ('mothabet', 'martha bit', 'mother bet'), ('wick', 'wake')]
CANON = {}
for g in HOMO:
    for w in g: CANON.setdefault(w, g[0])
def norm(s):
    s = s.lower().replace("'", '').replace('-', ' ')
    s = re.sub(r"\bthats (his|as|us|has|a|is)\b", 'that says', s)
    s = re.sub(r"[^a-z0-9 ]", ' ', s)
    for k in ('martha bit', 'mother bet', 'it s'): s = s.replace(k, CANON.get(k, k))
    return ' '.join(CANON.get(NUM.get(w, w), NUM.get(w, w)) for w in s.split())
def load(f): return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True).stdout, np.float32)
def score(target, heard):
    t, h = norm(target), norm(heard)
    if t == h: return 1.0
    tw, hw = t.split(), h.split()
    if len(tw) <= 2:  # isolated words: letter similarity, best over the heard words
        return max([difflib.SequenceMatcher(None, t.replace(' ', ''), h.replace(' ', '')).ratio()] + [difflib.SequenceMatcher(None, tw[0], x).ratio() for x in hw])
    return difflib.SequenceMatcher(None, tw, hw).ratio()
def target_of(it):
    if it.get('ipa'): return re.sub(r'\[\[.*?\]\]', '', it['render'])
    return it['render']
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--start', type=int, default=0); ap.add_argument('--end', type=int, default=10**9); ap.add_argument('--rescore', action='store_true'); ap.add_argument('--missing', action='store_true', help='only lines without a stored check'); ap.add_argument('--flagged', action='store_true', help='re-check flagged lines with padding + beam search (fewer recognizer false alarms)'); ap.add_argument('--ids', default='', help='comma list of line ids to check (e.g. one game\'s new lines)'); a = ap.parse_args(); ids = set(filter(None, a.ids.split(',')))
    if a.rescore:  # re-judge stored transcripts (no audio work)
        man = json.load(open(MANIFEST)); n = 0
        for it in man['items']:
            r = it['check'].get('asr')
            if not r: continue
            target = target_of(it); sc = score(target, r['heard']); thr = 0.6 if len(norm(target).split()) <= 2 else 0.75
            r['score'] = round(sc, 2); r['ok'] = sc >= thr; n += not r['ok']
        json.dump(man, open(MANIFEST, 'w'), indent=1); print('rescored; flagged', n); return
    m = WhisperModel('base.en', device='cpu', compute_type='int8', cpu_threads=2)
    man = json.load(open(MANIFEST)); items = man['items'][a.start:a.end]; res = {}; t0 = time.time()
    for it in items:
        if ids and it['id'] not in ids: continue
        if a.missing and it['check'].get('asr'): continue
        if a.flagged and not (it['check'].get('asr') and not it['check']['asr']['ok']): continue
        fl = it.get('files') or []
        if it['type'] == 'phoneme' or it.get('reserved') or it.get('parts') or len(fl) != 1 or (it['source'].get('kind') == 'device-speech' and not it['source'].get('held')) or not os.path.exists(os.path.join(APP, fl[0])): continue
        au = load(os.path.join(APP, fl[0]))
        if a.flagged: au = np.concatenate([np.zeros(8000, np.float32), au, np.zeros(8000, np.float32)])
        segs, _ = m.transcribe(au, beam_size=5 if a.flagged else 1, language='en', condition_on_previous_text=False)
        heard = ' '.join(s.text.strip() for s in segs)
        target = target_of(it)
        sc = score(target, heard); thr = 0.6 if len(norm(target).split()) <= 2 else 0.75
        res[it['key']] = {'heard': heard, 'score': round(sc, 2), 'ok': sc >= thr, 'voice': it['source'].get('voice') or (it['source'].get('wouldPlay') or {}).get('voice')}
        if time.time() - t0 > 12 * 60: print('time limit; stopped early', flush=True); break
    man = json.load(open(MANIFEST))  # re-read and merge (another chunk may have written)
    for it in man['items']:
        if it['key'] in res: it['check']['asr'] = res[it['key']]
    json.dump(man, open(MANIFEST, 'w'), indent=1)
    bad = [k for k, v in res.items() if not v['ok']]; print(f'checked {len(res)}; flagged {len(bad)}', flush=True)
main()
