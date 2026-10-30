#!/usr/bin/env python3
"""Build content/songs.json from the local speech-to-text word timings (faster-whisper small.en, word_timestamps) and the beat grid (librosa).
Inputs (box only, not shipped): /home/box/elearnea/music/suno/work/<song>.words.json, <song>.beats.json.
Hand fixes below correct words the recogniser misheard, split lines, hide uncertain lines, and place the game's moments (events).
Re-run: /home/box/elearnea/music/venv/bin/python tools/songs/build-songs.py"""
import json, re, os
snapped = 0
W = '/home/box/elearnea/music/suno/work'
APP = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

SONGS = {
 'read-it-sing-it': dict(title='Read It, Sing It!', by='Hexan (made with Suno)',
   # (time of the token, new text) ; new text '' drops the token; '+' joins it to the previous token
   fix={56.22: '', 65.58: 'can', 15.16: 'cat', 80.08: 'ta-da', 80.56: None},
   merge_next={},
   breaks=[5.02, 10.28, 13.76, 17.42, 20.92, 24.32, 28.24, 31.42, 35.12, 38.62, 41.70, 45.46, 48.82, 52.60, 56.02, 59.58, 63.24, 66.52, 70.14, 71.94, 74.26, 76.92, 80.56, 84.30, 87.68, 91.18, 94.66, 98.24],
   hide=[],
   # Hexan's official lyric sheet (2026-10-30): the shown text comes from it; the timings stay the recogniser's (aligned word by word)
   lyrics='/home/box/elearnea/music/suno/lyrics/read-it-sing-it.txt',
   # the WHOLE song is one moment after another (no dead stretch): (type, anchor, extra). Anchors are (line, word) in the OFFICIAL lyrics;
   # open = anchor - lead (or the previous moment's close), close = the next moment's open. Scheduled by plan() below.
   plan=[
     ('track', (0, 0), dict(line=0, theme='star')),                      # Ready, little readers? Point and sing!  (point = follow the words)
     ('track', (1, 0), dict(line=1, theme='bubble')),                    # Here comes the zoo with a wordy thing!
     ('pick', (2, 0), dict(word='cat', deco=dict(pic='hat', at=(2, 3)))), # Cat has a hat: tap the cat; the hat lands on her (cat / hat rhyme)
     ('read', (3, 2), dict(word='cat')),                                 # She reads "CAT": read the word, tap its picture
     ('pick', (4, 0), dict(word='duck', sfx='duck')),                    # Duck says "QUACK!"
     ('spell', (5, 0), dict(word='duck', letters=[(5, 0), (5, 1), (5, 2), (5, 3)])),
     ('track', (6, 0), dict(line=6, theme='balloon')),                   # chorus: call and response, tap each word as it's sung
     ('spell', (7, 0), dict(word='cat', letters=[(7, 0), (7, 1), (7, 2)])),
     ('track', (8, 0), dict(line=8, theme='balloon')),
     ('track', (9, 0), dict(line=9, theme='bubble')),
     ('pick', (10, 0), dict(word='frog', deco=dict(pic='log', at=(10, 3)))),  # Frog finds a log (frog / log rhyme)
     ('read', (11, 2), dict(word='frog')),                               # He reads "FROG"
     ('spell', (12, 0), dict(word='bear', letters=[(12, 0), (12, 1), (12, 2), (12, 3)])),
     ('pick', (13, 3), dict(word='book')),                               # ... wears his book like a cinnamon bun
     ('track', (14, 0), dict(line=14, theme='balloon')),
     ('spell', (15, 0), dict(word='frog', letters=[(15, 0), (15, 1), (15, 2), (15, 3)])),
     ('track', (16, 0), dict(line=16, theme='balloon')),
     ('track', (17, 0), dict(line=17, theme='bubble')),
     ('sound', (18, 0), dict(items=[dict(l='a', at=(18, 0), snd=(18, 2)), dict(l='b', at=(18, 4), snd=(18, 6))])),  # A says "ah!", B says "buh!"
     ('flip', (19, 0), dict(words=[dict(w='owl', at=(19, 0)), dict(w='who', at=(19, 4))])),  # Owl reads upside down: flip the words
     ('spell', (20, 2), dict(word='panda', letters=[(20, 2), (20, 3), (20, 4), (20, 5), (20, 6)], sneeze=(21, 4))),  # then "Achoo!": catch the letters
     ('spell', (23, 0), dict(word='bear', letters=[(23, 0), (23, 1), (23, 2), (23, 3)])),  # (final chorus line 1 plays during the panda catch)
     ('track', (24, 0), dict(line=24, theme='balloon')),
     ('track', (25, 0), dict(line=25, theme='star')),                    # You read the words, give a cheer!
     ('roll', (26, 0), dict(words=['cat', 'duck', 'frog', 'bear'], at=[(26, 0), (26, 1), (26, 2), (26, 3)])),  # outro roll call: tap each as it's sung
     ('track', (27, 0), dict(line=27, theme='star')),                    # We read together every day!
     ('stars', None, dict()),                                            # music outro: catch the word stars you collected
   ]),
 'read-it': dict(title='Read It', by='Hexan (made with Suno)',
   fix={11.32: 'go', 138.04: 'U', 138.34: 'N', 62.72: 'duck!', 63.52: 'S', 63.88: 'mouse!', 77.32: 'bear', 94.92: 'P', 94.72: 'bear!', 95.74: 'pear!', 118.50: 'sock',
        132.90: 'M says', 132.78: None, 141.04: 'it,', 158.86: 'wing', 164.08: 'read', 171.56: '', 172.46: '', 170.88: 'cat!', 172.10: 'dog!', 203.00: '', 151.72: None,
        127.90: None, 133.10: 'mmm,'},
   breaks=[2.00, 4.52, 6.78, 9.18, 11.72, 14.42, 16.70, 19.10, 21.82, 24.84, 27.04, 29.50, 32.20, 34.22, 36.72, 38.96, 43.84, 46.36, 48.80, 51.16, 53.62, 56.94, 59.10, 61.62, 64.12, 66.34, 68.78, 71.00,
           75.94, 78.46, 80.88, 83.18, 85.52, 88.90, 91.16, 93.82, 96.00, 98.34, 100.94, 103.04, 107.90, 110.50, 113.08, 114.28, 116.62, 120.90, 122.84, 125.28, 132.30, 135.00, 137.56, 139.92, 142.26, 144.84, 146.16,
           147.30, 149.38, 152.88, 154.42, 156.78, 157.58, 159.10, 160.00, 162.48, 165.54, 167.66, 170.06, 172.74, 175.02, 177.22, 179.60, 181.90, 184.36, 189.10, 193.82, 196.24, 198.78, 200.96],
   # lines the recogniser was unsure about (bridge at 1:57-2:12 and a shout): shown as music notes, not as words
   hide=[(116.62, 120.90), (125.28, 132.30), (151.72, 152.40), (156.78, 157.06)],
   events=[
     dict(type='pick', word='cat', t=11.72, open=10.4, close=14.0),
     dict(type='pick', word='red', t=14.42, open=14.1, close=16.6, kind='color'),
     dict(type='spell', word='cat', open=16.8, letters=[21.82, 22.28, 22.56]),
     dict(type='spell', word='dot', open=24.9, letters=[31.02, 31.16, 31.30]),
     dict(type='pick', word='duck', t=43.84, open=42.4, close=46.6),
     dict(type='pick', word='book', t=48.80, open=46.7, close=51.0),
     dict(type='pick', word='mouse', t=52.28, open=51.1, close=54.3),
     dict(type='spell', word='duck', open=54.5, letters=[61.62, 62.04, 62.14, 62.38]),
     dict(type='pick', word='bear', t=75.94, open=74.6, close=78.3),
     dict(type='pick', word='pear', t=78.46, open=78.4, close=80.9),
     dict(type='spell', word='bear', open=86.0, letters=[93.82, 94.10, 94.26, 94.44]),
     dict(type='pick', word='fox', t=107.90, open=106.5, close=110.4),
     dict(type='pick', word='six', t=110.50, open=110.5, close=113.0, kind='number'),
     dict(type='pick', word='blue', t=113.86, open=113.1, close=116.2, kind='color'),
     dict(type='spell', word='sun', open=132.4, letters=[137.56, 138.04, 138.34]),
     dict(type='spell', word='map', open=139.9, letters=[146.16, 146.32, 146.40]),
     dict(type='pick', word='pig', t=162.48, open=161.0, close=164.9),
     dict(type='spell', word='dog', open=165.2, letters=[171.26, 171.80, 171.92]),
     dict(type='roll', words=['cat', 'duck', 'bear', 'fox', 'owl'], times=[198.78, 199.12, 199.48, 200.26, 200.58]),
   ]),
}

