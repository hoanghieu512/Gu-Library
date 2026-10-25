#!/usr/bin/env bash
# Cut an approved opening clip into what the app plays (spec 2026-10-25-mo-cua-video-design.md §6).
#
#   scripts/make-opening-video.sh <source.mp4> [default|halloween]
#
# One-off asset generator, needs ffmpeg and cwebp on the dev machine (not repo dependencies).
# Source clips are not committed; their prompts, start images and model are recorded in the ops
# doc §8.1. Each clip is cut in three parts, each sped up on its own, to about 4.2 s, and written
# with its first and last frames. Which clip plays on which day: OpeningClip.java.
set -euo pipefail

src=${1:?usage: make-opening-video.sh <source.mp4> [default|halloween]}
clip=${2:-default}
case "$clip" in
  default)
    # Grok Imagine (in Grok chat), 720 x 1280, 24 fps, 6.04 s, chosen by huynh on 25/10/2026 for
    # 1.44.1. The walk to the door 1.7x, the doors opening and the walk in 1.35x, the turn and the
    # wave 1.45x: 4.17 s.
    name=opening
    cut="[0:v]trim=start=0:end=1.15,setpts=(PTS-STARTPTS)/1.7[a];\
[0:v]trim=start=1.15:end=3.4,setpts=(PTS-STARTPTS)/1.35[b];\
[0:v]trim=start=3.4,setpts=(PTS-STARTPTS)/1.45[c]"
    ;;
  *)
    echo "unknown clip: $clip (default, halloween)" >&2
    exit 2
    ;;
esac

root=$(cd "$(dirname "$0")/.." && pwd)
res="$root/android/app/src/main/res"
out="$res/raw/$name.mp4"
first="$res/drawable-nodpi/${name}_first.webp"
last="$res/drawable-nodpi/${name}_last.webp"
mkdir -p "$res/raw" "$res/drawable-nodpi"

ffmpeg -v error -y -i "$src" -filter_complex "$cut;[a][b][c]concat=n=3:v=1:a=0,fps=30,format=yuv420p[v]" \
  -map "[v]" -c:v libx264 -profile:v main -crf 23 -preset slow -movflags +faststart -an "$out"

# First and last frames as stills: the first covers the decoder's start, the last is what the
# layer holds and fades (a still fades the same on every Android version; the video surface does not).
# ffmpeg builds often lack libwebp: take each frame as PNG, encode with cwebp (libwebp tools).
base=$(mktemp -t opening-frame)
tmp="$base.png"
trap 'rm -f "$base" "$tmp"' EXIT
ffmpeg -v error -y -i "$out" -frames:v 1 "$tmp"
cwebp -quiet -q 85 "$tmp" -o "$first"
ffmpeg -v error -y -sseof -0.3 -i "$out" -update 1 "$tmp"
cwebp -quiet -q 85 "$tmp" -o "$last"

ffprobe -v error -show_entries format=duration,size:stream=width,height,codec_name -of compact "$out"
ls -l "$first" "$last"
