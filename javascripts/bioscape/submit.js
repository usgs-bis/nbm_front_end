'use strict';
$(function () {
    $('#submitMapUrl').click(function() {
        alert('that could work');
    });
    $('#addAttribute').click(function() {
        var attr = $('#identifyAttributes').val();
        $('#attributes').append('<div>' + attr + '</div>');
    });
    $('#addProperty').click(function() {
        var prop = $('#property').val();
        var val = $('#value').val();
        $('#properties').append('<div>' + prop + ': ' + val + '</div>');
    });

});