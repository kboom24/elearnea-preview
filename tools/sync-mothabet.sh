#!/usr/bin/env bash
# Copy the kid-safe Mothabet source (ours) into the preview app. Never reads or writes /home/box/games.
set -euo pipefail
SRC=/home/box/elearnea/seed/mothabet-src
DST="$(cd "$(dirname "$0")/.." && pwd)/play/mothabet/game"
rm -rf "$DST"; mkdir -p "$DST/fonts"
cp "$SRC"/{index.html,hexan.js,words.js,learn.js,art.js,voice.js,social-safe.js,bridge.js,game.js,CREDITS.md,CREDITS-original.md,AUDIO-NEEDS.md} "$DST/"
cp "$SRC"/fonts/* "$DST/fonts/"
echo "synced Mothabet -> $DST"
