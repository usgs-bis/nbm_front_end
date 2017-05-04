describe('utilities.js', function() {
    var assert = chai.assert;
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
});