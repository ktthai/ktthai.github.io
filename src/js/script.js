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

            if (val === "") return;

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

        data.push(row);
    }

    return {
        data: data, 
        serverCounter: serverCounter, 
        raceCounter: raceCounter, 
        levelCounter: levelCounter
    };
}

function generateTable(data) {
    let tableHead = document.createElement('thead');
    let tableBody = document.createElement('tbody');

    // Generate headers for table.
    let row = document.createElement('tr');
    
    for (const headerText of data[0].split(",")) {
        let header = document.createElement('th');
        header.appendChild(document.createTextNode(headerText));
        row.appendChild(header);
    }

    tableHead.setAttribute("class", "table-warning");
    tableHead.appendChild(row);

    const serverCounts = {};

    // Iterate over every player.
    data.slice(1).forEach((rowText) => {
        row = document.createElement('tr');
        rowText = rowText.split(",");

        // Generate every table cell
        rowText.forEach((cellText) => {
            let cell = document.createElement('td');
            cell.appendChild(document.createTextNode(cellText));
            row.appendChild(cell);
        });

        // Tabulate player count per server.
        let server = rowText[4].trim();

        if (server !== "") {
            serverCounts[server] = serverCounts[server] ? serverCounts[server] + 1 : 1;
        }

        tableBody.appendChild(row);
    })

    document.getElementById('csvData').appendChild(tableHead);
    document.getElementById('csvData').appendChild(tableBody);

    // Create server count text
    let countSpan = document.getElementById('totalPlayerCount');
    countSpan.textContent = data.length - 1; // exclude header row

    for (const [server, count] of Object.entries(serverCounts)) {
        let percentage = count / (data.length - 1);
        // Hate javascript rounding.
        percentage = Math.round(percentage * 10000) / 100;

        const countSpan = document.createElement('span');
        countSpan.appendChild(document.createTextNode(server + ": " + count + " (" + percentage + "%) | "));
        document.getElementById('serverCounts').appendChild(countSpan);
    }

    return serverCounts;
}

function generatePieChart(data, graphNode, width, height) {
    let svg = d3.select(graphNode)
        .append('svg')
            .attr('width', width)
            .attr('height', height);
    let g = svg.append('g')
        .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');
    
    const radius = Math.min(width, height) / 2;
    const color = d3.scaleOrdinal(['red', 'yellow', 'orange', 'green', 'cyan', 'purple']);
    const pie = d3.pie();
    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);
    const label = d3.arc()
        .innerRadius(radius - 75)
        .outerRadius(radius);

    const labels = Object.keys(data);
    const values = Object.values(data);
    
    const arcs = g.selectAll("arc")
        .data(pie(values))
        .enter()
        .append('g')
        .attr('class', 'arc');

    arcs.append("path")
        .attr('fill', (d, i) => color(i))
        .attr('d', arc);

    arcs.append("text")
        .attr('transform', d => {return "translate(" + label.centroid(d) + ")"})
        .call(text => text.append('tspan'))
            .attr('y', '1em')
            .text((d, i) => {return labels[i]});
}

$(async () => {
    const url = 'https://raw.githubusercontent.com/ktthai/ktthai.github.io/main/PlayerData.csv';
    const dataObj = await parseDataTable(url);

    $("#csvData").bootstrapTable({
        columns: [
            {field: "IGN", title: "Name"},
            {field: "Server", title: "Server"},
            {field: "Race", title: "Race"},
            {field: "Gender", title: "Gender"},
            {field: "Total Level", title: "Total Level"}
        ],
        data: dataObj.data,
        pagination: true,
        formatShowingRows: function (pageFrom, pageTo, totalRows) {
            return "Showing " + pageFrom + "-" + pageTo + " of " + totalRows + " players.";
        },
        formatRecordsPerPage: function(pageNumber) {
            return pageNumber + " players per page.";
        },
        search: true
    });
});