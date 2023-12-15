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
    const headers = rawData[0].split(",");

    const data = [];
    const serverCounter = {};
    const raceCounter = {};
    const levelCounter = {};

    for (let i = 1; i < rawData.length; i++) {
        let row = {};
        let text = rawData[i].split(",");

        if (text.includes("")) continue;

        // Generating dicts for every row.
        text.forEach((val, j) => {
            val = val.trim();

            if (headers[j] === "Race") {
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
                else if (headers[j] === "Total Level") {
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

function buildServerChart(data) {
    const serverTotal = Object.values(data).reduce((a, b) => a + b, 0);

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
                                const percentage = Math.round(y / serverTotal * 10000) / 100;
                                return "(" + percentage + "%)";
                            }
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: "Server" }},
                    y: { title: { display: true, text: "Player Count" }}
                }
            }
        }
    );
}

function buildRaceChart(data) {
    const raceTotal = {};
    const genderTotal = {};

    for (const [race, x] of Object.entries(data)) {
        for (const [gender, y] of Object.entries(x)) {
            raceTotal[race] = raceTotal[race] ? raceTotal[race] + y : y;
            genderTotal[gender] = genderTotal[gender] ? genderTotal[gender] + y: y;
        }
    }

    const serverTotal = Object.values(raceTotal).reduce((a, b) => a + b, 0);

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
                    tooltip: {
                        callbacks: {
                            footer: function(tooltipItems) {
                                const gender = tooltipItems[0].label;
                                const race = tooltipItems[0].dataset.label;
                                const count = tooltipItems[0].parsed.y;

                                const genderPercent = Math.round(count / genderTotal[gender] * 10000) / 100;
                                const racePercent = Math.round(count / raceTotal[race] * 10000) / 100;
                                const totalPercent = Math.round(count / serverTotal * 10000) / 100;

                                let tooltip = "(" + genderPercent + "% of " + genderTotal[gender] + " " + gender + "s)\n";
                                tooltip += "(" + racePercent + "% of " + raceTotal[race] + " " + race + "s)\n";
                                tooltip += "(" + totalPercent + "% of " + serverTotal + " Players)";

                                return tooltip;
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        title: { display: true, text: "Gender" },
                        stacked: true
                    },
                    y: { 
                        title: { display: true, text: "Player Count" },
                        stacked: true
                    }
                }
            }
        }
    );
}

$(async () => {
    const url = 'https://raw.githubusercontent.com/ktthai/ktthai.github.io/main/PlayerData.csv';
    const dataObj = await parseDataTable(url);

    console.log(dataObj);
    buildServerChart(dataObj.serverCounter);
    buildRaceChart(dataObj.raceCounter);

    const serverTotal = Object.values(dataObj.levelCounter).reduce((a, b) => a + b, 0);

    new Chart(
        document.getElementById("levelData"),
        {
            type: "bar",
            data: {
                datasets: [{ data: dataObj.levelCounter }]
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
                                const percentage = Math.round(y / serverTotal * 10000) / 100;
                                return "(" + percentage + "%)";
                            }
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: "Total Level (x1000)" }},
                    y: {
                        title: { display: true, text: "Player Count" }, 
                        // type: "logarithmic",
                        // min: 0.9
                    }
                }
            }
        }
    );

    $("#playerData").bootstrapTable({
        columns: [
            {field: "IGN", title: "Name", sortable: true},
            {field: "Server", title: "Server", sortable: true},
            {field: "Race", title: "Race", sortable: true},
            {field: "Gender", title: "Gender", sortable: true},
            {field: "Total Level", title: "Total Level", sortable: true}
        ],
        data: dataObj.data,
        pagination: true,
        formatShowingRows: function (pageFrom, pageTo, totalRows) {
            return "Showing " + pageFrom + "-" + pageTo + " of " + totalRows + " players.";
        },
        formatRecordsPerPage: function(pageNumber) {
            return pageNumber + " players per page.";
        },
        search: true,
        sortName: "Total Level",
        sortOrder: "desc"
    });
});