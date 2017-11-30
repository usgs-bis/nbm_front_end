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

PlaceOfInterestSearch.prototype.lookup = function (text) {
    var that = this;
    this.clearSearchButton.show();
    $(".googleResults").remove();

    $.getJSON(myServer + "/main/searchGooglePlaces?query="+text, function (data) {
        that.searching = false;
        that.clearSearchButton.text("Clear Search");
        $(".googleResults").remove();
        if (data.results && data.results.length) {
            $.each (data.results, function (index, obj) {
                var result = new SearchResult(obj);
                that.resultsElement.append(result.htmlElement);
                if (data.results.length === 1) {
                    result.htmlElement.click();
                }
            });
        } else {
            that.resultsElement.append(that.noResults);
        }
    });
};

PlaceOfInterestSearch.prototype.getSearchButton = function () {
    return this.searchButton;
};

PlaceOfInterestSearch.prototype.getClearButton = function () {
    return this.clearSearchButton;
};


var SearchResult = function (result) {
    this.htmlElement = $('<a href="#" class="list-group-item googleResults">\n' +
        '    <h4 class="list-group-item-heading">' + result.name + '</h4>\n' +
        '    <p class="list-group-item-text">' + result.formatted_address + '</p>\n' +
        '  </a>');

    this.bounds = L.latLngBounds(
        L.latLng(result.geometry.viewport.southwest.lat, result.geometry.viewport.southwest.lng),
        L.latLng(result.geometry.viewport.northeast.lat, result.geometry.viewport.northeast.lng)
    );

    this.initialize();
};

SearchResult.prototype.initialize = function () {
    var that = this;
    this.htmlElement.on("click", function (event) {
        event.preventDefault();
        $(".list-group-item").removeClass("active");
        that.htmlElement.addClass("active");
        that.panTo();
    });
};

SearchResult.prototype.panTo = function () {
    map.flyToBounds(this.bounds);
};