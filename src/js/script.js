import * as d3 from "d3";
import $ from "jquery";
window.jQuery = $;
window.$ = $;
global.jQuery = $;

import "bootstrap";
import "bootstrap-table";

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

        // Generating dicts for every row.
        text.forEach((val, j) => {
            val = val.trim();

            if (headers[j] === "Race") {
                val = val.split(" ");
                const [gender, race] = val;

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
                if (headers[j] === "Server") {
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

        if (Object.values(row).includes("")) continue;

        data.push(row);
    }

    return {
        data: data, 
        serverCounter: serverCounter, 
        raceCounter: raceCounter, 
        levelCounter: levelCounter
    };
}

$(async () => {
    const url = 'https://raw.githubusercontent.com/ktthai/ktthai.github.io/main/PlayerData.csv';
    const dataObj = await parseDataTable(url);

    $("#csvData").bootstrapTable({
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