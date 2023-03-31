$(function() {

    $('.tasks-list ul li h2').click(function () {
        $(this).parent().find('form[method="GET"]').submit();
    });

    $('svg').click(function () {
        $(this).parent().submit();
    });

});