def clean(w):
    return w.strip()


def nrm(w): return re.sub(r'[^a-z]', '', w.lower())

def official(lines, path, sid):
    """Show Hexan's official lyric text with the recogniser's timings: align the two word lists (difflib), copy each matched word's
    times; words that differ ("the" -> "a", "who" -> "Whooo") take the time of the word they replace; extra words are spread evenly
    between their neighbours. Spelled letters ("D-U-C-K!") become one token per letter, like the song sings them."""
    import difflib
    off = []  # [display, line index, section]
    sec = ''; li = -1
    for raw in open(path, encoding='utf-8').read().splitlines():
        raw = raw.strip()
        if not raw: continue
        m = re.match(r'^\[(.+)\]$', raw)
        if m: sec = m.group(1); continue
        li += 1
        raw = raw.replace('\u2014', '\u2014 ')
        for tok in raw.split():
            parts = tok.split('-')
            if len(parts) > 1 and all(nrm(p) for p in parts):
                for k, p in enumerate(parts): off.append([p + ('-' if k < len(parts) - 1 else ''), li, sec])
            else: off.append([tok, li, sec])
    stt = [w for l in lines if not l.get('notes') for w in l['w']]
    a = [nrm(w[0]) for w in stt]; b = [nrm(o[0]) for o in off]
    tm = [None] * len(off)
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op == 'equal' or (op == 'replace' and i2 - i1 == j2 - j1):
            for k in range(j2 - j1): tm[j1 + k] = stt[i1 + k][1:3]
    matched = sum(1 for x in tm if x)
    for j in range(len(off)):  # fill the gaps evenly between known neighbours
        if tm[j]: continue
        p = j - 1; n = j + 1
        while n < len(off) and not tm[n]: n += 1
        t0 = tm[p][1] if p >= 0 else 0.0; t1 = tm[n][0] if n < len(off) else t0 + 1.0
        k = n - p; tm[j] = [round(t0 + (t1 - t0) * (j - p) / k, 3), round(t0 + (t1 - t0) * (j - p + 1) / k - .02, 3)]
    out_lines = []
    for j, (txt, li, sec) in enumerate(off):
        if not out_lines or out_lines[-1]['_i'] != li: out_lines.append({'_i': li, 'sec': sec, 'w': []})
        out_lines[-1]['w'].append([txt, tm[j][0], max(tm[j][1], round(tm[j][0] + .08, 3))])
    for l in out_lines:
        del l['_i']; l['t'] = l['w'][0][1]; l['e'] = l['w'][-1][2]
    print(sid, 'official lyrics:', len(out_lines), 'lines,', len(off), 'words,', matched, 'matched to the recogniser word for word')
    return out_lines

