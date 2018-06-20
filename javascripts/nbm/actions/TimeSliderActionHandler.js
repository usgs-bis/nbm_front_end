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
    this.playing = false;
    this.waiting = false;

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

    window.onblur = function() {
        that.pause()
     };

    var sliderTooltip = function (event, ui) {
        var curValue = ui.value || time.defaultDate;
        var tooltip = '<div class="tooltip"><div class="tooltip-inner">' + 'Map Display: ' + curValue + '</div><div class="tooltip-arrow"></div></div>';
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
    var tooltip = '<div class="tooltip"><div class="tooltip-inner">' + 'Map Display: ' + curValue + '</div><div class="tooltip-arrow"></div></div>';
    that.ts.find('.ui-slider-handle').html(tooltip);

    that.ts.find('.ui-slider-handle').removeClass("ui-corner-all ui-state-default").addClass( "glyphicon glyphicon-tag customSliderHandle" );


    
    // recursive function to fade in the layers
   GlobalTimeSlider.prototype.fade = function (targetOpacity,layer1,layer2,year,fade,timeOut) {

       let layer1Opacity = Number(layer1.options.opacity)
       let layer2Opacity = Number(layer2.options.opacity)

        if(layer1Opacity > 0 ){
            setTimeout(function(){
                layer1Opacity -= fade
                layer2Opacity += fade
                layer1.setOpacity(layer1Opacity);
                layer2.setOpacity(layer2Opacity);
                that.fade(targetOpacity,layer1,layer2,year,fade,timeOut)
            }, timeOut)
        }
        else{
            // done fading, update the copy layer for next time
            layer1.setParams({
                "time": year,
            });
            that.waiting = false
        }
   }
   

    this.ts.slider({
        change: function (event, ui) {
            let val = ui.value
            $.each(that.layerList, function (index, layer) {
                if (that.playing) {
                    
                    // //Get the current opacity of the layer
                    let startOpacity = Number($(`#opacitySliderInput${layer.id}` ).val()) //Number(layer.mapLayer.leafletLayer.options.opacity);

                    //Show the layer copy
                    layer.mapLayer.layerCopy.setOpacity(startOpacity);

                    // //Hide the original layer and update its params with the next time value
                    layer.mapLayer.leafletLayer.setOpacity(0.0);

                    // get the new time layer
                    that.waiting = true
                    layer.mapLayer.timeControl = val;
                    layer.mapLayer.leafletLayer.setParams({
                        "time": val,
                    })

                    // then once the new layer is completly loaded begin the fade
                    layer.mapLayer.leafletLayer.on('load', function (event) {
                        setTimeout(function(){  that.fade(startOpacity,layer.mapLayer.layerCopy,layer.mapLayer.leafletLayer,val,0.05,50)},200)
                    });

                } else {
                    layer.mapLayer.timeControl = val;
                    layer.mapLayer.leafletLayer.setParams({
                        "time": val,
                    })
                    layer.mapLayer.layerCopy.setParams({
                        "time": val,
                    });
                }
                // other.addTo(map);
                that.checkoutOfRange(val, layer);
            })
            var curValue = ui.value || time.defaultDate;
            var tooltip = '<div class="tooltip"><div class="tooltip-inner">' + 'Map Display: ' + curValue + '</div><div class="tooltip-arrow"></div></div>';
            that.ts.find('.ui-slider-handle').html(tooltip);
            bioScape.updateState()
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
                setTimeout(function(){that.updateTime(ti)}, 2500)
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

        // transition has finished
        if(this.waiting){
            setTimeout(function(){
                that.updateTime(ti)
            },500)
            return
        }

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

GlobalTimeSlider.prototype.setToTime = function (year){
    year = parseInt(year)
    this.ts.slider("value", year);
}

GlobalTimeSlider.prototype.setToRange = function (years){
    if(years.length != 2) return

    let ts = $("#GlobalTimeSliderRange")
    ts.slider( "option", "values", [ parseInt(years[0]), parseInt(years[1])] );
}

GlobalTimeSlider.prototype.showTimeSlider = function(show){

    let ts = $("#GlobalTimeSlider");
    let tsr = $("#GlobalTimeSliderRange")
    let gtc = $("#GlobalTimeControl")
    if(show != undefined){
        ts.slider( "enable" );
        tsr.slider( "enable" );
        tsr.css( "opacity", 1 );
        gtc.css( "opacity", 1 );
    }
    else{
        ts.slider( "disable" );
        tsr.slider( "disable" );
        gtc.css( "opacity", .6 );
        tsr.css( "opacity", 0 );
    }
}
