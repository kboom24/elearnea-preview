# Mothabet (Elearnea copy)
Copied from Mothabet 1.0.0 source (/home/box/elearnea/seed/mothabet-src, originally /home/box/games/reading-spelling, Playtoom release 1.0.0, build 3ef372baead2). The Playtoom files were never edited.
Changes in this copy only:
- social.js replaced by social-safe.js (no leaderboard, ranks, challenge links or share card/sharing).
- game.js: own save slug (elearnea-mothabet), no Playtoom splash/badge, no rank/Share UI, no incoming challenge links, Elearnea bridge (deep link + results to the host frame).
- voice.js: a thin wrapper over Elearnea's shared voice module (../../../voice/voice.js), which plays pre-generated clips
  (Kokoro-82M by hexgrad, Apache-2.0, voice af_bella; mapped from the Mothabet voice-script CSV) and falls back to on-device
  speech voices only (network voices are skipped so no text leaves the device).
- game.js: results lines changed to "Wonderful! You caught all your words!" / "Great job! You caught some words!" to match the recorded clips.
- index.html: no Playtoom brand block; local fonts only; noindex, nofollow.
- hexan.js: byte-identical copy of the engine (unmodified).
Original credits: see CREDITS-original.md. Audio upgrade plan: AUDIO-NEEDS.md.