LEAD = {'track': .35, 'pick': 1.5, 'read': 1.5, 'spell': 1.4, 'sound': .3, 'flip': .45, 'roll': .7}

def plan(P, lines, dur, sid):
    """One moment after another for the whole song: each opens `lead` before its anchor (or when the previous one may end), and
    closes when the next one opens, so there is never a stretch with nothing to do."""
    T = lambda r: lines[r[0]]['w'][r[1]][1]
    evs = []
    for typ, anc, x in P:
        e = {'type': typ}
        if typ == 'track':
            l = lines[x['line']]; e.update(words=[w[:] for w in l['w']], theme=x.get('theme', 'bubble'), t=l['t']); mn = l['w'][-1][1] + .3
        elif typ in ('pick', 'read'):
            e.update(word=x['word'], t=T(anc)); mn = e['t'] + 1.3
            if x.get('deco'): e['deco'] = {'pic': x['deco']['pic'], 't': T(x['deco']['at'])}; mn = max(mn, e['deco']['t'] + 1.0)
            if x.get('sfx'): e['sfx'] = x['sfx']
        elif typ == 'spell':
            e.update(word=x['word'], letters=[T(r) for r in x['letters']]); e['t'] = e['letters'][0]; mn = e['letters'][-1] + .9
            assert len(e['letters']) == len(e['word']), e
            if x.get('sneeze'): e['sneeze'] = T(x['sneeze']); mn = e['sneeze'] + 3.4
        elif typ == 'sound':
            e['items'] = [{'l': it['l'], 't': T(it['at']), 'snd': T(it['snd'])} for it in x['items']]; e['t'] = e['items'][0]['t']; mn = e['items'][-1]['snd'] + .9
        elif typ == 'flip':
            e['words'] = [{'w': it['w'], 't': T(it['at'])} for it in x['words']]; e['t'] = e['words'][0]['t']; mn = e['words'][-1]['t'] + 1.3
        elif typ == 'roll':
            e.update(words=x['words'], times=[T(r) for r in x['at']]); e['t'] = e['times'][0]; mn = e['times'][-1] + .9
        elif typ == 'stars':
            e['t'] = None; mn = dur
        want = (e['t'] - LEAD[typ]) if e['t'] is not None else 0
        e['open'] = round(max(.3, want, evs[-1]['_mn'] if evs else 0), 3)
        if evs: evs[-1]['close'] = e['open']
        if e['t'] is not None and e['open'] > e['t'] - .2: print('  NOTE', sid, typ, e.get('word') or '', 'opens only', round(e['t'] - e['open'], 2), 's before its cue')
        e['_mn'] = mn; evs.append(e)
    evs[-1]['close'] = round(dur + 5, 2)
    for e in evs:
        del e['_mn']
        if e['t'] is None: del e['t']
    gaps = [round(b['open'] - a['close'], 3) for a, b in zip(evs, evs[1:])]
    assert all(abs(g) < 1e-6 for g in gaps), gaps
    print(sid, 'plan:', len(evs), 'moments back to back from', evs[0]['open'], 's to the end; longest', max(round(e['close'] - e['open'], 1) for e in evs[:-1]), 's')
    return evs

