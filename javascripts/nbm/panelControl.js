'use strict';

function setUpIndexPage(isSmallScreen, verticalOrientation) {
    updateIndexPage(verticalOrientation);

    $("#unit_info_right_control").click(function () {
        RightPanelBar.toggle();
    });

    $("#unit_info_left_control").click(function () {
        MenuPanel.toggle();
    });

    MenuPanel.open();

    $(window).resize(function() {
        if(preventMultipleOpenPanels() && MenuPanel.isOpen() && RightPanelBar.isOpen()) {
            MenuPanel.close();
        } else if(!preventMultipleOpenPanels() && !MenuPanel.isOpen()) {
            MenuPanel.open();
        }
        updateIndexPage(isVerticalOrientation());
    });
}

function updateIndexPage(verticalOrientation) {
    var rightBar = {
        controlSpan: 'ui_right_control_span',
        openSymbol: verticalOrientation ? '<i class="fa fa-chevron-down" aria-hidden="true"></i>' : '<i class="fa fa-chevron-right" aria-hidden="true"></i>',
        closedSymbol: verticalOrientation ?'<i class="fa fa-chevron-up" aria-hidden="true"></i>' : '<i class="fa fa-chevron-left" aria-hidden="true"></i>'
    };
    RightPanelBar = new PanelBar(rightBar);
    RightPanelBar.open = function() {
        if(preventMultipleOpenPanels()) {
            MenuPanel.close();
        }
        PanelBar.prototype.open.call(this);
    };

    var menuBar = {
        controlSpan: 'ui_left_control_span',
        openSymbol: verticalOrientation ? '<i class="fa fa-chevron-up" aria-hidden="true"></i>' : '<i class="fa fa-chevron-left" aria-hidden="true"></i>',
        closedSymbol: verticalOrientation ? '<i class="fa fa-chevron-down" aria-hidden="true"></i>' : '<i class="fa fa-chevron-right" aria-hidden="true"></i>'
    };
    MenuPanel = new MenuPanelBar(menuBar);
    MenuPanel.open = function() {
        if(preventMultipleOpenPanels()) {
            RightPanelBar.close();
        }
        MenuPanelBar.prototype.open.call(this);
    };
}

function closeAllUnitInfoBars() {
    RightPanelBar.close();
    MenuPanel.close();
}

var PanelBar = function(panelBarInfo) {
    this.infoPanel = panelBarInfo.infoPanel || 'unit_info_right';
    this.openClass = 'open';
    this.controlSpan = panelBarInfo.controlSpan;
    this.openSymbol = panelBarInfo.openSymbol;
    this.closedSymbol = panelBarInfo.closedSymbol;

    $('#' + panelBarInfo.controlSpan).html(this.isOpen() ? panelBarInfo.openSymbol : panelBarInfo.closedSymbol);
};

PanelBar.prototype.isOpen = function() {
    return $('#' + this.infoPanel).hasClass(this.openClass)
};
PanelBar.prototype.open = function() {
    $('#' + this.infoPanel).addClass(this.openClass);
    $('#' + this.controlSpan).html(this.openSymbol);
};
PanelBar.prototype.close = function() {
    $('#' + this.infoPanel).removeClass(this.openClass);
    $('#' + this.controlSpan).html(this.closedSymbol);
};
PanelBar.prototype.toggle = function() {
    if(this.isOpen()) {
        this.close();
    } else {
        this.open();
    }
};

function MenuPanelBar(panelBarInfo) {
    panelBarInfo.infoPanel = 'unit_info_left';
    PanelBar.call(this, panelBarInfo);
}
inherit(PanelBar, MenuPanelBar);

MenuPanelBar.prototype.open = function() {
    PanelBar.prototype.open.call(this);
    $('#mapBottomLeft').addClass(this.openClass);
};
MenuPanelBar.prototype.close = function() {
    PanelBar.prototype.close.call(this);
    $('#mapBottomLeft').removeClass(this.openClass);
};
