describe('ActionHandler.js', function() {
    var testActionHandler = new ActionHandler({}, undefined);

    describe('created', function() {
        it('ActionHandler object successfully created', function() {
            assert.isDefined (testActionHandler, "action handler should not be undefined");
        });
    });
});