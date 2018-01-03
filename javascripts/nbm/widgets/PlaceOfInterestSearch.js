'use strict';

var PlaceOfInterestSearch = function () {
    this.searchButton = $('<input type="text" style="position: relative; top: 0;" class="form-control" placeholder="Search for Place of Interest" />');
    this.resultsElement = $('#searchResults');
    this.clearSearchButton = $('<a style="display: none;" href="#" class="list-group-item">Clear Search</a>');
    this.noResults = $('<a href="#" class="list-group-item list-group-item-danger googleResults">No Results</a>');
    this.searching = false;
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
    var that = this;
    this.clearSearchButton.show();
    $(".googleResults").remove();
    var testtext = "https://beta-gc2.datadistillery.org/api/v1/sql/dawsons2?q=SELECT%20gid,fullname%20from%20public.nps_boundaries%20where%20fullname%20ilike(%27%"+ text+"%%27)%20Limit%2010";
    var testElastic = "https://beta-gc2.datadistillery.org/api/v1/elasticsearch/search/dawsons/dawsons3/export_output/_search?q={%22query%22:{%22match_phrase_prefix%22:{%22properties.fullname%22:%22"+text+"%22}}}";
    $.getJSON(testElastic, function (data) {
        that.searching = false;
        that.clearSearchButton.text("Clear Search");
        $(".googleResults").remove();
        if (data.hits ) {
            $.each (data.hits.hits, function (index, obj) {
                console.log("obj = "+obj);
                var result = new SearchResult(obj);
                that.resultsElement.append(result.htmlElement);
                //if (data.features.length === 1) {
                //    result.htmlElement.click();
                //}
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


var SearchResult = function (result) {
    var id_choice = result._source.properties.gid;
    this.htmlElement = $('<a href="#" class="list-group-item googleResults">\n' +
        '    <h4 class="list-group-item-heading" gid=' + id_choice +'>' + result._source.properties.fullname + '</h4>\n'
        +
        '  </a>');
    this.initialize();
};

SearchResult.prototype.initialize = function () {
    var that = this;
    this.htmlElement.on("click", function (event) {
        var elem = that.htmlElement[0];
        var gid = elem.firstElementChild.getAttribute("gid");
        event.preventDefault();
        $(".list-group-item").removeClass("active");
        that.htmlElement.addClass("active");
        that.getSelectedUnit(gid);
        //    that.panTo();
    });
};
SearchResult.prototype.getSelectedUnit = function(gid){
    console.log('in getselected unit gid =  '+ gid);
    var sqlquery = "https://beta-gc2.datadistillery.org/api/v1/sql/dawsons?SELECT * from dawsons3.export_output where gid = 301";
    var selectShape = "https://beta-gc2.datadistillery.org/api/v1/elasticsearch/search/dawsons/dawsons3/export_output/_search?q={%22query%22:{%22match_phrase_prefix%22:{%22properties.gid%22:"+gid+"}}}";
    $.getJSON(selectShape, function (data) {
        if (data.hits.hits ) {
            $.each (data.hits.hits, function (index, obj) {
                // var result = new SearchResult(obj);
                console.log('result object = ' + obj);
                var p = obj._source.geometry.coordinates;
                var x = p[0][0];
                // Could build polygon, get center and do fly to..
                //              console.log('P = '+ p);


                var xx = reverseLonLat(x);
                var pb = L.polygon(xx);
                var gj = pb.toGeoJSON();
                L.geoJSON(gj).addTo(map);
                console.log ('is it there?');

            });
        }
    });

};
SearchResult.prototype.panTo = function () {

    map.flyToBounds(this.bounds);
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