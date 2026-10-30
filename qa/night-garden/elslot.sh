#!/usr/bin/env bash
# Elearnea share of the box (brief: Elearnea holds at most 2 qa-slot slots in total).
# Waits until fewer than 2 of the 3 slot locks (/home/box/games/.locks/slot*) are HELD by processes whose cwd is under
# /home/box/elearnea, then runs the command through qa-slot.sh, which applies its own FIFO queue. (v1 counted queued
# waiters as well, which is stricter than the rule and kept this job permanently at the back of the line.)
# elslot.sh --wait : only wait for the Elearnea share (use before taking the shared TTS flock, so the lock is never held while queued)
held_u() { local p l; for d in /proc/[0-9]*; do case "$(readlink $d/cwd 2>/dev/null)" in /home/box/elearnea*) ;; *) continue;; esac
    for f in $d/fd/*; do l=$(readlink $f 2>/dev/null); case "$l" in /home/box/games/.locks/slot*) echo "${l##*/}";; esac; done; done 2>/dev/null | sort -u | wc -l; }
while [ "$(held_u)" -ge 2 ]; do sleep 10; done
[ "$1" = "--wait" ] && exit 0
exec /home/box/games/tools/qa-slot.sh "$@"
