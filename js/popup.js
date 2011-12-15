function draw() {
    function get_background() {
        return chrome.extension.getBackgroundPage();
    }
    var twi2url = get_background().twi2url;

    $('#auto_open_checkbox').
        prop('checked', twi2url.auto_open_state);
    $('#opened').text('Opened: ' +
                      (twi2url.can_open_tab()? '': '+') +
                      twi2url.auto_open_count);
    $('#unread').text('Unread: ' + twi2url.urls.length);
    $('#gallery').text('Gallery: ' + twi2url.gallery_stack.length);
    $('#twitter_api_left').text('API Left: ' + twi2url.twitter_api_left);

    twi2url.is_signed_in()?
        $('#sign_in_out').val("Sign Out").click(twi2url.signout):
        $('#sign_in_out').val("Sign In" ).click(twi2url.signin);

    $.each({
               'auto_open': function() {
                   get_background().twi2url.
                       auto_open($('#auto_open_checkbox').prop('checked'));
               },
               'open_options': function() {
                   window.open(chrome.extension.getURL('page/options.html'));
               },
               'open_gallery': function() {
                   window.open(chrome.extension.getURL('page/gallery.html'));
               },
               'backup': function() { get_background().twi2url.backup(); },
               'fetch': function() { get_background().twi2url.fetch(); },
           }, function(k, v) { $('#' + k).click(v); });

    setTimeout(draw, 500);
}
$(draw);
