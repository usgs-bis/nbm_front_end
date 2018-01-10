'use strict';

var PlaceOfInterestSearch = function (config) {
    this.searchButton = $('<input type="text" style="position: relative; top: 0;" class="form-control" placeholder="Search for Place of Interest" />');
    this.resultsElement = $('#searchResults');
    this.clearSearchButton = $('<a style="display: none;" href="#" class="list-group-item">Clear Search</a>');
    this.noResults = $('<a href="#" class="list-group-item list-group-item-danger googleResults">No Results</a>');
    this.searching = false;
    this.elasticEndpoint = config.elasticEndpoint;
    this.sqlEndpoint = config.sqlEndpoint;
    // this.elasticEndpoint = "http://34.229.92.5/api/v1/elasticsearch/search/jjuszakusgsgov/public/colorado_padus2_dissolve/_search?q=";
    this.featureGroup = undefined;
    this.actionHandler = new GetFeatureGeojsonActionHandler(config)
};

PlaceOfInterestSearch.prototype.initialize = function () {
    var that = this;
    this.searchButton.on("keypress", function (event) {
        that.onKeyPress(event);
    });

    this.searchButton.on("keyup", function(event){
        that.onKeyUp(event);
    });

    this.clearSearchButton.on("click", function (event) {
        event.preventDefault();
        that.clearSearch();
    });

    this.noResults.on("click", function (event) {
        event.preventDefault();
    });

    this.resultsElement.append(this.clearSearchButton);
};

PlaceOfInterestSearch.prototype.onKeyPress = function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        this.submitSearch();
    }
};

PlaceOfInterestSearch.prototype.onKeyUp = function(event){
    var s = this.searchButton[0];
    if (s){
        var cs = s.value.length;
        if (cs > 3){
            this.submitSearch();
        }
    }

};

PlaceOfInterestSearch.prototype.submitSearch = function () {
    var text = this.searchButton.val();
    if (text && !this.searching) {
        this.searching = true;
        this.clearSearchButton.text("Searching...");
        actionHandlerHelper.cleanUp(true);
        this.lookup(text);
    }
};

PlaceOfInterestSearch.prototype.clearSearch = function () {
    this.searchButton.val("");
    $(".googleResults").remove();
    this.clearSearchButton.hide();
};

// This will need to be rewritten to look at the right gc2 db and maybe make elastic search.
PlaceOfInterestSearch.prototype.lookup = function (text) {
    var elasticQuery = {
        "query" : {
            "multi_match" : {
                "fields" : ["properties.place_name"],
                "query" : text,
                "type" : "phrase_prefix"
            }
        }
    };

    var that = this;
    this.clearSearchButton.show();
    $(".googleResults").remove();
    var testElastic = this.elasticEndpoint + JSON.stringify(elasticQuery);
    $.getJSON(testElastic, function (data) {
        that.searching = false;
        that.clearSearchButton.text("Clear Search");
        $(".googleResults").remove();
        if (data.hits ) {
            var added = [];
            data.hits.hits.sort(function (a, b) {return b._score-a._score});
            $.each (data.hits.hits, function (index, obj) {
                // if (added.indexOf(obj._source.properties.unit_nm) === -1) {
                    var result = new SearchResult(obj, that);
                    that.resultsElement.append(result.htmlElement);
                    // added.push(obj._source.properties.unit_nm);
                // }
            });
        } else {
            that.resultsElement.append(that.noResults);
        }
    });
};

//PlaceOfInterestSearch.prototype.lookup = function (text) {
//    var that = this;
//    this.clearSearchButton.show();
//    $(".googleResults").remove();
//
//    $.getJSON(myServer + "/main/searchGooglePlaces?query="+text, function (data) {
//        that.searching = false;
//        that.clearSearchButton.text("Clear Search");
//        $(".googleResults").remove();
//        if (data.results && data.results.length) {
//            $.each (data.results, function (index, obj) {
//                var result = new SearchResult(obj);
//                that.resultsElement.append(result.htmlElement);
//                if (data.results.length === 1) {
//                    result.htmlElement.click();
//                }
//            });
//        } else {
//            that.resultsElement.append(that.noResults);
//        }
//    });
//};

PlaceOfInterestSearch.prototype.getSearchButton = function () {
    return this.searchButton;
};

PlaceOfInterestSearch.prototype.getClearButton = function () {
    return this.clearSearchButton;
};


var SearchResult = function (result, searchParent) {
    this.id = result._source.properties.gid;
    this.searchParent = searchParent;
    this.htmlElement = $('<a href="#" class="list-group-item googleResults">\n' +
        '    <h4 class="list-group-item-heading">' + result._source.properties.place_name + '</h4>\n'
        +
        '  </a>');
    this.initialize();
};

SearchResult.prototype.initialize = function () {
    var that = this;
    this.htmlElement.on("click", function (event) {
        var elem = that.htmlElement[0];
        var query = elem.firstElementChild.innerText;
        event.preventDefault();
        $(".list-group-item").removeClass("active");
        that.htmlElement.addClass("active");
        that.getSelectedUnit(query);
        //    that.panTo();
    });
};
SearchResult.prototype.getSelectedUnit = function (query){
    // var elasticQuery = {
    //     "query" : {
    //         "multi_match" : {
    //             "fields" : ["properties.gid"],
    //             "query" : this.id,
    //             "type": "phrase"
    //         }
    //     }
    // };

    var that = this;
    // var selectShape = this.searchParent.elasticEndpoint + JSON.stringify(elasticQuery) + "&SRS=4326";
    var selectShape = "" + this.searchParent.sqlEndpoint + this.id;
    console.log("What: ", selectShape);
    $.getJSON(selectShape, function (data) {
        console.log(data);
        that.searchParent.actionHandler.result = {geojson: data.features[0]};
        if (that.searchParent.actionHandler.feature) that.searchParent.actionHandler.feature.remove();
        that.searchParent.actionHandler.feature = new Feature(that.searchParent.actionHandler.result.geojson, undefined, "", false);
        that.searchParent.actionHandler.feature.show();
        if (!isVerticalOrientation()) {
            centerMapRight(that.searchParent.actionHandler.feature.getLeafetFeatureBounds());
        } else {
            centerMapBottom(that.searchParent.actionHandler.feature.getLeafetFeatureBounds());
        }
        // if (data.hits.hits ) {
        //     if (that.searchParent.featureGroup) {
        //         that.searchParent.featureGroup.removeFrom(map);
        //     }
        //     var features = [];
        //     $.each (data.hits.hits, function (index, obj) {
        //         console.log(obj);
        //         features.push(L.geoJSON(obj._source));
        //         // L.geoJSON(obj._source).addTo(map);
        //     });
        //     that.searchParent.featureGroup = L.featureGroup(features).addTo(map);
        //     that.panTo()
        // }
    });

};
SearchResult.prototype.panTo = function () {
    if (!isVerticalOrientation()) {
        centerMapLeft(this.searchParent.featureGroup.getBounds());
    } else {
        centerMapBottom(this.searchParent.featureGroup.getBounds());
    }
    // map.flyToBounds(this.searchParent.featureGroup);
};
function reverseLonLat (coordArray){
    var retArray = [];
    var kk = coordArray.length;
    console.log (' the array is '+ kk);
    for (var j=0;j < kk ; j++){
        var latlon = [];
        latlon.push(coordArray[j][1]);
        latlon.push(coordArray[j][0]);
        retArray.push(latlon);
    }
    return retArray;



};