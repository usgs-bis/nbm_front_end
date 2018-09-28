'use strict';

var Widget = function (config) {
    // this.bap = undefined;
};

Widget.prototype.getTableBody = function(rows) {
    var tableBody = [];
    $.each(rows, function(idx, row) {
        var tableRow = [];
        var cols = $(row).children();
        $.each(cols, function(i, col) {
            var colObj = $(col);
            if(colObj.hasClass('hiddenTd')) return;
            var colValue = colObj.text();
            if(idx == 0) {
                //if this is the first row add the header styling
                colValue = { text: colValue, style: 'tableHeader' };
            }
            tableRow.push(colValue);
        });
        tableBody.push(tableRow);
    });
    return tableBody;
};

Widget.prototype.togglePriority = function(priority) {};