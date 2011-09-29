function get_background() {
    return chrome.extension.getBackgroundPage();
}

function auto_open() {
    get_background().twi2url.
        auto_open($('#auto_open_checkbox').prop('checked'));
}
function open_options() {
    get_background().twi2url.open_current_window_tab(
        chrome.extension.getURL('page/options.html'), true);
}
function open_gallery() {
    get_background().twi2url.open_current_window_tab(
        chrome.extension.getURL('page/gallery.html'), true);
}
function backup() { get_background().twi2url.backup(); }
function fetch() { get_background().twi2url.fetch(); }

function draw() {
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
        $('#sign_in_out').val("Sign In" ).click(twi2url.signin );

    setTimeout(draw, 500);
}
$(draw);
