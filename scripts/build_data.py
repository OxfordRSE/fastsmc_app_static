# /// script
# requires-python = ">=3.14"
# dependencies = ["numpy>=2,<3"]
# ///
"""Convert the published IBD matrices into the files the site loads.

Reads data/raw and data/map (see data/PROVENANCE.md), writes src/data.
Replaces create_data() in fastsmc/data.py of the old Flask backend
(OxfordRSE/fastsmc_app_backend), which did this conversion at server start-up.
Run with `uv run scripts/build_data.py`. Outputs are committed; the inputs are
fixed, so this only needs re-running if they change.

With --check, writes nothing and exits non-zero unless the committed src/data
matches what the inputs produce, byte for byte.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
MAP = ROOT / "data" / "map" / "uk-postcode-areas.topo.json"
OUT = ROOT / "src" / "data"
LAYER = "postcode_areas"

# The app's two measures, keyed by name, with their source file prefixes:
# 'nb' counts IBD segments; 'len' is their total length in centimorgans.
# The original app and backend called them 'ibd_segments' and 'genome_fraction'.
MEASURES = {"ancestors": "nb", "genome": "len"}
THRESHOLDS = [10, 20, 30, 40, 50]  # generations
STATS = ["lower_95", "mean", "upper_95"]
YEARS_PER_GENERATION = 30
GENOME_CM = 3627.03352  # genome length, for cM -> percent of genome


def load_names() -> list[str]:
    raw = np.genfromtxt(
        RAW / "postcodeMapping_postcodeMatrices.txt", usecols=(1), dtype=str
    )
    return [str(name).strip() for name in raw]


def load_matrix(kind: str, *, to_percent: bool) -> np.ndarray:
    """Stack the 30 source files into one (from, to, threshold, stat) array."""
    out = np.empty((122, 122, len(THRESHOLDS), len(STATS)), dtype=np.float32)
    for t, threshold in enumerate(THRESHOLDS):
        for s, stat in enumerate(STATS):
            path = RAW / f"matrix_{kind}_{threshold}_{stat}.npy"
            out[:, :, t, s] = np.load(path)
    if to_percent:
        out *= 100.0 / GENOME_CM
    return out


def interpolate(series: np.ndarray, generations: float) -> np.ndarray:
    """Value at an arbitrary time depth.

    Below the first threshold the value is clamped; between thresholds it is a
    linear blend of the two that bracket it.
    """
    upper = next(
        (i for i, t in enumerate(THRESHOLDS) if t > generations), len(THRESHOLDS) - 1
    )
    if upper == 0:
        lower_weight = 0.0
    else:
        span = THRESHOLDS[upper] - THRESHOLDS[upper - 1]
        lower_weight = (THRESHOLDS[upper] - generations) / span
    if lower_weight <= 0:
        return series[upper].astype(np.float64)
    blended = series[upper].astype(np.float64) * (1.0 - lower_weight)
    return blended + series[upper - 1].astype(np.float64) * lower_weight


def build_map(names: list[str], has_data: dict[str, bool]) -> tuple[dict, list[str]]:
    """Annotate each map shape with its matrix row and whether it has data."""
    topology = json.loads(MAP.read_text())
    shapes = topology["objects"][LAYER]["geometries"]

    index = {name: i for i, name in enumerate(names)}
    codes = [shape["id"] for shape in shapes]
    if len(set(codes)) != len(codes):
        raise SystemExit("map contains duplicate postcode codes")
    unknown = sorted(set(codes) - set(index))
    if unknown:
        raise SystemExit(f"map has shapes with no matrix row: {', '.join(unknown)}")

    for shape in shapes:
        code = shape["id"]
        shape["properties"] |= {
            "matrixIndex": index[code],
            "hasData": has_data[code],
        }
    return topology, codes


def golden_cases(matrices: dict[str, np.ndarray], names: list[str]) -> list[dict]:
    """Expected values for the TypeScript port to reproduce.

    Computed here in numpy so the tests check the port against an independent
    implementation rather than against itself.
    """
    index = {name: i for i, name in enumerate(names)}
    # Covers self-pairs, the strongest and weakest links, and a no-data postcode.
    pairs = [
        ("HA", "HA"),
        ("HA", "ZE"),
        ("ZE", "ZE"),
        ("LL", "CH"),
        ("B", "M"),
        ("NP", "CF"),
        ("E", "SW"),
        ("HA", "CR"),
    ]
    # Both ends of the slider, exact thresholds, midpoints and an awkward value.
    year_values = [300, 450, 600, 900, 1234, 1500]

    cases = []
    for measure, matrix in matrices.items():
        for source, target in pairs:
            for years in year_values:
                value = interpolate(
                    matrix[index[source], index[target]], years / YEARS_PER_GENERATION
                )
                cases.append(
                    {
                        "measure": measure,
                        "from": source,
                        "to": target,
                        "years": years,
                        "expected": None
                        if np.isnan(value).all()
                        else {stat: float(value[s]) for s, stat in enumerate(STATS)},
                    }
                )
    return cases


def to_json(payload: object) -> bytes:
    return json.dumps(payload, separators=(",", ":"), allow_nan=False).encode()


def build_outputs() -> tuple[dict[str, bytes], str]:
    """Every file destined for src/data, as bytes, plus a one-line summary."""
    names = load_names()
    matrices = {
        key: load_matrix(kind, to_percent=(key == "genome"))
        for key, kind in MEASURES.items()
    }

    # A postcode has data if any matrix holds a value for it.
    has_data = {
        name: bool(np.isfinite(matrices["ancestors"][i]).any())
        for i, name in enumerate(names)
    }

    topology, codes = build_map(names, has_data)
    # Rows the app can never show, because the map has no shape for them.
    unmapped = [name for name in names if name not in set(codes)]

    meta = {
        "postcodes": names,
        "hasData": [has_data[name] for name in names],
        "unmapped": unmapped,
        "thresholdsGenerations": THRESHOLDS,
        "stats": STATS,
        "yearsPerGeneration": YEARS_PER_GENERATION,
        "measures": [{"key": key, "file": f"{key}.bin"} for key in MEASURES],
        "matrix": {
            "shape": [len(names), len(names), len(THRESHOLDS), len(STATS)],
            "dtype": "float32",
            "byteOrder": "little",
            "layout": "[from][to][threshold][stat], row-major",
        },
        "source": {"doi": "10.5281/zenodo.4012677", "licence": "CC-BY-4.0"},
    }

    files = {
        f"{key}.bin": matrix.astype("<f4").tobytes() for key, matrix in matrices.items()
    }
    files |= {
        "meta.json": to_json(meta),
        "uk-postcode-areas.topo.json": to_json(topology),
        "golden.json": to_json(golden_cases(matrices, names)),
    }

    missing = [name for name in names if not has_data[name]]
    summary = (
        f"{len(names)} matrix rows, {len(codes)} map shapes; "
        f"no data for {', '.join(missing)}; not on the map: {', '.join(unmapped)}"
    )
    return files, summary


def write(files: dict[str, bytes]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, content in files.items():
        path = OUT / name
        path.write_bytes(content)
        print(f"{path.relative_to(ROOT)}: {len(content):,} bytes")


def check(files: dict[str, bytes]) -> int:
    """Compare against the committed outputs; return a process exit code."""
    problems = []
    for name, content in files.items():
        path = OUT / name
        if not path.exists():
            problems.append(f"missing:     {path.relative_to(ROOT)}")
        elif path.read_bytes() != content:
            problems.append(f"out of date: {path.relative_to(ROOT)}")
    if OUT.exists():
        for path in sorted(OUT.iterdir()):
            if path.name not in files:
                problems.append(f"unexpected:  {path.relative_to(ROOT)}")

    if problems:
        print("\n".join(problems))
        print(
            "Run `uv run scripts/build_data.py` to regenerate, "
            "and delete any unexpected files: src/data holds only generated output."
        )
        return 1
    print(f"src/data is up to date ({len(files)} files).")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--check",
        action="store_true",
        help="verify src/data matches the inputs instead of writing it",
    )
    args = parser.parse_args()

    files, summary = build_outputs()
    if args.check:
        raise SystemExit(check(files))
    write(files)
    print(f"\n{summary}")


if __name__ == "__main__":
    main()
