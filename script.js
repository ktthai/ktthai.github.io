import * as d3 from "d3";

function generateTable(data) {
    let tableHead = document.createElement('thead')
    let tableBody = document.createElement('tbody')

    // Generate headers for table.
    let row = document.createElement('tr')
    
    for (const headerText of data[0].split(",")) {
        let header = document.createElement('th')
        header.appendChild(document.createTextNode(headerText))
        row.appendChild(header)
    }

    tableHead.appendChild(row)

    const serverCounts = {}

    // Iterate over every player.
    data.slice(1).forEach((rowText) => {
        row = document.createElement('tr')
        rowText = rowText.split(",")

        // Generate every table cell
        rowText.forEach((cellText) => {
            let cell = document.createElement('td')
            cell.appendChild(document.createTextNode(cellText))
            row.appendChild(cell)
        })

        // Tabulate player count per server.
        let server = rowText[4].trim()

        if (server !== "") {
            serverCounts[server] = serverCounts[server] ? serverCounts[server] + 1 : 1
        }

        tableBody.appendChild(row)
    })

    document.getElementById('csvData').appendChild(tableHead)
    document.getElementById('csvData').appendChild(tableBody)

    // Create server count text
    let countSpan = document.getElementById('totalPlayerCount');
    countSpan.textContent = data.length - 1; // exclude header row

    for (const [server, count] of Object.entries(serverCounts)) {
        let percentage = count / (data.length - 1)
        // Hate javascript rounding.
        percentage = Math.round(percentage * 10000) / 100

        const countSpan = document.createElement('span')
        countSpan.appendChild(document.createTextNode(server + ": " + count + " (" + percentage + "%) | "))
        document.getElementById('serverCounts').appendChild(countSpan)
    }

    return serverCounts
}

function generatePieChart(data, graphNode, width, height) {
    let svg = d3.select(graphNode)
        .append('svg')
            .attr('width', width)
            .attr('height', height);
    let g = svg.append('g')
        .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');
    
    const radius = Math.min(width, height) / 2
    const color = d3.scaleOrdinal(['red', 'yellow', 'orange', 'green', 'cyan', 'purple'])
    const pie = d3.pie()
    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);
    const label = d3.arc()
        .innerRadius(radius - 75)
        .outerRadius(radius);

    const labels = Object.keys(data)
    const values = Object.values(data)
    
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

window.onload = async function() {
    const url = 'https://raw.githubusercontent.com/ktthai/ktthai.github.io/main/PlayerData.csv'
    const response = await fetch(url)
    let data = await response.text()

    if (response.status !== 200) {
        throw new Error("Data could not be fetched!")
    }

    data = data.split("\n")
    const serverCounts = generateTable(data)
    generatePieChart(serverCounts, "div.serverCountsGraph", 300, 300)

    $(() => {
        $("#csvData").tablesorter();
    });

    // Search functionality
    var searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        var filter = searchInput.value.toLowerCase();
        var rows = csvData.getElementsByTagName('tr');
        for (var i = 0; i < rows.length; i++) {
            var cells = rows[i].getElementsByTagName('td');
            var visible = false;
            if (i === 0) { // Check if this is the header row
                visible = true;
            } else {
                for (var j = 0; j < cells.length; j++) {
                    if (cells[j].innerHTML.toLowerCase().indexOf(filter) > -1) {
                        visible = true;
                        break;
                    }
                }
            }
            rows[i].style.display = visible ? '' : 'none';
        }
    });
}