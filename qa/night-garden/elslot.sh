#!/usr/bin/env bash
# Elearnea share of the box: wait until fewer than 2 Elearnea heavy jobs (qa-slot.sh started from /home/box/elearnea/*) are running,
# then run the command through qa-slot.sh. A wrapper and its qa-slot child count once. Usage: elslot.sh <cmd...>
count() { local n=0 ps; ps=$(pgrep -f "games/tools/qa-slot.sh" 2>/dev/null); for p in $ps; do [ "$p" = "$$" ] && continue
    pp=$(awk '{print $4}' /proc/$p/stat 2>/dev/null); echo "$ps" | grep -qx "$pp" && continue
    c=$(readlink /proc/$p/cwd 2>/dev/null); a=$(tr '\0' ' ' < /proc/$p/cmdline 2>/dev/null)
    case "$c $a" in *"/home/box/elearnea"*) n=$((n+1));; esac; done; echo $n; }
while [ "$(count)" -ge 2 ]; do sleep 3; done
exec /home/box/games/tools/qa-slot.sh "$@"
