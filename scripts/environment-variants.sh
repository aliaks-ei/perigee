#!/bin/sh
# Same crop and grade as the delivered master; dimensions are not native detail.
set -eu
for view in rooftop hilltop lakeside; do
  magick "public/assets/environments/$view-cinematic-4k.webp" -resize 2048x1281! -quality 90 "public/assets/environments/$view-cinematic-2k.webp"
  magick "public/assets/environments/$view-cinematic-4k.webp" -resize 1280x801! -quality 88 "public/assets/environments/$view-cinematic-safe.webp"
done
