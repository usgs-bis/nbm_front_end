var assert = chai.assert;

var actionHandler = new ActionHandler({}, undefined);

describe('ActionHandler', function() {
    describe('created', function() {
        it('ActionHandler object successfully created', function() {
            assert (actionHandler !== undefined);
        });
    });
});