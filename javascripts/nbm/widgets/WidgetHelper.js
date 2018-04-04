'use strict';

var WidgetHelper = function () {
    this.marker = undefined;
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
        return new NFHPTestWidget(config);
    } else if (config.type === "hierarchyByPixelElastic") {
        return new HBPElasticWidget(config);
    } else if (config.type === "hierarchyTableElastic") {
        return new HierarchyTableWidgetElastic(config);
    }
};