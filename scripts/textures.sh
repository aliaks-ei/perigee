#!/usr/bin/env bash
#
# Converts the runtime textures to KTX2/Basis (UASTC).
#
# Why: a 4096x2048 JPEG costs a main-thread decode and ~43 MB of GPU memory
# once mipmapped. The same map as KTX2 uploads without a decode, carries its
# mipmaps, and holds 5-11 MB on the GPU.
#
# Two codecs, chosen per map. ETC1S is about a quarter the size of UASTC but
# bands on smooth gradients, so the gas giants, whose whole surface is soft
# banding, take UASTC with rate-distortion optimisation (3-4 MB for a 4K map).
# The Moon and Mars are nothing but noise, where ETC1S is indistinguishable,
# and they were the largest files, so they take ETC1S at full quality. Normal
# maps carry vectors and stay on UASTC, where the error is smallest.
#
# An optional argument limits the run to files whose name contains it:
#   ./scripts/textures.sh moon
#
# Only the object maps are converted. The backdrops are 200 kB WebP plates
# viewed head-on, and as KTX2 they would cost 5 MB each on the wire for a
# memory saving the tier-aware prefetch already keeps in hand.
#
# Requires the Basis Universal encoder and ImageMagick:
#   brew install basis_universal imagemagick
#
# Run from the repository root:
#   ./scripts/textures.sh
#
# The app loads the .ktx2 files whenever VITE_KTX2_TEXTURES is 1, which is the
# opt-in mode (see nuxt.config.ts and .env.example). Leave the source JPEG/WebP
# files in place. They stay the fallback for any texture that has no .ktx2 next
# to it, and for browsers whose GPU supports none of the transcode targets.
#
# Orientation: the files are written top row first, as the source images are.
# three loads them with `flipY` off and the materials flip once when they
# sample, which is the same convention the ImageBitmap path uses.

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
objects="$root/public/assets/objects"

for tool in basisu magick; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "missing $tool — brew install basis_universal imagemagick" >&2
    exit 1
  fi
done

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

encode() {
  local source="$1"
  local target="${source%.*}.ktx2"
  local input="$source"

  # basisu reads PNG and JPEG, so anything else goes through a temporary.
  case "$source" in
    *.webp)
      input="$work/$(basename "${source%.*}").png"
      magick "$source" "$input"
      ;;
  esac

  # Normal maps carry vectors, not colour: filtering them through the sRGB
  # transfer function would bend every slope.
  local -a transfer=(-srgb -mip_srgb)
  local label="srgb"
  case "$source" in
    *-normal.*)
      transfer=(-linear -mip_linear)
      label="linear"
      ;;
  esac

  # ETC1S for the noisy rocky albedos, UASTC for everything else.
  local -a codec=(-uastc -uastc_level 2 -uastc_rdo_l 3.0 -ktx2_zstandard_level 18)
  local codecLabel="uastc"
  case "$(basename "$source")" in
    moon.*|moon-2k.*|mars.*|mars-2k.*)
      codec=(-q 255 -comp_level 4)
      codecLabel="etc1s"
      ;;
  esac

  echo "  $(basename "$source") -> $(basename "$target") ($label, $codecLabel)"
  basisu "${codec[@]}" -mipmap "${transfer[@]}" \
    -file "$input" -output_file "$target" >/dev/null
}

filter="${1:-}"


echo "encoding object textures"
for source in "$objects"/*.jpg "$objects"/*.png "$objects"/*.webp; do
  [ -e "$source" ] || continue
  if [ -n "$filter" ] && [[ "$(basename "$source")" != *"$filter"* ]]; then continue; fi
  encode "$source"
done

echo
echo "done. set VITE_KTX2_TEXTURES=1 before building to load these files."