def fill_gaps(evs, lines, dur, sid):
    """Songs with hand-placed moments: every stretch longer than 2 s between moments gets "track" moments (tap each word as it is
    sung) for the lyric lines inside it, and a "beat" moment (tap the drum on the beat) where there are no words (music-note lines)."""
    main = [e for e in evs if e['type'] != 'roll']; rest = [e for e in evs if e['type'] == 'roll']
    bounds = [(0.0, main[0]['open'])] + [(a['close'], b['open']) for a, b in zip(main, main[1:])] + [(main[-1]['close'], dur)]
    add = []
    for gs, ge in bounds:
        if ge - gs < 2.0: continue
        ls = [l for l in lines if not l.get('notes') and l['w'] and l['t'] - .35 >= gs - 1e-6 and l['w'][-1][1] <= ge - .2]
        cur = gs; segs = []
        for l in ls:
            o = round(max(cur, l['t'] - .35), 3)
            if o - cur >= 2.5: segs.append({'type': 'beat', 'open': round(cur, 3), 'close': o})
            elif segs and segs[-1]['type'] == 'track': segs[-1]['close'] = o
            elif o > cur and not segs: o = round(cur, 3)
            segs.append({'type': 'track', 'words': [w[:] for w in l['w']], 'theme': 'bubble', 't': l['t'], 'open': o, 'close': None}); cur = o
            if segs[-1]['type'] == 'track': cur = max(cur, l['w'][-1][1] + .3)
        if segs and segs[-1]['close'] is None: segs[-1]['close'] = round(min(ge, max(cur, segs[-1]['words'][-1][2] + .4)), 3); cur = segs[-1]['close']
        for k in range(len(segs) - 1):
            if segs[k]['close'] is None: segs[k]['close'] = segs[k + 1]['open']
        if ge - cur >= 2.5: segs.append({'type': 'beat', 'open': round(cur, 3), 'close': round(ge if ge < dur else dur + 5, 3)})
        elif segs: segs[-1]['close'] = round(ge if ge < dur else dur + 5, 3)
        add += segs
    allm = sorted(main + add, key=lambda e: e['open'])
    for a, b in zip(allm, allm[1:]): assert a['close'] <= b['open'] + 1e-6, (sid, a, b)
    longest = max([b['open'] - a['close'] for a, b in zip(allm, allm[1:])] + [allm[0]['open']])
    print(sid, 'filled', len(add), 'gaps (', sum(1 for e in add if e['type'] == 'track'), 'track,', sum(1 for e in add if e['type'] == 'beat'), 'beat ); longest stretch with nothing to do', round(longest, 2), 's')
    return allm + rest

