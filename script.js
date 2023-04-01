window.onload = function() {
    var csvData = document.getElementById('csvData');
    var csvRequest = new XMLHttpRequest();
    csvRequest.open('GET', 'https://raw.githubusercontent.com/ktthai/ktthai.github.io/main/PlayerData.csv', true);
    csvRequest.send();
    csvRequest.onreadystatechange = function() {
        if (csvRequest.readyState == 4 && csvRequest.status == 200) {
            var data = csvRequest.responseText;
            var rows = data.split("\n");
            var table = "<thead><tr>";
            var headers = rows[0].split(",");
            for (var i = 0; i < headers.length; i++) {
                table += "<th>" + headers[i] + "</th>";
            }
            table += "</tr></thead><tbody>";
            for (var i = 1; i < rows.length; i++) {
                var cells = rows[i].split(",");
                if (cells.length > 1) {
                    table += "<tr>";
                    for (var j = 0; j < cells.length; j++) {
                        table += "<td>" + cells[j] + "</td>";
                    }
                    table += "</tr>";
                }
            }
            table += "</tbody>";
            csvData.innerHTML = table;

             // Search functionality
             var searchInput = document.getElementById('searchInput');
             searchInput.addEventListener('input', function() {
                 var filter = searchInput.value.toLowerCase();
                 var rows = csvData.getElementsByTagName('tr');
                 for (var i = 0; i < rows.length; i++) {
                     var cells = rows[i].getElementsByTagName('td');
                     var visible = false;
                     for (var j = 0; j < cells.length; j++) {
                         if (cells[j].innerHTML.toLowerCase().indexOf(filter) > -1) {
                             visible = true;
                             break;
                         }
                     }
                     rows[i].style.display = visible ? '' : 'none';
                 }
             });
        }
    }
}