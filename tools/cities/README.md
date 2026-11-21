# Offline cities

Run `python tools/cities/generate.py` to update the app’s city index from GeoNames. Pass `--source-dir` to build from saved copies of `cities15000.zip` and `countryInfo.txt`.

The index keeps the name, ASCII name, country, coordinates, time zone and population for the cities and capitals in the extract. It rounds city coordinates to four decimal places and sorts by descending population. The app reads the bundled data when the city picker or approximate location lookup opens.

City and country data by GeoNames, licensed under Creative Commons Attribution 4.0. [GeoNames Gazetteer extract](https://download.geonames.org/export/dump/) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
