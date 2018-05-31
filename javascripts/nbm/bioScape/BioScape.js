'use strict';

/**
 * BioScape object.
 * @param {string} id - the bioScape id
 * @param {string} title - the bioScape title
 * @param {string} summary - the summary/description of the bioScape
 * @param {string|undefined} rightPanelMessage - the message to display in the right panel when no area is selected
 * @param {Array.<*>} sections - the sections in this bioScape
 * @param {Array.<Object>} summarizationLayers - array of any object inheriting BioScapeLayerBase - the all of
 *  summarization layers to use for this bioScape
 * @constructor
 */
var BioScape = function(id, title, summary, rightPanelMessage, sections, summarizationLayers, customBioscape, additionalParams, initBapState) {
    this.id = id;
    this.title = title;
    this.summary = summary;
    this.sections = sections;
    this.summarizationLayers = summarizationLayers;
    this.definitionUrl = 'https://www.sciencebase.gov/catalog/item/5667124be4b06a3ea36c8be6';
    this.definition = 'There is no definition available currently, ScienceBase was unreachable.';
    this.rightPanelMessage = rightPanelMessage;
    this.customBioscape = customBioscape;
    setDefinition(this);
    this.state = {};
    this.initBapState = initBapState;
    this.additionalParams = additionalParams;
    
    /**
     * Send a json request to ScienceBase for the definition of 'Bioscape'. Set the definition if there is a
     *  successful response.
     * @param {BioScape} that - this BioScape
     */
    function setDefinition(that) {
        sendJsonRequestHandleError(that.definitionUrl)
            .then(function(data) {
                if(data && data.body) {
                    that.definition = data.body;
                }
            })
            .catch(function() {
                console.log('There was an issue trying to get a definition from ScienceBase.');
            });
    }

    /**
     * Initializes the BioScape by initializing all of the sections. Promise is resolved once all
     *  sections complete initialization.
     * @promise
     */
    this.initializeBioScape = function() {
        let that = this;
        var promises = this.sections.map(function(section) {
            return section.initializeGroup();
        });
        if(this.initBapState.enabled){
            showSpinner(true)
        }
        if(this.initBapState.layers.length){
            this.initBapState.layers.forEach(function(l) {
                let layer = that.getLayer(l.id)
                if(layer.summarizationRegion || layer.baseMap){
                    layer.turnOffLayer()
                    that.toggleLayer(layer)
                }
            })
        }

        //this.updateState();
        return Promise.all(promises);
    };

    /**
     * Return the bioScape section with id or undefined if no section with id is found.
     * @param {string} id - id of the section to return
     * @returns {*|undefined}
     */
    this.getSection = function(id) {
        var result = undefined;
        this.sections.forEach(function(section) {
            if(section.id === id) {
                result = section;
            }
        });
        return result
    };

    /**
     * Returns all bioScape sections that don't have an id of 'basemaps', unless includeBasemap is true.
     * @param {boolean} [includeBasemap] - include basemap sections - optional
     * @returns {Array.<*>}
     */
    this.getAllSections = function(includeBasemap) {
        var result = [];
        this.sections.forEach(function(section) {
            if(section instanceof BioScapeBaseMapGroup && !includeBasemap) {
                return;
            }
            result.push(section);
        });

        return result;
    };

    /**
     * Returns all non base map layers in the BioScape, unless includeBasemaps is true.
     * @param {boolean} [includeBasemaps - include basemaps - optional
     * @returns {Array.<*>}
     */
    this.getAllLayers = function(includeBasemaps) {
        var result = [];
        var sections = this.getAllSections(includeBasemaps);
        sections.forEach(function(section) {
            result = result.concat(section.getLayers());
        });

        return result;
    };

    /**
     * Returns all non base map layers that are currently visible on the map in the BioScape.
     * @returns {Array.<*>}
     */
    this.getVisibleLayers = function() {
        var result = [];
        var layers = this.getAllLayers();
        layers.forEach(function(layer) {
            if (layer.isVisible()) {
                result.push(layer);
            }
        });

        return result;
    };

    /**
     * Returns the available summarization layers in the BioScape. Only return selected summarization layers,
     *  or if non are selected return the default layer if one exists.
     * @returns {Array.<*>}
     */
    this.getSummarizationLayers = function() {
        var result = [];
        var defaultLayer;
        this.summarizationLayers.forEach(function(layer) {
            if(layer.selected) {
                result.push(layer);
            } else if (layer.defaultSummaryLayer) {
                defaultLayer = layer;
            }
        });

        if (result.length == 0 && defaultLayer) {
            result.push(defaultLayer);
        }

        return result;
    };

    /**
     *  Returns all layers that are currently selected in the BioScape.
     * @returns {Array.<*>}
     */
    this.getSelectedLayers = function() {
        var result = [];
        var layers = this.getAllLayers(true);
        layers.forEach(function(layer) {
            if(layer.selected) {
                result.push(layer);
            }
        });

        return result;
    };

    /**
     * Returns the layer with id or undefined.
     * @param {string} id - id of the layer to return
     * @returns {undefined|Object}
     */
    this.getLayer = function(id) {
        var layers = this.getAllLayers();

        for(var i = 0; i < layers.length; i++) {
            if(layers[i].id === id) {
                return layers[i];
            }
        }

        return undefined;
    };


    this.toggleLayer = function (layer) {
        var section = bioScape.getSection(layer.section.id);
        section.toggleLayer(layer.id);
    }

    /**
     * Returns the current state of the BioScape.
     * @returns {{}|{layers: string}}
     */
    this.getState = function() {
        return btoa(JSON.stringify(this.state));
    };


    /**
     * Updates the state of the BioScape and calls StateKeeper.updateUrl.
     */
    this.updateState = function(bap) {

        if(!bap){
            bap = this.state || {}
        }
        this.state ={}
        let layerData = []
        if(bap.id) this.state.id = bap.id
        if(bap.time) this.state.time = bap.time
        this.state.enabled = bap.enabled

        var layers = this.getVisibleLayers();
           
        layers.forEach(function(layer) {
            let l = {}
            l.id = layer.id
            l.opacity = layer.getOpacity()
            if(layer.mapLayer.timeControl){
                l.time = layer.mapLayer.timeControl
            }
            layerData.push(l)
        });

        this.state.layers = layerData
    
        if (this.customBioscape) {
            this.state.customBioscape = this.customBioscape;
        }
        
        updateUrlWithState()
    }

    this.getAllBaps = function() {
        let allBaps = []
        $.each(actionHandlerHelper.enabledActions, function (index, action) {
            $.each(action.config.baps, function (index, bap) {
                allBaps.push(bap)
            })
        })
        return allBaps
}

};