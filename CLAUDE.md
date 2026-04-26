# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server (hot reload)
npm run build    # Build production SPA to dist/
npm run deploy   # Push dist/ to gh-pages branch (publishes to ktthai.github.io)
```

No test suite. Verify changes by running `npm run dev` and checking the UI in a browser.

## Architecture

**Vue 3 + Vuetify 3 SPA** deployed to GitHub Pages via the `gh-pages` branch. The app is a read-only viewer — it fetches `players.json` at runtime from the `main` branch of this repo and displays it.

```
src/
  main.js             # Creates Vue app, configures Vuetify with dark theme
  App.vue             # Fetches players.json, owns top-level state (players[], itemNames{})
  components/
    PlayersView.vue   # Data table, search/filter, badge icons, expandable rows
    PlayerEquipment.vue  # Expanded row: groups equipment by pocket slot
public/
  items/              # Item icon PNGs named by itemId (e.g. 1000059.png)
players.json          # Live data file — updated by MabiDpsMeterNA, not edited by hand
```

## Data Pipeline

`players.json` is generated externally by **MabiDpsMeterNA** (`C:\Users\kekekennny\repo\MabiDpsMeterNA`), a Go DPS meter that captures Mabinogi game packets via Npcap:

1. Game packets → parsed `EntityInfo` structs → stored in SQLite (`dilmeter.db`, table `players`)
2. `POST /api/players/sync-github` endpoint in MabiDpsMeterNA builds `players.json` and pushes it to this repo via GitHub API
3. This site fetches the raw file at runtime: `https://raw.githubusercontent.com/ktthai/ktthai.github.io/main/players.json`

**Never manually edit `players.json`** — it is overwritten on every sync.

## players.json Schema

```jsonc
{
  "lastUpdated": 1700000000,   // Unix seconds
  "count": 3338,
  "itemNames": {               // item ID (string) → display name
    "3160099": "Reverie Diadem",
    "1000059": "Soul Liberator"
  },
  "players": [{
    "id": "A1B2C3",            // Hex string (%06X of low 24 bits of player ID)
    "name": "PlayerName",
    "guild": "GuildName",      // Optional
    "race": "Human Male",
    "totalLevel": 1154430,
    "firstSeen": 1699999900,   // Unix seconds
    "lastSeen":  1700000000,   // Unix seconds
    "items": ["Soul Liberator"],           // Special items only (display names)
    "equipment": {                         // May be absent
      "12345": { "itemId": 3160099, "pocket": 0 }
    }
  }]
}
```

## Key Behaviors

**Special item badges** — `PlayersView.vue` hardcodes 4 tracked item sets (Soul Liberator, Destructive Robe, Irusan's Bell, Reverie Diadem). Badge icons come from `/items/{itemId}.png`. The badge logic checks `player.items[]` (name strings from the export).

**Equipment pocket slots** — `PlayerEquipment.vue` maps numeric pocket IDs to slot names (1=Head, 2=Body, 6=Gloves, 7=Shoes, 9=Accessory, etc.). Equipment items are looked up by itemId in the `itemNames` prop.

**Search** — 300ms debounced. Builds a combined search string per player (name + guild + race + item names). Tracks match counts per category (name/guild/race/items) for the filter chip UI.

**Row expansion** — Vuetify `v-data-table` with `item-value="id"` tracks expanded rows by the player's hex ID. The expanded slot renders `<PlayerEquipment>`.

**New player tags** — "Added Today" / "Added This Week" badges appear when `player.firstSeen` is within 24h / 7d of now.

**Deploy** — `npm run deploy` runs `gh-pages -d dist`, pushing the built SPA to the `gh-pages` branch. GitHub Pages serves from that branch. The `main` branch holds source + `players.json`.
