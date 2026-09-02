#!/usr/bin/env python3
"""Packs the Yale Bright Star Catalog (BSC5) into public/assets/stars/bsc5.bin.

Download the catalogue first:
  curl -sSL -o /tmp/bsc5.dat.gz http://tdc-www.harvard.edu/catalogs/bsc5.dat.gz
  gunzip /tmp/bsc5.dat.gz
Then run from the repository root:
  python3 scripts/star-catalogue.py /tmp/bsc5.dat

Record layout (little-endian), after an 8-byte header of "BSC5", u16 version,
u16 count: u16 right ascension in hundredths of a degree, i16 declination in
hundredths of a degree, i16 visual magnitude in hundredths, i16 B-V colour
index in hundredths. Stars without a magnitude are dropped; the rest are
sorted brightest first. See src/perigee/scenes/starCatalogue.ts for the reader.
"""
import os
import struct
import sys

source = sys.argv[1] if len(sys.argv) > 1 else '/tmp/bsc5.dat'
target = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'stars', 'bsc5.bin')

rows = []
for line in open(source, encoding='latin-1'):
    line = line.rstrip('\n')
    if len(line) < 114:
        continue
    try:
        ra_h = int(line[75:77]); ra_m = int(line[77:79]); ra_s = float(line[79:83])
        sign = line[83]; dec_d = int(line[84:86]); dec_m = int(line[86:88]); dec_s = int(line[88:90])
        vmag = float(line[102:107])
    except ValueError:
        continue
    try:
        bv = float(line[109:114].strip())
    except ValueError:
        bv = 0.6
    ra = (ra_h + ra_m / 60 + ra_s / 3600) * 15.0
    dec = (dec_d + dec_m / 60 + dec_s / 3600) * (-1 if sign == '-' else 1)
    rows.append((ra, dec, vmag, bv))

rows.sort(key=lambda row: row[2])
os.makedirs(os.path.dirname(target), exist_ok=True)
with open(target, 'wb') as out:
    out.write(struct.pack('<4sHH', b'BSC5', 1, len(rows)))
    for ra, dec, vmag, bv in rows:
        out.write(struct.pack(
            '<Hhhh',
            int(round(ra * 100)) % 36000,
            int(round(dec * 100)),
            int(round(vmag * 100)),
            int(round(max(-1.0, min(2.5, bv)) * 100)),
        ))
print(f'{len(rows)} stars -> {os.path.relpath(target)} ({os.path.getsize(target)} bytes)')
