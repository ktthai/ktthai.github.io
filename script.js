import $ from "jquery";
window.jQuery = $;
window.$ = $;
global.jQuery = $;

import "bootstrap";
import "bootstrap-table";
import Chart from 'chart.js/auto';

async function parseDataTable(url) {
    const response = await fetch(url);
    let rawData = await response.text();

    if (rawData.length === 0) {
        throw new Error("Data could not be loaded!");
    }

    rawData = rawData.replace("\r", "").split("\n");
    const headers = rawData.shift().split(",");

    const data = [];
    const serverCounter = {};
    const raceCounter = {};
    const levelCounter = {};

    for (let i = 0; i < rawData.length; i++) {
        let row = {};
        let text = rawData[i].split(",");

        if (text.includes("")) continue;

        // Generating dicts for every row.
        text.forEach((val, j) => {
            val = val.trim();

            if (headers[j] === "Race" && headers[j] === "Gender") {
                val = val.split(" ");
                const [gender, race] = val;

                if (gender === "" || race === "") return;

                // Bin based on race then gender.
                if (!raceCounter[race]) {
                    raceCounter[race] = {[gender]: 1};
                }
                else {
                    if (raceCounter[race][gender]) {
                        raceCounter[race][gender]++;
                    }
                    else {
                        raceCounter[race][gender] = 1;
                    }
                }

                row["Gender"] = gender;
                row["Race"] = race;
            }
            else {
                if (headers[j] === "Server" && val !== "") {
                    serverCounter[val] = serverCounter[val] ? serverCounter[val] + 1 : 1;
                }
                else if (headers[j] === "Level") {
                    let level = parseInt(val);

                    // Binning by 1000 levels at a time.
                    level = Math.floor(level / 1000);

                    levelCounter[level] = levelCounter[level] ? levelCounter[level] + 1 : 1;
                }

                row[headers[j]] = isNaN(val) ? val : parseInt(val);
            }
        });

        data.push(row);
    }

    return {
        data: data, 
        serverCounter: serverCounter, 
        raceCounter: raceCounter, 
        levelCounter: levelCounter
    };
}

function buildServerChart(data, playerTotal) {
    new Chart(
        document.getElementById("serverData"),
        {
            type: "bar",
            data: {
                datasets: [{ data: data }]
            },
            options: {
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            footer: function(tooltipItems) {
                                const y = tooltipItems[0].parsed.y;
                                const percentage = Math.round(y / playerTotal * 10000) / 100;
                                return "(" + percentage + "%)";
                            }
                        }
                    }
                }
            }
        }
    );
}

function buildRaceChart(data, playerTotal) {
    const raceTotal = {};
    const genderTotal = {};

    // Accumulators for race and genders.
    for (const [race, x] of Object.entries(data)) {
        for (const [gender, y] of Object.entries(x)) {
            raceTotal[race] = raceTotal[race] ? raceTotal[race] + y : y;
            genderTotal[gender] = genderTotal[gender] ? genderTotal[gender] + y: y;
        }
    }

    new Chart(
        document.getElementById("raceData"),
        {
            type: "bar",
            data: {
                labels: ["Male", "Female"],
                datasets: [{
                    label: "Human",
                    data: data["Human"]
                },
                {
                    label: "Elf",
                    data: data["Elf"]
                },
                {
                    label: "Giant",
                    data: data["Giant"]
                }]
            },
            options: {
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            footer: function(tooltipItems) {
                                const gender = tooltipItems[0].label;
                                const race = tooltipItems[0].dataset.label;
                                const count = tooltipItems[0].parsed.y;

                                const genderPercent = Math.round(count / genderTotal[gender] * 10000) / 100;
                                const racePercent = Math.round(count / raceTotal[race] * 10000) / 100;
                                const totalPercent = Math.round(count / playerTotal * 10000) / 100;

                                let tooltip = "\n(" + genderPercent + "% of " + genderTotal[gender] + " " + gender + "s)\n";
                                tooltip += "(" + racePercent + "% of " + raceTotal[race] + " " + race + "s)\n";
                                tooltip += "(" + totalPercent + "% of " + playerTotal + " Players)";

                                return tooltip;
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        stacked: true
                    },
                    y: { 
                        stacked: true
                    }
                }
            }
        }
    );
}

function buildLevelChart(data, playerTotal) {
    // Generate array of cumulative keys sorted by level.
    let levels = Object.keys(data);
    levels = levels.map(ele => parseInt(ele));
    levels = levels.sort((a, b) => a - b);

    // Reduce array to find accumulative players per level breakpoint.
    let accumulator = [0];
    levels.forEach((level, index) => {accumulator.push(accumulator[index] + data[level]);});
    accumulator = accumulator.map(val => val / playerTotal * 100);
    accumulator.shift();

    new Chart(
        document.getElementById("levelData"),
        {
            data: {
                datasets: [
                    { type: "bar", data: data, yAxisID: "y" },
                    { type: "line", data: accumulator, yAxisID: "y2" }
                ]
            },
            options: {
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                // Switching to level based tooltip titles.
                                const x = tooltipItems[0].label;
                                if (x > 0) return "Level " + x + "000 to " + x + "999"; 
                                else return "Level 1 to 999";
                            },
                            label: function(context) {
                                // Switching to percentage for cumulative.
                                if (context.datasetIndex === 1) {
                                    const y = Math.round(context.parsed.y * 100) / 100;
                                    if (y >= 50) return "Top " + y + "% of all players";
                                    else return "Bottom " + y + "% of all players";
                                }
                            },
                            footer: function(tooltipItems) {
                                // Switching to percentage of total players in bracket.
                                if (tooltipItems[0].datasetIndex === 0) {
                                    const y = tooltipItems[0].parsed.y;
                                    const percentage = Math.round(y / playerTotal * 10000) / 100;
                                    return "(" + percentage + "%)";
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: "Total Level (x1000)" }},
                    y2: { display: false }
                },
                maintainAspectRatio: false
            }
        }
    );
}

function buildPlayerTable(data) {
    $("#playerData").bootstrapTable({
        columns: [
            {field: "Name", title: "Name", sortable: true},
            {field: "Server", title: "Server", sortable: true},
            {field: "Race", title: "Race", sortable: true},
            {field: "Gender", title: "Gender", sortable: true},
            {field: "Level", title: "Level", sortable: true},
            {field: "Date Modified", title: "Date Modified", sortable: true},
        ],
        data: data,
        pagination: true,
        formatShowingRows: function (pageFrom, pageTo, totalRows) {
            return "Showing " + pageFrom + "-" + pageTo + " of " + totalRows + " players.";
        },
        formatRecordsPerPage: function(pageNumber) {
            return pageNumber + " players per page.";
        },
        search: true,
        sortName: "Level",
        sortOrder: "desc"
    });
}

$(async () => {
    const url = 'https://raw.githubusercontent.com/ktthai/ktthai.github.io/main/PlayerData.csv';
    const dataObj = await parseDataTable(url);

    const playerTotal = Object.values(dataObj.levelCounter).reduce((a, b) => a + b, 0);
    buildServerChart(dataObj.serverCounter, playerTotal);
    buildRaceChart(dataObj.raceCounter, playerTotal);
    buildLevelChart(dataObj.levelCounter, playerTotal);
    buildPlayerTable(dataObj.data);
});