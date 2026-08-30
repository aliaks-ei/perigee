#!/usr/bin/env bash
#
# Converts the runtime textures to KTX2/Basis (UASTC).
#
# Why: a 4096x2048 JPEG costs ~3.7 MB on the wire, a main-thread decode, and
# ~43 MB of GPU memory once mipmapped. The same image as UASTC KTX2 is ~1.2 MB,
# uploads without a decode, and holds ~5.4 MB on the GPU.
#
# Requires KTX-Software and ImageMagick:
#   brew install ktx imagemagick
#
# Run from the repository root:
#   ./scripts/textures.sh
#
# Then switch the app over by adding this to .env, and rebuild:
#   VITE_KTX2_TEXTURES=1
#
# Leave the source JPEG/WebP files in place. They stay the fallback for any
# texture that has no .ktx2 next to it, and for browsers whose GPU supports
# none of the transcode targets.

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
objects="$root/public/assets/objects"
environments="$root/public/assets/environments"

for tool in toktx magick; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "missing $tool — brew install ktx imagemagick" >&2
    exit 1
  fi
done

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

encode() {
  local source="$1"
  local target="${source%.*}.ktx2"
  local input="$source"

  # toktx reads PNG and JPEG only, so anything else goes through a temporary.
  case "$source" in
    *.webp)
      input="$work/$(basename "${source%.*}").png"
      magick "$source" "$input"
      ;;
  esac

  # Normal maps carry vectors, not colour: tagging them sRGB would bend every
  # slope through the transfer function.
  local transfer="srgb"
  case "$source" in
    *-normal.*) transfer="linear" ;;
  esac

  echo "  $(basename "$source") -> $(basename "$target") ($transfer)"
  toktx --t2 --encode uastc --uastc_quality 2 --zcmp 18 \
    --genmipmap --assign_oetf "$transfer" "$target" "$input"
}

echo "encoding object textures"
for source in "$objects"/*.jpg "$objects"/*.png "$objects"/*.webp; do
  [ -e "$source" ] || continue
  encode "$source"
done

echo "encoding environment backdrops"
for source in "$environments"/*.webp; do
  [ -e "$source" ] || continue
  encode "$source"
done

echo
echo "done. add VITE_KTX2_TEXTURES=1 to .env and rebuild."
