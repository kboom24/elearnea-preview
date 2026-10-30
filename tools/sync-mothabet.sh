#!/usr/bin/env bash
# DEPRECATED for normal use (since mothabet/integration): play/mothabet/game/ in THIS repo is the versioned Mothabet source.
# It holds Elearnea-only integration code (bridge.js lesson protocol, el-consent.js, lesson mode + QA gate in game.js,
# index.html script order) that the untracked seed copy does not have, so a blind copy would silently undo the integration.
# Port seed changes by hand (diff first). To copy anyway: MB_SYNC_FORCE=1 tools/sync-mothabet.sh. See docs/MOTHABET-INTEGRATION.md.
# Never reads or writes /home/box/games.
set -euo pipefail
SRC=/home/box/elearnea/seed/mothabet-src
DST="$(cd "$(dirname "$0")/.." && pwd)/play/mothabet/game"
if [ "${MB_SYNC_FORCE:-}" != "1" ]; then
  echo "sync-mothabet: refusing to overwrite $DST (in-repo copy is the source of truth). Differences vs the seed:" >&2
  for f in index.html hexan.js words.js learn.js art.js voice.js social-safe.js bridge.js game.js; do cmp -s "$SRC/$f" "$DST/$f" || echo "  differs: $f" >&2; done
  echo "Port changes by hand, or rerun with MB_SYNC_FORCE=1 and re-apply the integration." >&2; exit 2
fi
keep=$(mktemp -d); cp "$DST/el-consent.js" "$keep/" 2>/dev/null || true
rm -rf "$DST"; mkdir -p "$DST/fonts"
cp "$SRC"/{index.html,hexan.js,words.js,learn.js,art.js,voice.js,social-safe.js,bridge.js,game.js,CREDITS.md,CREDITS-original.md,AUDIO-NEEDS.md} "$DST/"
cp "$SRC"/fonts/* "$DST/fonts/"; cp "$keep"/* "$DST/" 2>/dev/null || true; rm -rf "$keep"
echo "synced Mothabet -> $DST (FORCED: re-check bridge.js, game.js lesson mode and the el-consent.js script tag)"
