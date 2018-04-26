'use strict';

var WidgetHelper = function () {
    this.marker = undefined;
    this.timeSlider = false;
};

WidgetHelper.prototype.getWidget = function (config,bap) {
    if (config.type === "hierarchyByPixel") {
        return new HierarchyByPixelWidget(config);
    } else if (config.type === "hierarchyTable") {
        return new HierarchyTableWidget(config);
    } else if (config.type === "eco") {
        return new EcosystemProtectionWidget(config);
    } else if (config.type === "species") {
        return new SpeciesProtectionWidget(config);
    } else if (config.type === "richness") {
        return new SpeciesRichnessWidget(config);
    } else if (config.type === "dynamicMatrix") {
        return new CnrMatrixWidget(config);
    } else if (config.type === "boxAndWhisker") {
        return new BoxAndWhiskerWidget(config,bap);
    } else if (config.type === "rasterQuery") {
        return new BarChartWidget(config);
    } else if (config.type === "vectorQuery") {
        return new BarChartWidget(config);
    } else if (config.type === "nfhp") {
        return new NFHPWidget(config);
    } else if (config.type === "nfhp_disturbance") {
        return new NFHPDisturbanceWidget(config);
    } else if (config.type === "hierarchyByPixelElastic") {
        return new HBPElasticWidget(config);
    } else if (config.type === "hierarchyTableElastic") {
        return new HierarchyTableWidgetElastic(config);
    } else if (config.type === "histogram") {
        return new HistogramWidget(config,bap);
    } else if (config.type === "smoothPlot") {
        return new SmoothPlotWidget(config,bap);
    }
};

WidgetHelper.prototype.addTimeSlider = function(){
    if (this.timeSlider){
        let t = $("#GlobalTimeSliderRange")
        t.trigger('slidechange');
        return (t)
    } 

    $("#GlobalTimeControl").append('<div id="GlobalTimeSliderRange" class=" GlobalTimeSliderRange"></div>')
    let globalTs = $("#GlobalTimeSlider").slider( "widget" );
    let ts = $("#GlobalTimeSliderRange")

    let min = globalTs.slider("option", "min");
    let max = globalTs.slider("option", "max");
    let t1Value = (min + .25*(max-min)).toFixed(0)
    let t2Value = (min + .5*(max-min)).toFixed(0)

    var sliderTooltip = function (event, ui) {
        
        if(ui.values){
            t1Value = ui.values[0]
            t2Value = ui.values[1]
        }

        var tooltip1 = '<div class="tooltip"><div class="tooltip-inner">' + t1Value + '</div><div class="tooltip-arrow"></div></div>';
        var tooltip2 = '<div class="tooltip"><div class="tooltip-inner">' + t2Value + '</div><div class="tooltip-arrow"></div></div>';
        ts.find('span:eq( 0 )').html(tooltip1);
        ts.find('span:eq( 1 )').html(tooltip2);
    };

  

    ts.slider({
        range: true,
        min: min,
        max: max,
        step: 1,
        values: [ t1Value,t2Value],
        create: sliderTooltip,
        slide: sliderTooltip
    });

    this.timeSlider = true;
    return ts


}