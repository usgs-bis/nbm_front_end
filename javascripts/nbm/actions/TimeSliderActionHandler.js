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
    this.playButtonDiv = $("#GlobalTimeControlPlay");
    this.ts = $("#GlobalTimeSlider");
    this.layerList = [];
    this.palying = false;

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
        slide: sliderTooltip
    });


    var curValue = time.defaultDate;
    var tooltip = '<div class="tooltip"><div class="tooltip-inner">' + curValue + '</div><div class="tooltip-arrow"></div></div>';
    that.ts.find('.ui-slider-handle').html(tooltip);

    that.ts.find('.ui-slider-handle').removeClass("ui-corner-all ui-state-default").addClass( "glyphicon glyphicon-tag customSliderHandle" );


    this.ts.slider({
        change: function (event, ui) {
            let val = ui.value
            $.each(that.layerList, function (index, layer) {
                layer.mapLayer.timeControl = val;
                layer.mapLayer.leafletLayer.setParams({
                    "time": val,
                })
                that.checkoutOfRange(val, layer);
            })
            var curValue = ui.value || time.defaultDate;
            var tooltip = '<div class="tooltip"><div class="tooltip-inner">' + curValue + '</div><div class="tooltip-arrow"></div></div>';
            that.ts.find('.ui-slider-handle').html(tooltip);
        }
    });

    $( "#GlobalTimeSliderbutton" ).click(function() {

        if($(GlobalTimeSliderbuttonPlay).is(":visible")){
            that.play()
            that.playTimeSlider(true);
        }
        else{
            that.pause()
            that.playTimeSlider(false);

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


};


GlobalTimeSlider.prototype.playTimeSlider = function (play) {
    let that = this
    //play 
    if(play && this.playing){
        let layerFound = false;
        $.each(that.layerList, function (index, layer) {
            if(layer.enabled){
                layerFound = true
                let ti = layer.getTimeInfo()
                let startDate = ti.startDate
                let endDate = ti.endDate
                let currValue = that.ts.slider( "value" )

                if(currValue < startDate || currValue > endDate) that.ts.slider( "value",startDate );
                setTimeout(function(){that.updateTime(ti)}, 2000) 
            }
        })
        if(!layerFound){
            this.playing = false;
            $(GlobalTimeSliderbuttonPlay).show()
            $(GlobalTimeSliderbuttonPause).hide()
            actionHandlerHelper.showTempPopup("Please select a time enabled layer to use this feature.");
        } 
        
    }
    // pause
    else{
        //this.playing = false;
        that.pause()
    }

};

GlobalTimeSlider.prototype.updateTime = function (ti) {
    let that = this
    if(this.playing){

        let startDate = ti.startDate
        let endDate = ti.endDate
        let currValue = that.ts.slider( "value" )

        if(currValue < startDate || currValue == endDate){
            that.ts.slider( "value",startDate );
        }
        else if(currValue + 1 == endDate){
            that.ts.slider( "value",currValue + 1 );
            // $(GlobalTimeSliderbuttonPlay).show()
            // $(GlobalTimeSliderbuttonPause).hide()
            // this.playing = false;
            that.pause()
            return
        }
        else{
            that.ts.slider( "value",currValue + 1 );
        }
        that.playTimeSlider(true)
    
       
       
    }
}

GlobalTimeSlider.prototype.play = function () {
    $(GlobalTimeSliderbuttonPlay).hide()
    $(GlobalTimeSliderbuttonPause).show()
    $("#mySpinner").addClass("hideLayerSpinner")
    this.playing = true
}


GlobalTimeSlider.prototype.pause = function () {
    $(GlobalTimeSliderbuttonPlay).show()
    $(GlobalTimeSliderbuttonPause).hide()
    $("#mySpinner").removeClass("hideLayerSpinner")
    this.playing = false
}
