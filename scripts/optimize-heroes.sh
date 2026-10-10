#!/usr/bin/env bash
# Resize post hero images and generate WebP variants for the site.
# Requires: macOS sips, cwebp (brew install webp)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
POSTS_DIR="$ROOT/static/images/posts"
AVATAR="$ROOT/static/images/avatar.jpg"
MAX_WIDTH="${MAX_WIDTH:-1400}"
TARGET_KB="${TARGET_KB:-200}"
JPEG_QUALITY="${JPEG_QUALITY:-80}"

if ! command -v sips >/dev/null 2>&1; then
  echo "sips is required (macOS)." >&2
  exit 1
fi
if ! command -v cwebp >/dev/null 2>&1; then
  echo "cwebp is required: brew install webp" >&2
  exit 1
fi

tmpdir="$(mktemp -d)"
cleanup() { rm -rf "$tmpdir"; }
trap cleanup EXIT

optimize_webp() {
  local work="$1"
  local out_webp="$2"
  local q size
  for q in 82 75 68 60 52 45; do
    cwebp -quiet -q "$q" "$work" -o "$out_webp"
    size=$(wc -c < "$out_webp" | tr -d ' ')
    if [ "$size" -le $((TARGET_KB * 1024)) ]; then
      echo "  webp: $((size / 1024)) KiB (q=$q)"
      return 0
    fi
  done
  size=$(wc -c < "$out_webp" | tr -d ' ')
  echo "  webp: $((size / 1024)) KiB (q=$q, above target ${TARGET_KB} KiB)"
}

optimize_hero() {
  local src="$1"
  local dir base ext work jpg_out
  dir="$(dirname "$src")"
  base="$dir/hero"
  ext="${src##*.}"
  work="$tmpdir/work.$$.$ext"
  cp "$src" "$work"
  sips -Z "$MAX_WIDTH" "$work" >/dev/null

  if [[ "$ext" == "png" || "$ext" == "PNG" ]]; then
    jpg_out="${base}.jpg"
    sips -s format jpeg -s formatOptions "$JPEG_QUALITY" "$work" --out "$jpg_out" >/dev/null
    work="$jpg_out"
    echo "  jpeg fallback: $(($(wc -c < "$jpg_out" | tr -d ' ') / 1024)) KiB"
  elif [[ "$ext" == "jpg" || "$ext" == "jpeg" || "$ext" == "JPG" ]]; then
    jpg_out="${base}.jpg"
    sips -s format jpeg -s formatOptions "$JPEG_QUALITY" -Z "$MAX_WIDTH" "$src" --out "$jpg_out" >/dev/null
    work="$jpg_out"
    echo "  jpeg fallback: $(($(wc -c < "$jpg_out" | tr -d ' ') / 1024)) KiB"
  else
    echo "  skip unsupported: $src" >&2
    return 1
  fi

  optimize_webp "$work" "${base}.webp"
}

optimize_avatar() {
  local max_px="${AVATAR_MAX:-256}"
  local jpg="$AVATAR"
  local work="$tmpdir/avatar.jpg"
  if [ ! -f "$jpg" ]; then
    echo "No avatar at $jpg"
    return 0
  fi
  echo "Avatar ($jpg)"
  sips -Z "$max_px" "$jpg" --out "$work" >/dev/null
  sips -s format jpeg -s formatOptions 85 "$work" --out "$jpg" >/dev/null
  optimize_webp "$jpg" "${jpg%.jpg}.webp"
  echo "  jpeg: $(($(wc -c < "$jpg" | tr -d ' ') / 1024)) KiB"
}

echo "Optimizing post heroes under $POSTS_DIR (max ${MAX_WIDTH}px, target ${TARGET_KB} KiB webp)"
while IFS= read -r -d '' hero; do
  echo "$(basename "$(dirname "$hero")")/$(basename "$hero")"
  optimize_hero "$hero"
done < <(find "$POSTS_DIR" -type f \( -name 'hero.jpg' -o -name 'hero.jpeg' -o -name 'hero.png' \) -print0)

echo ""
optimize_avatar

echo ""
echo "Done. Ensure posts use hero.jpg in front matter when converting from PNG."
