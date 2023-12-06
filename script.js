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

    serverCounts = {}

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
        const countSpan = document.createElement('span')
        countSpan.textContent = server + ": " + count + " | "
        document.getElementById('serverCounts').appendChild(countSpan)
    }
}

window.onload = async function() {
    const url = 'https://raw.githubusercontent.com/ktthai/ktthai.github.io/main/PlayerData.csv'
    const response = await fetch(url)
    let data = await response.text()

    if (response.status !== 200) {
        throw new Error("Data could not be fetched!")
    }

    data = data.split("\n")
    generateTable(data)

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
