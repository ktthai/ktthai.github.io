import $ from "jquery";
window.jQuery = $;
window.$ = $;
global.jQuery = $;

import "bootstrap";
import "bootstrap-table";
import Chart from 'chart.js/auto';

function relativeTime(unixSeconds) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - unixSeconds;
    if (diff < 60) return "Just now";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    if (diff < 86400 * 30) return Math.floor(diff / 86400) + "d ago";
    if (diff < 86400 * 365) return Math.floor(diff / (86400 * 30)) + "mo ago";
    return Math.floor(diff / (86400 * 365)) + "y ago";
}

async function loadPlayerData(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to load player data: " + response.status);
    const json = await response.json();

    const raceCounter = {};
    const levelCounter = {};

    const rows = json.players.map(p => {
        // Parse race string like "Human Male" into gender+race for charts
        const parts = p.race ? p.race.split(" ") : [];
        const gender = parts.length >= 2 ? parts[parts.length - 1] : "";
        const raceName = parts.length >= 2 ? parts.slice(0, parts.length - 1).join(" ") : p.race || "";

        if (raceName && gender) {
            if (!raceCounter[raceName]) raceCounter[raceName] = {};
            raceCounter[raceName][gender] = (raceCounter[raceName][gender] || 0) + 1;
        }

        const levelBin = Math.floor((p.totalLevel || 0) / 1000);
        levelCounter[levelBin] = (levelCounter[levelBin] || 0) + 1;

        return {
            name: p.name || "",
            guild: p.guild || "",
            race: p.race || "",
            totalLevel: p.totalLevel || 0,
            items: Array.isArray(p.items) ? p.items.join(", ") : "",
            lastSeen: p.lastSeen ? relativeTime(p.lastSeen) : "",
            _lastSeenRaw: p.lastSeen || 0,
        };
    });

    return {
        rows,
        raceCounter,
        levelCounter,
        lastUpdated: json.lastUpdated,
        count: json.count,
    };
}

function buildRaceChart(raceCounter, playerTotal) {
    const raceTotal = {};
    const genderTotal = {};

    for (const [race, genders] of Object.entries(raceCounter)) {
        for (const [gender, count] of Object.entries(genders)) {
            raceTotal[race] = (raceTotal[race] || 0) + count;
            genderTotal[gender] = (genderTotal[gender] || 0) + count;
        }
    }

    const maleData = {
        Human: (raceCounter["Human"] || {})["Male"] || 0,
        Elf: (raceCounter["Elf"] || {})["Male"] || 0,
        Giant: (raceCounter["Giant"] || {})["Male"] || 0,
    };
    const femaleData = {
        Human: (raceCounter["Human"] || {})["Female"] || 0,
        Elf: (raceCounter["Elf"] || {})["Female"] || 0,
        Giant: (raceCounter["Giant"] || {})["Female"] || 0,
    };

    new Chart(document.getElementById("raceData"), {
        type: "bar",
        data: {
            labels: ["Human", "Elf", "Giant"],
            datasets: [
                { label: "Male", data: [maleData.Human, maleData.Elf, maleData.Giant], backgroundColor: "rgba(54, 162, 235, 0.7)" },
                { label: "Female", data: [femaleData.Human, femaleData.Elf, femaleData.Giant], backgroundColor: "rgba(255, 99, 132, 0.7)" },
            ],
        },
        options: {
            plugins: {
                tooltip: {
                    callbacks: {
                        footer(tooltipItems) {
                            const item = tooltipItems[0];
                            const count = item.parsed.y;
                            const pct = Math.round(count / playerTotal * 10000) / 100;
                            return `(${pct}% of all players)`;
                        },
                    },
                },
            },
            scales: { x: { stacked: true }, y: { stacked: true } },
        },
    });
}

function buildLevelChart(levelCounter, playerTotal) {
    let levels = Object.keys(levelCounter).map(Number).sort((a, b) => a - b);
    const counts = levels.map(l => levelCounter[l]);

    let cumSum = 0;
    const cumLine = counts.map(c => { cumSum += c; return Math.round(cumSum / playerTotal * 10000) / 100; });

    new Chart(document.getElementById("levelData"), {
        data: {
            labels: levels,
            datasets: [
                { type: "bar", label: "Players", data: counts, yAxisID: "y" },
                { type: "line", label: "Cumulative %", data: cumLine, yAxisID: "y2", pointRadius: 0 },
            ],
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title(items) {
                            const x = items[0].label;
                            return x > 0 ? `Level ${x}000–${x}999` : "Level 1–999";
                        },
                        label(context) {
                            if (context.datasetIndex === 1) {
                                const pct = Math.round((100 - context.parsed.y) * 100) / 100;
                                return `Top ${Math.max(pct, 0.01)}% of all players`;
                            }
                        },
                        footer(items) {
                            if (items[0].datasetIndex === 0) {
                                const pct = Math.round(items[0].parsed.y / playerTotal * 10000) / 100;
                                return `(${pct}%)`;
                            }
                        },
                    },
                },
            },
            scales: {
                x: { title: { display: true, text: "Total Level (×1000)" } },
                y2: { display: false },
            },
            maintainAspectRatio: false,
        },
    });
}

function buildPlayerTable(rows) {
    $("#playerData").bootstrapTable({
        columns: [
            { field: "name", title: "Name", sortable: true },
            { field: "guild", title: "Guild", sortable: true },
            { field: "race", title: "Race", sortable: true },
            { field: "totalLevel", title: "Total Level", sortable: true },
            { field: "items", title: "Items", sortable: false },
            { field: "lastSeen", title: "Last Seen", sortable: true,
              sorter: (a, b, rowA, rowB) => rowA._lastSeenRaw - rowB._lastSeenRaw },
        ],
        data: rows,
        pagination: true,
        pageSize: 25,
        formatShowingRows: (from, to, total) => `Showing ${from}–${to} of ${total} players.`,
        formatRecordsPerPage: n => `${n} players per page.`,
        search: true,
        sortName: "totalLevel",
        sortOrder: "desc",
    });
}

$(async () => {
    const url = 'https://raw.githubusercontent.com/ktthai/ktthai.github.io/main/players.json';
    try {
        const dataObj = await loadPlayerData(url);
        const playerTotal = dataObj.rows.length;

        if (dataObj.lastUpdated) {
            const syncedEl = document.getElementById("lastSynced");
            if (syncedEl) syncedEl.textContent = "Last synced: " + relativeTime(dataObj.lastUpdated) + ` (${playerTotal} players)`;
        }

        buildRaceChart(dataObj.raceCounter, playerTotal);
        buildLevelChart(dataObj.levelCounter, playerTotal);
        buildPlayerTable(dataObj.rows);
    } catch (err) {
        console.error(err);
        const el = document.getElementById("errorMsg");
        if (el) { el.textContent = "Failed to load player data. " + err.message; el.style.display = "block"; }
    }
});
