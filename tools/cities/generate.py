"""Build the app's offline city index from GeoNames Gazetteer extracts."""

import argparse
import io
import json
from pathlib import Path
from urllib.request import urlopen
from zipfile import ZipFile

SOURCE = "https://download.geonames.org/export/dump/"
OUTPUT = Path(__file__).resolve().parents[2] / "apps/mobile/src/location/geonames.generated.json"


def read_source(filename, source_dir):
    if source_dir:
        return (source_dir / filename).read_bytes()
    with urlopen(SOURCE + filename, timeout=60) as response:
        return response.read()


def build_index(source_dir):
    countries = {}
    for line in read_source("countryInfo.txt", source_dir).decode("utf-8-sig").splitlines():
        if line and not line.startswith("#"):
            fields = line.split("\t")
            countries[fields[0]] = fields[4]

    cities = []
    with ZipFile(io.BytesIO(read_source("cities15000.zip", source_dir))) as archive:
        with io.TextIOWrapper(archive.open("cities15000.txt"), encoding="utf-8") as rows:
            for line in rows:
                # GeoNames documents these columns in the export readme.
                fields = line.rstrip("\r\n").split("\t")
                city_id, name, ascii_name = fields[:3]
                latitude, longitude = map(float, fields[4:6])
                country, population, time_zone = fields[8], int(fields[14]), fields[17]
                if country not in countries or not (name and time_zone):
                    raise ValueError(f"Missing place details for GeoNames ID {city_id}")
                cities.append((int(city_id), name, ascii_name if ascii_name != name else None,
                               round(latitude, 4), round(longitude, 4), country, time_zone, population))
    cities.sort(key=lambda city: (-city[-1], city[0]))
    return dict(sorted(countries.items())), cities


def write_index(output, countries, cities):
    output.parent.mkdir(parents=True, exist_ok=True)
    time_zones = sorted({city[6] for city in cities})
    time_zone_ids = {name: index for index, name in enumerate(time_zones)}

    def compact(value):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))

    with output.open("w", encoding="utf-8", newline="\n") as file:
        file.write('{"countries":' + compact(countries) + ',"timeZones":' + compact(time_zones) + ',"cities":[\n')
        rows = ((*city[:6], time_zone_ids[city[6]], city[7]) for city in cities)
        file.write(",\n".join(map(compact, rows)))
        file.write("\n]}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, help="Read saved cities15000.zip and countryInfo.txt")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    countries, cities = build_index(args.source_dir)
    write_index(args.output, countries, cities)
    print(f"Wrote {len(cities):,} cities and {len(countries):,} countries to {args.output}")
