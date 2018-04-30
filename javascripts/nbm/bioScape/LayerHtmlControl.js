'use strict';

/**
 * This callback is called to get the DOM element associated with the BioScape layer.
 * @callback jQueryControlSelectorCallback
 * @param {string} layerId - id of the layer to return
 */

/**
 * Updates and handles html changes to BioScape layers.
 * @param {Object} section - section of the control
 * @param {string} selectionType - the selection type specified by the config json
 * @param {jQueryControlSelectorCallback} jQueryControlSelectorCallback - callback to get the layer DOM element
 * @param {*} [cssClasses={{radioCssOn: 'fa-check-circle-o', radioCssOff: 'fa-circle-thin', nonRadioCssOn: 'fa-check-square-o', nonRadioCssOff: 'fa-square-o'}}]
 *  - css classes to use - optional
 * @constructor
 */
var LayerHtmlControl = function(section, selectionType, jQueryControlSelectorCallback, cssClasses) {
    selectionType = getValueOrDefault(selectionType, 'checkbox');

    var sectionIsRadio = selectionType === 'radio';
    var radioCssOn = 'fa-check-circle-o';
    var radioCssOff = 'fa-circle-thin';
    var nonRadioCssOn = 'fa-check-square-o';
    var nonRadioCssOff = 'fa-square-o';

    if(cssClasses) {
        if(cssClasses.radioCssOn !== undefined) radioCssOn = cssClasses.radioCssOn;
        if(cssClasses.radioCssOff !== undefined) radioCssOff = cssClasses.radioCssOff;
        if(cssClasses.nonRadioCssOn !== undefined) nonRadioCssOn = cssClasses.nonRadioCssOn;
        if(cssClasses.nonRadioCssOff !== undefined) nonRadioCssOff = cssClasses.nonRadioCssOff;
    }
    this.layerOnCss = sectionIsRadio ? radioCssOn : nonRadioCssOn;
    this.layerOffCss = sectionIsRadio ? radioCssOff : nonRadioCssOff;

    /**
     * If selection type is radio than update the other layers.
     */
    this.handleOtherLayers = function(secondPass) {
        if(!sectionIsRadio) return;
        section.handleOtherLayers(secondPass);
    };
    /**
     * Handle turning off a layer.
     * @param {string} layerId - id of the layer to turn off
     */
    this.handleTurnOff = function(layerId) {
        var slider = $('#' + layerId + ' .sliderContainer').first();
        slider.hide();
        jQueryControlSelectorCallback(layerId)
            .removeClass(this.layerOnCss)
            .addClass(this.layerOffCss);
    };
    /**
     * Handle turning on a layer.
     * @param {string} layerId - id of the layer to turn on
     */
    this.handleTurnOn = function(layerId) {
        var slider = $('#' + layerId + ' .sliderContainer').first();
        slider.show();
        jQueryControlSelectorCallback(layerId)
            .removeClass(this.layerOffCss)
            .addClass(this.layerOnCss);
    };
};