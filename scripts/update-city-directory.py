"""Refresh the country-partitioned GeoNames cities15000 directory (CC BY).
Run: python scripts/update-city-directory.py /path/to/cities15000.zip
Download: https://download.geonames.org/export/dump/cities15000.zip
"""
import json
from pathlib import Path
import sys
import zipfile

target = Path(__file__).resolve().parents[1] / 'places' / 'cities'
target.mkdir(parents=True, exist_ok=True)
countries = {}
with zipfile.ZipFile(sys.argv[1]) as archive:
    for line in archive.read('cities15000.txt').decode('utf-8').splitlines():
        fields = line.split('\t')
        if fields[6] != 'P' or fields[7] in ('PPLX', 'PPLH', 'PPLQ', 'PPLW'):
            continue
        countries.setdefault(fields[8], []).append(dict(name=fields[2] or fields[1], lat=float(fields[4]), lng=float(fields[5]), geonames=fields[0], population=int(fields[14] or 0)))
for code, cities in countries.items():
    cities.sort(key=lambda city: -city['population'])
    (target / (code + '.json')).write_text(json.dumps(cities, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'{len(countries)} countries; {sum(map(len, countries.values()))} populated places')
