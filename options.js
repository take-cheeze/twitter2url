var exclude_filters = [];

function add_exclude_filter() {
    exclude_filters.push('');
    draw_exclude_filter();
}
function set_exclude_filter(index) {
    exclude_filters[index] = $('#exclude_filter_' + index).val();
    changed(true);
}
function remove_exclude_filter(index) {
    if(index < (exclude_filters.length - 1)) { exclude_filters.splice(index, 1); }
    else if(index == (exclude_filters.length - 1)) { exclude_filters.pop(); }
    draw_exclude_filter();
}

function get_background() { return chrome.extension.getBackgroundPage(); }

function save_options() {
    /*
     TODO: check values
     */
    $.each(get_background().twi2url.defaults, function(k, v) {
               get_background().localStorage[k] = $("#" + k).val();
           });
    get_background().localStorage.exclude_filters = JSON.stringify(exclude_filters);
    get_background().twi2url.update_options();

    restore_options();
}

function restore_options() {
    draw_options();
    exclude_filters = JSON.parse(get_background().localStorage.exclude_filters);
    draw_exclude_filter();

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

function draw_exclude_filter() {
    var t = '';
    $.each(
        exclude_filters, function(k, v) {
            t += '<input type="text" id="exclude_filter_' + k + '" value="' + v + '" onchange="set_exclude_filter(' + k + ')" />' +
                '<input type="button" onclick="remove_exclude_filter(' + k + ')" value="Remove Exclude_Filter" />' +
                '<br>'
            ;
        }
    );
    $('#exclude_filters').html(t);

    changed(true);
}

function set_default() {
    $.each(
        get_background().twi2url.defaults, function(k, v) {
            $('#' + k).val(v);
        }
    );
    exclude_filters = [];
    draw_exclude_filter();
}
