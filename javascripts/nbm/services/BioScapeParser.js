'use strict';

/**
 * BioScapeParser service.
 *
 * Public methods:
 * parse(data, state) - parse the BioScape settings from the configuration and create the BioScape using
 *  the saved state
 */
var BioScapeParser = (function(bioScapeParser) {
    /**
     * Create a BioScape from the raw data from the configuration.
     * @param {*} data - the configuration data
     * @param {Object} state - state of the application
     * @returns {Object} - BioScape
     */
    function parse(data, state) {
        displayBioscapeDetails(data);
        addUserControls(data);
        var groups = [];
        var layersState = getLayerIds(state);
        var summarizationLayers = [];
        for (var i = 0; i < data.layerSections.length; i++) {
            var serverGroup = data.layerSections[i];
            var group = parseGroupFromServer(i, serverGroup, layersState);
            groups.push(group);
            summarizationLayers = summarizationLayers.concat(group.getSummarizationLayers());
        }
        return new BioScape(state.bioscape ? state.bioscape : data.id, data.title, data.summary, data.rightPanelMessage, groups, summarizationLayers, state.customBioscape);
    }

    /**
     * Display meta data about the BioScape.
     * @param {*} data - JSON object from the config
     */
    function displayBioscapeDetails(data) {
        var summary =  '';
        var shortSummary;
        if(data.summary) {
            summary = data.summary;
            if(data.summary.length > 175) {
                shortSummary = summary.substring(0, 175) + "...";
            }
        }

        var longDisplay = shortSummary ? "none" : "inline";
        var viewData = {
            summaryData: {
                summary: summary,
                shortSummary: shortSummary,
                longDisplayCss: longDisplay,
                toggleId: 'bioScape'
            },
            lastUpdated: data.lastUpdated
        };
        var html = getHtmlFromJsRenderTemplate('#bioScapeDetailsTemplate', viewData);

        $("#bioScapeTitle").html(data.title);
        $("#bioScapeDetails").html(html);
    }

    /**
     * Turn on controls for the UI if present in the config json.
     * @param {*} data - BioScape json from the server
     */
    function addUserControls(data) {
        if (data.displayFileDownload) {
            $('#mapControlContainer').append(getHtmlFromJsRenderTemplate('#downloadButton'));

            var downloadButton = $('#downloadFile');
            downloadButton.popover({
                html: true,
                trigger: 'focus',
                title: 'Select a layer to download it\'s data <button class="close">&times;</button>',
                content: function() {
                    var layers = bioScape.getVisibleLayers();

                    return getHtmlFromJsRenderTemplate('#downloadPopoverTemplate', {zoomedOut: map.getZoom() < 9, layers: layers});
                }
            }).on('shown.bs.popover', function(e) {
                // 'aria-describedby' is the id of the current popover
                var id = '#' + $(e.target).attr('aria-describedby');
                var popover = $(id);

                popover.find('.close').on('click', function(){
                    downloadButton.popover('hide');
                });
                $('.layerDownload').on('click', function() {
                    $(this).tooltip('hide');
                    var layer = bioScape.getLayer(this.id);

                    if(layer && layer.mapLayer.downloader) {
                        layer.mapLayer.downloader.download();
                    }
                });
            })
            //fix for known bug in bootstrap
                .on('hidden.bs.popover', function (e) {
                    $(e.target).data("bs.popover").inState.click = false;
                });
        }

        if (data.placeOfInterestSearch) {
            actionHandlers.push(new SearchActionHandler(data.placeOfInterestSearch, {}));
        }
    }

    /**
     * Parse a BioScape section from a configuration section.
     * @param {number} index
     * @param {*} serverGroup - group configuration
     * @param {Array.<string>} layers - ids of the layers to turn on (from the saved state)
     * @returns {BioScapeBaseMapGroup|BioScapeGroup}
     */
    function parseGroupFromServer(index, serverGroup, layers) {
        var id = 'section' + index;
        if(serverGroup.title.toLowerCase() === 'basemaps' || serverGroup.title.toLowerCase() === 'basemap') {
            return new BioScapeBaseMapGroup('basemaps', serverGroup, layers);
        }
        return new BioScapeGroup(id, serverGroup, layers);
    }

    /**
     * Get the layer ids from the saved state if any.
     * @param {Object} state - the saved state
     * @returns {Array.<string>|[]}
     */
    function getLayerIds(state) {
        var ids = [];
        if(!state.layers) {
            return ids;
        }
        var layers = state.layers.split(';');
        layers.forEach(function(layer) {
            var arr = layer.split(':');
            ids.push(arr[1]);
        });

        return ids;
    }

    bioScapeParser = {
        parse: parse
    };

    return bioScapeParser;
})(BioScapeParser || {});
