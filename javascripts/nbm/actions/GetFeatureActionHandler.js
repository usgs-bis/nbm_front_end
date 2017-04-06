'use strict';

var GetFeatureActionHandler = function (config, layer) {
    this.feature = undefined;
    ActionHandler.call(this,
        config, layer);
};

inherit(ActionHandler, GetFeatureActionHandler);

GetFeatureActionHandler.prototype.cleanUp = function () {
    if (this.feature) {
        this.feature.remove();
        this.feature = undefined;
    }

    if (this.result) {
        this.result = undefined;
    }

    this.cleanUpBaps();
};