# Data provenance

`raw/` holds the source data for this site, exactly as published. Nothing in it is
generated, and it is never modified — `scripts/build_data.py` reads it and writes the
files the app loads.

## Source

Nait Saada, J., Kalantzis, G., Shyr, D., Cooper, F., Robinson, M., Gusev, A., Palamara, P. F.
_Identity-by-descent detection across 487,409 British samples reveals fine scale population
structure and ultra-rare variant associations: data related to publication._ Zenodo, 2020-09-02.

- **DOI:** [10.5281/zenodo.4012677](https://doi.org/10.5281/zenodo.4012677)
- **Licence:** CC-BY-4.0
- **Archive:** `identity-by-descent-detection-data.tar.gz`
  (sha256 `549d163626e428fadf1925ff0448e0161fca9a1ce36e7f817212dd5daaaf086a`)
- **Path within the archive:** `NAT_COMMS_DATA/IBD_sharing_UK_postcodes/`

The accompanying paper is Nait Saada et al., _Nature Communications_ 11, 6130 (2020).

`SHA256SUMS` covers every file in `raw/`; verify with `sha256sum -c SHA256SUMS`.

## Map boundaries (`map/`)

`map/uk-postcode-areas.topo.json` (sha256
`40398d328cceeebfa55490497d27010bc26cc38ec8b26a4a2cda44d2ff08bea2`) holds the 120 Great Britain
postcode area boundaries, derived from the GeoLytix postal boundaries published at:

- **GB Postcode Area, Sector, District**, Edinburgh DataShare,
  <https://datashare.ed.ac.uk/handle/10283/2597> (`GB_Postcodes.zip`, `PostalArea` layer, 2012)
- **Licence:** Open Government Licence, on the same terms as OS OpenData

**The licence requires this attribution wherever the map is shown:**

> Postal Boundaries © GeoLytix copyright and database right 2012. Contains Ordnance Survey data
> © Crown copyright and database right 2012. Contains Royal Mail data © Royal Mail copyright and
> database right 2012. Contains National Statistics data © Crown copyright and database right 2012.

Note that no official source of postcode *area* polygons exists. Royal Mail defines postcodes as
delivery routes rather than areas, so ONS and Ordnance Survey publish only centroids and lookups;
every polygon dataset is derived by a third party. GeoLytix is the established open one.

Regenerated from the source shapefile with [mapshaper](https://mapshaper.org):

```
mapshaper GB_Postcodes/PostalArea.shp encoding=latin1 \
  -filter-fields PostArea,AreaName -rename-fields code=PostArea,name=AreaName \
  -proj from=EPSG:27700 EPSG:4326 \
  -simplify 0.5% keep-shapes \
  -rename-layers postcode_areas \
  -o format=topojson id-field=code quantization=1e4 uk-postcode-areas.topo.json
```

Reprojected from British National Grid to WGS84 and simplified to 0.5%, which keeps the island
groups legible (Shetland retains 13 parts, the Outer Hebrides 15, Scilly 3). Each shape carries
its postcode `code` and the GeoLytix `name`, which is where the app's place names come from.

The 2012 vintage suits the data, which reflects UK Biobank recruitment in 2006–2010. Coverage is
Great Britain only, so there is no Northern Ireland (BT) shape and none for NPT.

## Relationship to the retired backend

These files are **byte-identical** (verified by checksum, all 30 matrices and the postcode
mapping) to `data/postcode_ibdMatrix/IBD/` in the `OxfordRSE/fastsmc_app_backend` repository
at commit `7848642`, which is what the previous fly.io API served. Taking them from Zenodo
instead makes this repository self-contained and citable once that backend is archived.

## Contents

30 matrices, each 122×122 float64 in NumPy `.npy` format, spanning:

- **2 datatypes** — `matrix_nb_*` is the number of IBD segments shared; `matrix_len_*` is the
  total length shared, **in centimorgans**.
- **5 time thresholds** — 10, 20, 30, 40 and 50 generations.
- **3 statistics** — `_mean`, `_lower_95` and `_upper_95` (bounds of the 95% confidence interval).

`postcodeMapping_postcodeMatrices.txt` maps matrix row/column index to postcode area code, and
is the authoritative ordering: index 0 is ZE, 1 is KW, and so on.

## Notes for anyone regenerating the derived files

- **Unit conversion.** `matrix_len_*` is in centimorgans. The app displays a percentage of the
  genome, so values are multiplied by `100 / 3627.03352`, the reciprocal of the genome length in
  centimorgans. This matches what the old backend did, so the numbers are unchanged from the
  site this replaces. `matrix_nb_*` is not scaled.
- **Missing postcodes.** BT (Belfast), CR (Croydon) and BN (Brighton) are entirely NaN — both
  their row and their column, in every matrix. This is consistent across every copy of the data
  in the original repositories, including the un-bootstrapped text estimates.
- **Sample counts are deliberately excluded.** The old frontend's `postcode_info.js` carried
  per-postcode sample counts that contradict these matrices: SY reports 0 samples yet has data,
  and BT reports 974 yet has none. Only the long-form place names are carried over. The counts
  should not be published until the authors clarify them.
- **Which sample set this is.** These matrices correspond to the _all individuals_ set rather
  than the white-only subset: they track the backend's `all/` sources far more closely
  (ratio 0.995) than its `white/` ones (0.927). Worth confirming with the authors before
  describing the dataset in user-facing text.
