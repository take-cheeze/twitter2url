function get_background() {
    return chrome.extension.getBackgroundPage();
}

function auto_open() {
    get_background().twitter2url.
        auto_open($('#auto_open_checkbox').prop('checked'));
}
function open_options() {
    get_background().twitter2url.open_current_window_tab(
        chrome.extension.getURL("options.html"), true);
}
function backup() { get_background().twitter2url.backup(); }
function fetch() { get_background().twitter2url.fetch(); }

function load() {
    var twitter2url = get_background().twitter2url;
    $('#auto_open_checkbox').
        prop('checked', twitter2url.auto_open_state);
    $('#opened').text("Opened: " +
                      (twitter2url.can_open_tab()? '': '+') +
                      twitter2url.auto_open_count);
    $('#unread').text("Unread: " + twitter2url.urls.length);
    setTimeout(load, 500);
}
