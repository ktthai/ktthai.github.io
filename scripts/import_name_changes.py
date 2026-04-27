"""
One-time script: converts name_changes.csv → name_changes.json
Run from the repo root: python scripts/import_name_changes.py
"""
import csv
import json
import time
from pathlib import Path

CSV_PATH = r"C:\Users\kekekennny\Desktop\name_changes.csv"
OUT_PATH = Path(__file__).parent.parent / "name_changes.json"


def main():
    changes = {}

    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_id = row.get("ID", "").strip()
            raw_change = row.get("Name Change", "").strip()

            if not raw_id or not raw_change:
                continue

            try:
                decimal_id = int(raw_id)
            except ValueError:
                continue

            hex_id = format(decimal_id, "X")
            names = [n.strip() for n in raw_change.split("->") if n.strip()]
            if len(names) >= 2:
                changes[hex_id] = names

    result = {
        "lastUpdated": int(time.time()),
        "changes": changes,
    }

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(changes)} name change entries to {OUT_PATH}")


if __name__ == "__main__":
    main()
