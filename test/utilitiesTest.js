describe('utilities.js', function() {
    var a, b;

    describe('isEquivalent', function() {
        it('different objects with equal properties return true', function() {
            a = {prop: true};
            b = {prop: true};
            assert.isTrue(isEquivalent(a, b), "isEquivalent should return true for these objects");
        });

        it('different objects with mismatching properties return false', function() {
            a = {prop: true};
            b = {prop: true, anotherProp: true};
            assert.isFalse(isEquivalent(a, b), "isEquivalent should return false for these objects");
        });
    });

    describe('formatLocalDateToISO8601', function() {
        it ('is a string of length 10', function () {
            assert.isString(formatLocalDateToISO8601(), "returns a string");
            assert.equal(formatLocalDateToISO8601().length, 10, "the length should be 10 each time");
        });
        it ('has a format of  "xxxx-xx-xx"', function () {
            var a = formatLocalDateToISO8601().split("-");

            assert.equal(a.length, 3, "should be a string with 3 numbers separated by a '-' character");
            assert.equal(a[0].length, 4, "first number (year) should be 4 digits");
            assert.equal(a[1].length, 2, "second number (month) should be 2 digits");
            assert.equal(a[2].length, 2, "third number (day) should be 2 digits");
        });
    });

    var tempDiv = $('<div style="display: none;">' +
        '<div html-template="javascripts/templates/_bioScapeTemplates.html"></div>' +
        '<div html-template="javascripts/templates/_mapButtons.html"></div>' +
        '</div>');

    $("body").append(tempDiv);

    describe('getHtmlTemplateElements', function() {
        it ('is array of length 2', function () {
            var l = getHtmlTemplateElements();

            assert.equal(l.length, 2, "the length should be 2");
        });
    });

    describe('getTemplatePath', function() {
        it ('returns correct path', function () {
            assert.equal(getTemplatePath(getHtmlTemplateElements()[0]),
                "javascripts/templates/_bioScapeTemplates.html",
                "the path should be the html-template attribute value");

            assert.equal(getTemplatePath(getHtmlTemplateElements()[1]),
                "javascripts/templates/_mapButtons.html",
                "the path should be the html-template attribute value");
        });
    });

    describe('getTemplateHtml', function() {
        it('html is successfully grabbed from the template file', function(done) {

            getTemplateHtml("javascripts/templates/_bioScapeTemplates.html")
                .then(function (html) {
                    assert.isDefined (html, "html is defined");
                    assert.equal(html.indexOf("<script id="), 0, "html starts with script tag");

                    done();
                })
                .catch(function () {
                    assert.equal(true, false, "caught an exception with ajax request");
                    done();
                });
        });

        it('illegal path gets handled gracefully', function(done) {

            getTemplateHtml("/javascripts/templates/_bioScapeTemplates.html")
                .then(function (html) {
                    assert.isDefined (html, "html is defined");
                    assert.equal(html.indexOf("Error retrieving template data"), 0, "error message is returned");

                    done();
                })
                .catch(function () {
                    assert.equal(true, false, "caught an exception with ajax request");
                    done();
                });
        });

        it('accidental invalid path gets handled gracefully', function(done) {

            getTemplateHtml("javascripts/templates/_bioScapeTemplatesWRONG.html")
                .then(function (html) {
                    assert.equal(true, false, "this block should be missed");

                    done();
                })
                .catch(function (ex) {
                    assert.equal(ex.status, 404, "expect file not found 404 error");
                    done();
                });
        });
    });
});