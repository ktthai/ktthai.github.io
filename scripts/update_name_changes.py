"""
Run this when syncing new player data to detect name changes.

Usage:
    python scripts/update_name_changes.py <new_players.json>

The script compares <new_players.json> against the currently committed
players.json and updates name_changes.json accordingly.

Workflow:
    1. Download / receive new players.json alongside this repo
    2. Run: python scripts/update_name_changes.py path/to/new_players.json
    3. The script writes changes to name_changes.json
    4. Commit both name_changes.json and the new players.json
"""
import json
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
OLD_PLAYERS = REPO_ROOT / "players.json"
NAME_CHANGES = REPO_ROOT / "name_changes.json"


def load_name_map(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return {p["id"]: p["name"] for p in data.get("players", [])}


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/update_name_changes.py <new_players.json>")
        sys.exit(1)

    new_path = Path(sys.argv[1])
    if not new_path.exists():
        print(f"File not found: {new_path}")
        sys.exit(1)

    old_names = load_name_map(OLD_PLAYERS)
    new_names = load_name_map(new_path)

    with open(NAME_CHANGES, encoding="utf-8") as f:
        nc = json.load(f)
    changes = nc.get("changes", {})

    added = 0
    updated = 0

    for hex_id, new_name in new_names.items():
        if hex_id in changes:
            if new_name != changes[hex_id][-1]:
                changes[hex_id].append(new_name)
                updated += 1
        else:
            old_name = old_names.get(hex_id)
            if old_name and old_name != new_name:
                changes[hex_id] = [old_name, new_name]
                added += 1

    nc["changes"] = changes
    nc["lastUpdated"] = int(time.time())

    with open(NAME_CHANGES, "w", encoding="utf-8") as f:
        json.dump(nc, f, ensure_ascii=False, indent=2)

    print(f"Done: {added} new entries, {updated} existing entries updated")
    print(f"Total tracked: {len(changes)}")


if __name__ == "__main__":
    main()
