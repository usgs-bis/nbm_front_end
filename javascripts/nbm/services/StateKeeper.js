'use strict';

/**
 * StateKeeper service. Handles the management of the apps state.
 *
 * Public methods:
 * updateUrl() - update the url to reflect the apps current state
 */
var StateKeeper = (function (state) {

    /**
     * Returns the state of the app in a string for the url.
     * @returns {string}
     */
    function getState() {
        var states = [map.getState(), actionHandlerHelper.getState(), bioScape.getState()];
        var stateString = '';
        states.forEach(function(item) {
            for(var prop in item) {
                if(item.hasOwnProperty(prop)) {
                    var propStr = prop + '=' + item[prop];
                    var str = stateString ? '/' : '';
                    stateString += str + propStr;
                }
            }
        });
        return stateString ? '#' + stateString : '';
    }
    //
    // function updateUrl() {
    //     window.location = getState();
    // }

    state = {
        getState: getState
    };
    return state;
})(StateKeeper || {});