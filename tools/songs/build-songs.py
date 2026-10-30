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
   events=[
     dict(type='pick', word='cat', t=10.28, open=8.9, close=13.6),
     dict(type='spell', word='duck', open=13.9, letters=[20.92, 21.54, 21.86, 22.12]),
     dict(type='spell', word='cat', open=23.2, letters=[28.24, 28.68, 29.00]),
     dict(type='pick', word='frog', t=38.62, open=37.3, close=41.2),
     dict(type='spell', word='bear', open=41.3, letters=[45.46, 46.16, 46.48, 46.76]),
     dict(type='spell', word='frog', open=49.6, letters=[56.02, 56.72, 57.10, 57.32]),
     dict(type='pick', word='a', kind='letter', t=66.52, open=64.9, close=68.4),
     dict(type='spell', word='panda', open=68.6, letters=[74.84, 75.32, 75.74, 76.26, 76.54]),
     dict(type='spell', word='bear', open=78.2, letters=[84.30, 84.76, 85.14, 85.40]),
     dict(type='roll', words=['cat', 'duck', 'frog', 'bear'], times=[94.66, 95.76, 95.98, 97.10]),
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
    for e in S['events']:
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
    dur = B['dur']; beats = B['beats']
    out['songs'][sid] = {'title': S['title'], 'by': S['by'], 'src': f'assets/music/{sid}', 'dur': round(dur, 2), 'bpm': round(B['tempo'], 1), 'beats': beats, 'lines': lines, 'events': evs}
    print(sid, 'lines', len(lines), 'tokens', sum(len(l['w']) for l in lines), 'events', len(evs), 'bpm', round(B['tempo'], 1))
json.dump(out, open(os.path.join(APP, 'content/songs.json'), 'w'), separators=(',', ':'))
print(os.path.getsize(os.path.join(APP, 'content/songs.json')), 'bytes')
