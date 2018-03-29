'use strict';

/**
 * The action object for when polygons are submitted. Calls the parent ActionHandler object.
 * @param {Object} config - the actionConfig inside the bioscape for this layer
 * @param {Object} layer

 * @constructor
 */
var TimeSliderActionHandler = function (config, layer) {

    this.gts = new GlobalTimeSlider(config, this)
    this.gts.initialize()

    ActionHandler.call(this, config, layer);

};


inherit(ActionHandler, TimeSliderActionHandler);



let GlobalTimeSlider = function (config, parent) {
    this.parent = parent;
    this.startDate = parseInt(config.startDate)
    this.endDate = parseInt(config.endDate)
    this.defaultDate = parseInt(config.defaultDate) || config.startDate;
    this.autoRangeAdjust = config.autoRangeAdjust;
    this.timeSliderDiv = $("#GlobalTimeControl");
    this.ts = $("#GlobalTimeSlider");
    this.layerList = [];

};

/**
 * Initialize the global time slider
 */
GlobalTimeSlider.prototype.initialize = function () {

    let that = this;
    this.timeSliderDiv.show();
    let time = { startDate: this.startDate, endDate: this.endDate, defaultDate: this.defaultDate };
    var html = getHtmlFromJsRenderTemplate('#GlobalTimeSliderTemplate', time);
    this.timeSliderDiv.html(html);

    var sliderTooltip = function (event, ui) {
        var curValue = ui.value || time.defaultDate;
        var tooltip = '<div class="tooltip"><div class="tooltip-inner">' + curValue + '</div><div class="tooltip-arrow"></div></div>';
        that.ts.find('.ui-slider-handle').html(tooltip);
    };

    this.ts = $("#GlobalTimeSlider").slider({
        value: that.defaultDate,
        min: that.startDate,
        max: that.endDate,
        step: 1,
        create: sliderTooltip,
        slide: sliderTooltip
    });


    this.ts.slider({
        change: function (event, ui) {
            let val = ui.value
            $.each(that.layerList, function (index, layer) {
                layer.mapLayer.timeControl = val;
                layer.mapLayer.leafletLayer.setParams({
                    "time": val
                })
                that.checkoutOfRange(val, layer);
            })
        }
    });

};


/**
 * allow time enabled layers to subscribe to the slider
 * so that change events get pushed out to the layer
 * When a layer subscribes, it will hide its individual
 * time slider
 */
GlobalTimeSlider.prototype.subscribe = function (layer) {
    this.layerList.push(layer);
    $("#" + layer.id + "TimeControl").html('')
    this.ts.slider("value", this.defaultDate);
    this.updateSliderRange(layer.getTimeInfo());
};


/**
 * Set limits of gloable time slider depending on layer selected
 * TODO: Here is where we could adjust the range from the config
 * based on the range of the layers.
 */
GlobalTimeSlider.prototype.updateSliderRange = function (time) {

    if (this.autoRangeAdjust) {

        let min = this.ts.slider("option", "min");
        let max = this.ts.slider("option", "max");

        if (min > time.startDate) {
            this.ts.slider("option", "min", time.startDate);
            $("#timeSliderLabelLeft").html(time.startDate);

        }
        if (max < time.endDate) {
            this.ts.slider("option", "max", time.endDate);
            $("#timeSliderLabelRight").html(time.endDate);
        }
    }
};


/**
 *  Adds CSS when a layer goes out of range of the time slider
 *  Add's 'out of range' text to layer title   
 */
GlobalTimeSlider.prototype.checkoutOfRange = function (val, layer) {

    let time = layer.getTimeInfo()
    let layerBlock =  $("#" + layer.id);
    if (val < time.startDate) {
        layerBlock.addClass("out-of-range");
        layerBlock.find(".layerTitle").find("span:first").text(layer.title + " (Out of Range)")
    }
    else if (val > time.endDate) {
        layerBlock.addClass("out-of-range");
        layerBlock.find(".layerTitle").find("span:first").text(layer.title + " (Out of Range)")
    }
    else {
        layerBlock.removeClass("out-of-range");
        layerBlock.find(".layerTitle").find("span:first").text(layer.title)
    }


}