out = {'v': 1, 'note': 'Lyric timings: local speech-to-text (faster-whisper small.en word timestamps) + hand fixes in tools/songs/build-songs.py; beats: librosa beat_track. Songs by Hexan, made with Suno (commercial rights unconfirmed: noindex preview only).', 'songs': {}}
for sid, S in SONGS.items():
    segs = json.load(open(f'{W}/{sid}.words.json')); B = json.load(open(f'{W}/{sid}.beats.json'))
    toks = []
    for s in segs:
        for w in s['words']:
            t = round(w['s'], 2); txt = clean(w['w'])
            if t in S['fix']:
                v = S['fix'][t]
                if v is None: txt = txt  # keep as is (explicit no-op / hidden by range)
                elif v == '': continue
                else: txt = v
            # letters sung one by one come as "D", "-U", "-C": keep each letter as its own token
            txt = txt.lstrip('-')
            if not txt: continue
            if toks and toks[-1][0] == txt and toks[-1][1] == round(w['s'], 2): continue
            toks.append([txt, round(w['s'], 2), round(w['e'], 2), round(w['s'], 2)])  # [text, start, end, start before snapping]
    toks.sort(key=lambda x: x[1])
    # sung syllables land on the music's grid: snap each word start to the nearest 16th note of the detected beat grid when it is
    # within 60 ms (the recogniser's word times wobble by ~0.1 s; two models agreed to a median of 80-100 ms)
    bt = B['beats']; grid = [a + (b - a) * q / 4 for a, b in zip(bt, bt[1:]) for q in range(4)] + bt[-1:]
    import bisect; snapped = 0
    def snap(t):
        global snapped
        i = bisect.bisect_left(grid, t); c = [g for g in grid[max(0, i - 1):i + 1]]
        g = min(c, key=lambda g: abs(g - t)) if c else t
        return (round(g, 3), True) if abs(g - t) <= .06 else (t, False)
    for k in toks:
        t2, ok = snap(k[1]); k[1] = t2; snapped += ok; k[2] = max(k[2], round(t2 + .08, 3))
    snapmap = {}
    for e in S.get('events', []):
        if e['type'] == 'spell':
            out_l = []
            for x in e['letters']:
                y = snap(x)[0]; out_l.append(y if not out_l or y > out_l[-1] + .05 else x)  # never two letters on one grid point
            e['letters'] = out_l
        elif e.get('t'): e['t'] = snap(e['t'])[0]
    print(sid, 'snapped', snapped, 'of', len(toks), 'word starts to the 16th-note grid')
    hidden = lambda t: any(a - 1e-6 <= t < b - 1e-6 for a, b in S['hide'])
    br = S['breaks']; lines = []
    for k in toks:
        if hidden(k[3]): continue
        idx = max([i for i, b in enumerate(br) if b <= k[3] + 1e-6] or [-1])
        if not lines or lines[-1]['_i'] != idx: lines.append({'_i': idx, 'w': []})
        lines[-1]['w'].append(k)
    for l in lines:
        del l['_i']; l['w'] = [w[:3] for w in l['w']]; l['t'] = l['w'][0][1]; l['e'] = l['w'][-1][2]
        # capitalise the first word of a line
        l['w'][0][0] = l['w'][0][0][:1].upper() + l['w'][0][0][1:]
    # music-note lines for hidden stretches
    for a, b in S['hide']: lines.append({'t': a, 'e': b, 'w': [], 'notes': True})
    lines.sort(key=lambda l: l['t'])
    dur = B['dur']; beats = B['beats']
    if S.get('lyrics'): lines = official(lines, S['lyrics'], sid)
    if S.get('plan'):
        evs = plan(S['plan'], lines, dur, sid)
        out['songs'][sid] = {'title': S['title'], 'by': S['by'], 'src': f'assets/music/{sid}', 'dur': round(dur, 2), 'bpm': round(B['tempo'], 1), 'beats': beats, 'lines': lines, 'events': evs}
        print(sid, 'lines', len(lines), 'tokens', sum(len(l['w']) for l in lines), 'moments', len(evs), 'bpm', round(B['tempo'], 1)); continue
    evs = []
    for e in S['events']:
        e = dict(e)
        if e['type'] == 'spell':
            e['t'] = e['letters'][0]; e['close'] = round(e['letters'][-1] + 2.2, 2)
            assert len(e['letters']) == len(e['word']), e
        evs.append(e)
    for a, b in zip(evs, evs[1:]):
        if a['type'] == 'roll' or b['type'] == 'roll': continue
        if a['type'] == 'spell': a['close'] = round(min(a['close'], b['open'] - .1), 2); assert a['close'] >= a['letters'][-1] + .8, (sid, a)
        assert a['close'] <= b['open'] + 1e-6, (sid, a, b)
        if b['type'] == 'spell': assert b['letters'][0] - b['open'] >= 3, (sid, b)
    evs = fill_gaps(evs, lines, dur, sid)
    out['songs'][sid] = {'title': S['title'], 'by': S['by'], 'src': f'assets/music/{sid}', 'dur': round(dur, 2), 'bpm': round(B['tempo'], 1), 'beats': beats, 'lines': lines, 'events': evs}
    print(sid, 'lines', len(lines), 'tokens', sum(len(l['w']) for l in lines), 'events', len(evs), 'bpm', round(B['tempo'], 1))
json.dump(out, open(os.path.join(APP, 'content/songs.json'), 'w'), separators=(',', ':'))
print(os.path.getsize(os.path.join(APP, 'content/songs.json')), 'bytes')
