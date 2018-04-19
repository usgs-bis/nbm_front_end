'use strict';

/**
 * BioScapeGroup for base map layers. Calls the BioScapeGroupBase constructor.
 * @param {string} id - id of the group
 * @param {*} serverGroup - section json from the server
 * @param {Array} layers - ids of the layers to turn on (from the saved state)
 * @constructor
 * @extends BioScapeGroupBase
 */
var BioScapeBaseMapGroup = function(id, serverGroup, layers){
    var layerHtmlControl = new LayerHtmlControl(this, serverGroup.selectionType, function(layerId) {return $("#" + layerId)}, {radioCssOn: 'active', radioCssOff: ''});
    BioScapeGroupBase.call(this, id, serverGroup, layers, layerHtmlControl);

    var that = this;

    this.getDisplayPopoverHtml = function() {
        var layersInfo = [];
        var layers = that.getLayers();
        layers.forEach(function(layer) {
            layersInfo.push({id: layer.id, title: layer.title, active: layer.selected ? 'active' : '', thumbnailImage: layer.thumbnailImage});
        });

        var viewData = {
            layers: layersInfo
        };

       
        return getHtmlFromJsRenderTemplate('#bioScapeBaseMapTemplate', viewData);
    };
    $("#baseMapSelector").append(this.getDisplayPopoverHtml())
     
    $('#bioScapeBaseMapForm input').on('change', function() {
        that.toggleLayer(this.id);
     });
};
inherit(BioScapeGroupBase, BioScapeBaseMapGroup);

BioScapeBaseMapGroup.prototype.createLayer = function(serverLayer, layerId) {
    return new BioScapeBaseMapLayer(layerId, this, serverLayer);
};
BioScapeBaseMapGroup.prototype.initializeGroup = function() {
    return BioScapeGroupBase.prototype.initializeGroup.call(this);
};
BioScapeBaseMapGroup.prototype.addHtmlToPage = function() {
    var baseMapContainer = $('#baseMapContainer');
    var self = this;
    baseMapContainer.popover({
        animation: true,
        html: true,
        placement: preventMultipleOpenPanels() ? 'bottom' : 'right',
        title: 'Base Maps <button class="close">&times;</button>',
        content: this.getDisplayPopoverHtml
    }).on('shown.bs.popover', function(e) {
        // 'aria-describedby' is the id of the current popover
        var id = '#' + $(e.target).attr('aria-describedby');
        var popover = $(id);

        popover.find('.close').on('click', function(){
            baseMapContainer.popover('hide');
        });
        $('.baseMapSelect').on('click', function() {
            self.toggleLayer(this.id);
            setTimeout(function() {
                baseMapContainer.popover('hide');
            }, 200);
        });
    })
    //fix for known bug in bootstrap
        .on('hidden.bs.popover', function (e) {
            $(e.target).data("bs.popover").inState.click = false;
        });
};
