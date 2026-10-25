#!/usr/bin/env bash
# Cut the approved opening clip into what the app plays (spec 2026-10-25-mo-cua-video-design.md §6).
#
#   scripts/make-opening-video.sh <source.mp4>
#
# One-off asset generator, needs ffmpeg and cwebp on the dev machine (not repo dependencies).
# Source: Higgsfield Genjutsu, 696 x 1320, 24 fps, 5.96 s, approved by Gu on 25/10/2026. The source
# clip is not committed; its prompt, reference images and model are recorded in the ops doc §8.
#
# The walk-in is sped up 1.7x, the push and the walk into the library 1.4x, the turn and the wave
# 1.1x, for about 4.2 s in all. Writes the clip and its first frame (shown while the decoder starts,
# so there is never a black frame).
set -euo pipefail

src=${1:?usage: make-opening-video.sh <source.mp4>}
root=$(cd "$(dirname "$0")/.." && pwd)
res="$root/android/app/src/main/res"
out="$res/raw/opening.mp4"
first="$res/drawable-nodpi/opening_first.webp"
mkdir -p "$res/raw" "$res/drawable-nodpi"

ffmpeg -v error -y -i "$src" -filter_complex \
  "[0:v]trim=start=0.15:end=1.6,setpts=(PTS-STARTPTS)/1.7[a];\
[0:v]trim=start=1.6:end=4.6,setpts=(PTS-STARTPTS)/1.4[b];\
[0:v]trim=start=4.6,setpts=(PTS-STARTPTS)/1.1[c];\
[a][b][c]concat=n=3:v=1:a=0,fps=30,format=yuv420p[v]" \
  -map "[v]" -c:v libx264 -profile:v main -crf 23 -preset slow -movflags +faststart -an "$out"

# ffmpeg builds often lack libwebp: take the frame as PNG, encode with cwebp (libwebp tools).
tmp=$(mktemp -t opening-first).png
ffmpeg -v error -y -i "$out" -frames:v 1 "$tmp"
cwebp -quiet -q 85 "$tmp" -o "$first"
rm -f "$tmp"

ffprobe -v error -show_entries format=duration,size:stream=width,height,codec_name -of compact "$out"
ls -l "$first"
