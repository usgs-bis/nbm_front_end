'use strict';

function openEcoregionSpeciesJson(sciname, commonName) {
    var url = myServer + '/ecotir/item?identifier=';
    openSpeciesJson(sciname, commonName, url);
}

function toggleEcoregionSpeciesLayer(sciname) {
    let Spplayer = bioScape.getVisibleLayers(false).filter(layer=>{return layer.title == "Species Range"})
    if(!Spplayer.length) return 
    Spplayer = Spplayer[0]
    Spplayer.mapLayer.leafletLayer.setParams({CQL_FILTER:`SppCode='${sciname}'`})
  
}

function openLmeSpeciesJson(sciname, commonName) {
    var url = myServer + '/lmetir/item?identifier=';
    openSpeciesJson(sciname, commonName, url);
}

function openSpeciesJson(sciname, commonName, url) {
    var myUrl = url + sciname;
    var spDialogContent = $("#generalModalContent");
    var commonNameString = commonName ? commonName + ' ': '';
    var title = 'Species Information: ' + commonNameString + '(' + sciname + ')';

    var html = getHtmlFromJsRenderTemplate('#speciesJsonLoadingTemplate', {title: title});
    spDialogContent.html(html);

    $("#generalModal").modal('show');
    $.getJSON(myUrl, function(data) {
        var viewData = {
            title: title,
            url: myUrl,
            ecosStuff: data.ecos_info,
            itisStuff: data.itis_info,
            nsStuff: data.natureserve_info,
            sbStuff: data.sciencebase_info,
            wrmsStuff: data.wrms_info
        };

        var html = getHtmlFromJsRenderTemplate('#speciesJsonResultsTemplate', viewData);
        $('#speciesJsonBody').html(html);
        if(data.error_models.length > 0) {
            spDialogContent.append(getHtmlFromJsRenderTemplate('#errorResultsTemplate', {errorModels: data.error_models}));
        }
    });
}

function getHigherAndLowerBounds(percentString) {
    var lower = -1;
    var higher = 101;

    if (percentString == "< 1%") {
        higher = 1;
    } else if (percentString == "1 - 10%") {
        lower = 1;
        higher = 10;
    } else if (percentString == "10 - 17%") {
        lower = 10;
        higher = 17;
    } else if (percentString == "17 - 50%") {
        lower = 17;
        higher = 50;
    } else {
        lower = 50;
    }

    return {higher: higher, lower: lower};
}

function sortByPercent(myList) {
    return myList.slice(0).sort(function(a, b) {
        return a.percent - b.percent;
    });
}

function updateTableTitle(divId, title, textColor, dataItemIndex) {
    var myBg = 'rgba(255,255,255,.7)';
    if (dataItemIndex == 2 || dataItemIndex == 3 || dataItemIndex == 4) {
        myBg = 'rgba(0,0,0,.7)';
    }
    $('#' + divId)
        .html(title)
        .css({
            'color': textColor,
            'font-weight': 'bold',
            'font-size': '16px',
            'background-color': myBg,
            'border-top': '1px solid black',
            'border-left': '1px solid black',
            'border-right': '1px solid black',
            'border-radius': '10px',
            'padding': '.5em'
        });
}

function formatStatusPercentage(value) {
    return value < .01 && value > 0 ? '< 0.01' : value.toFixed(2);
}

function formatAcres(value) {
    if (!value) return "";
    return value.toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function escapeSingleQuotesInString(str) {
    return str.replace(/'/g, "\\'");
}
