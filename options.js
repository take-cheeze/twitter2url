var filters = [];

function add_filter() {
    filters.push('');
    draw_filter();
}
function set_filter(index) {
    filters[index] = $('#filter_' + index).val();
    changed(true);
}
function remove_filter(index) {
    if(index < (filters.length - 1)) { filters.splice(index, 1); }
    else if(index == (filters.length - 1)) { filters.pop(); }
    draw_filter();
}

function get_background() { return chrome.extension.getBackgroundPage(); }

function save_options() {
    /*
     TODO: check values
     */
    $.each(get_background().twi2url.defaults, function(k, v) {
               get_background().localStorage[k] = $("#" + k).val();
           });
    get_background().localStorage.filters = JSON.stringify(filters);
    get_background().twi2url.build_filters();

    restore_options();
}

function restore_options() {
    draw_options();
    filters = JSON.parse(get_background().localStorage.filters);
    draw_filter();

    changed(false);
}

function changed(val) {
    console.trace();

    val
        ? $('#save_button').removeAttr('disabled')
        : $('#save_button').attr('disabled', 'disabled')
    ;
}

function draw_options() {
    var description = {
        'auto_open_freq': 'Auto-open Frequency (milli-second)',
        'backup_freq': 'Backup Frequency (milli-second)',
        'check_freq': 'Check Frequency (milli-second)',
        'open_tab_max': 'Open Tab Max (item)',
        'tweet_max': 'Tweet Max (tweet)'
    };
    var t = '<table>';
    $.each(
        get_background().twi2url.defaults, function(k, v) {
            t += '<tr><td>' + description[k] + '</td>' +
                '<td><input id="' + k + '" type="text" onchange="changed(true)" /></td></tr>';
        }
    );
    t += '</table>';
    $('#options').html(t);

    $.each(get_background().twi2url.defaults, function(k, v) {
               $("#" + k).val(get_background().localStorage[k]);
           });
}

function draw_filter() {
    var t = '';
    $.each(
        filters, function(k, v) {
            t += '<input type="text" id="filter_' + k + '" value="' + v + '" onchange="set_filter(' + k + ')" />' +
                '<input type="button" onclick="remove_filter(' + k + ')" value="Remove Filter" />' +
                '<br>'
            ;
        }
    );
    $('#filters').html(t);

    changed(true);
}

function set_default() {
    $.each(
        get_background().twi2url.defaults, function(k, v) {
            $('#' + k).val(v);
        }
    );
    filters = [];
    draw_filter();
}
