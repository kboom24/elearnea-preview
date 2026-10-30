#!/usr/bin/env python3
"""Render the Elearnea-owned voice lines (Wick/landing/map/realm, results card, Lily Pad Hop, Firefly Count) from the manifest.

The manifest (app/voice/manifest.json) is the single source of truth. build-manifest.js writes
/home/box/elearnea/voice/elearnea-lines.csv (filename,text; the file names are the stable line ids). This script renders the lines
that are missing (or all with --all) with the chosen provider into app/voice/clips/ as <id>.mp3 + <id>.opus, then rebuilds the manifest.
Mothabet lines are NOT rendered here: they come from the separate Mothabet Bella batch (tools/voice/import-mothabet.js).

  regen.py                                  # provider kokoro (af_bella) via /home/box/elearnea/voice/tools/say.py, missing lines only
  regen.py --all                            # re-render every line (e.g. after a provider/voice change)
  regen.py --ids el.coming-soon,lily.find-the

Swapping provider: write an adapter like Kokoro below (input: a CSV filename,text + output dir; output: normalized mp3+opus per row),
register it in PROVIDERS, set manifest "voice" in build-manifest.js, then run with --all. Paid/cloud providers need Hexan's approval.
Run through /home/box/games/tools/qa-slot.sh (box load rules: niced, max 4 threads, jobs under 15 min; --chunk keeps batches small).
"""
import argparse, csv, json, os, shutil, subprocess, sys, tempfile, time

APP = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MANIFEST = os.path.join(APP, 'voice', 'manifest.json')
OUTDIR = os.path.join(APP, 'voice', 'clips')
VOICE_TOOLS = '/home/box/elearnea/voice/tools'


class Kokoro:
    """Kokoro-82M (Apache-2.0), voice af_bella, through the shared generator say.py (see /home/box/elearnea/voice/VOICE-GUIDE.md)."""
    name = 'kokoro'
    stage = '/home/box/elearnea/voice/elearnea/bella'   # say.py writes <stage>/mp3/<f>.mp3 and <stage>/opus/<f>.opus
    def __init__(self, cmd, threads=2):
        py = os.path.join(VOICE_TOOLS, 'venv', 'bin', 'python')
        self.cmd = cmd or f'nice -n 10 {py} {VOICE_TOOLS}/say.py {{csv}} {{out}} --voice af_bella --threads {threads}'
        if not cmd and not os.path.exists(os.path.join(VOICE_TOOLS, 'say.py')):
            sys.exit('say.py not found yet in ' + VOICE_TOOLS + ' (or pass --cmd "... {csv} ... {out}")')
    def render(self, csv_path, out_dir, names):
        os.makedirs(self.stage, exist_ok=True)
        subprocess.run(self.cmd.format(csv=csv_path, out=self.stage), shell=True, check=True)
        for n in names:  # copy into app/voice/clips/<id>.mp3 + .opus
            stem = n[:-4]
            for ext in ('mp3', 'opus'):
                src = os.path.join(self.stage, ext, f'{stem}.{ext}')
                if os.path.exists(src): shutil.copyfile(src, os.path.join(out_dir, f'{stem}.{ext}'))


PROVIDERS = {'kokoro': Kokoro}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--provider', default='kokoro', choices=sorted(PROVIDERS))
    ap.add_argument('--cmd', default='', help='override the generator command; {csv} and {out} are substituted')
    ap.add_argument('--all', action='store_true'); ap.add_argument('--ids', default='')
    ap.add_argument('--chunk', type=int, default=80, help='lines per generator call')
    ap.add_argument('--threads', type=int, default=2, help='generator threads (box rule: max 4; 2 while other batches run)')
    ap.add_argument('--max-minutes', type=float, default=11, help='stop between chunks after this long (box jobs must stay under 15 min); re-run to continue')
    a = ap.parse_args()
    m = json.load(open(MANIFEST)); ids = set(filter(None, a.ids.split(',')))
    rows = []
    for it in m['items']:
        if it.get('parts') is not None or it['uses'][0]['game'] == 'mothabet' or it.get('reserved'): continue
        if ids and it['id'] not in ids: continue
        f = it['files'][0]; have = all(os.path.exists(os.path.join(APP, f[:-4] + '.' + e)) for e in ('mp3', 'opus'))
        if have and not a.all and not ids: continue
        rows.append((os.path.basename(f), it['render']))
    print(f'{len(rows)} lines to render with {a.provider}', flush=True)
    prov = PROVIDERS[a.provider](a.cmd, a.threads); os.makedirs(OUTDIR, exist_ok=True); t0 = time.time()
    for i in range(0, len(rows), a.chunk):
        if time.time() - t0 > a.max_minutes * 60:
            print('time limit reached; re-run to continue', flush=True); break
        with tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False, newline='') as t:
            w = csv.writer(t); w.writerow(['filename', 'text']); w.writerows(rows[i:i + a.chunk])
        prov.render(t.name, OUTDIR, [r[0] for r in rows[i:i + a.chunk]]); os.unlink(t.name)
        print(f'  {min(i + a.chunk, len(rows))}/{len(rows)} ({time.time() - t0:.0f}s)', flush=True)
    subprocess.run(['node', os.path.join(APP, 'tools', 'voice', 'build-manifest.js')], check=True)


if __name__ == '__main__':
    main()
