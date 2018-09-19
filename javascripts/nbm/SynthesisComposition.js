'use strict';

var SynthesisComposition = function () {
    this.id = undefined;
    this.featureValue = undefined;
    this.headerBap = undefined;
    this.baps = {};
    this.pdf = undefined;
};

SynthesisComposition.prototype.cleanUp = function () {
    if (this.headerBap) {
        this.headerBap.cleanUp();
        this.headerBap = undefined;
    }

    $.each(this.baps, function (id, bap) {
        if (bap) {
            bap.cleanUp();
        }
    });

    this.baps = {};
    this.pdf = undefined;
    this.id = undefined;
    this.featureValue = undefined;
    // $("#synthesisCompositionBody").html("");
};

SynthesisComposition.prototype.setPdf = function (marker) {
    var definitionUrl = 'https://www.sciencebase.gov/catalog/item/565897c8e4b071e7ea540309';
    var definition = 'There is no definition available currently, ScienceBase was unreachable.';
    var that = this;
    var synCompDetails = this.headerBap.config;
    var bapsAsList = [];
    $.each(this.baps, function (id, bap) {
        bapsAsList.push(bap);
    });
    sendJsonRequestHandleError(definitionUrl)
        .then(function(data) {
            if(data && data.body) {
                definition = data.body;
            }
        })
        .catch(function(error) {
            console.log(error.message);
        })
        .then(function() {
            showSpinner();
            setTimeout(function(){
                that.pdf = new PDF(bioScape, synCompDetails.title, synCompDetails.type, formatAcres(synCompDetails.acres), synCompDetails.description, synCompDetails.webLinks, definition, definitionUrl, map, bapsAsList);
                that.pdf.buildAndDownload(marker);
            },500);
        });
};

SynthesisComposition.prototype.viewJson = function (additionalParams) {
    if (!additionalParams) additionalParams = {};

    if (this.id) {
        this.viewScJson(additionalParams)
    } else {
        this.viewBapListJson(additionalParams);
    }
};

SynthesisComposition.prototype.viewScJson = function (additionalParams) {
    additionalParams.id = this.id;
    additionalParams.featureValue = this.featureValue;

    console.log(additionalParams);

    var recursiveEncoded = $.param( additionalParams, true );

    window.open(myServer + "/bap/sc/?" + decodeURIComponent(recursiveEncoded));
};

SynthesisComposition.prototype.viewBapListJson = function (additionalParams) {
    var options = additionalParams;

    if (this.headerBap) {
        options.headerBapId = this.headerBap.sbId;
        options.headerBapFeatureValue = this.headerBap.featureValue;
    }

    options.baps = [];
    options.featureValues = [];

    $.each(this.baps, function (index, bap) {
        options.baps.push(bap.id);
        options.featureValues.push(bap.featureValue);
    });

    var recursiveEncoded = $.param( options, true );

    window.open(myServer + "/bap/list/?" + decodeURIComponent(recursiveEncoded));
};