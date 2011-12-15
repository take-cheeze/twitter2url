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
               get_background().localStorage[k] = $('#' + k).val();
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
    val
        ? $('#save_button').removeAttr('disabled')
        : $('#save_button').attr('disabled', true)
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
    var target = $('#options');
    target.empty();
    $.each(
        get_background().twi2url.defaults, function(k, v) {
            target
                .append($(document.createElement('tr'))
                        .append($(document.createElement('td'))
                                .text(description[k]))
                        .append($(document.createElement('td'))
                                .append($(document.createElement('input'))
                                        .attr({ 'type': 'number', 'id': k })
                                        .change(function() {changed(true); })
                                        .val(get_background().localStorage[k]))));
        }
    );
}

function draw_exclude_filter() {
    var target = $('#exclude_filters');
    target.empty();
    $.each(
        exclude_filters, function(k, v) {
            target
                .append(
                    $(document.createElement('input'))
                        .attr({ 'type': 'url', 'id': 'exclude_filter_' + k })
                        .val(v)
                        .change(function() { set_exclude_filter(k); }))
                .append(
                    $(document.createElement('input'))
                        .attr('type', 'button')
                        .val("Remove")
                        .click(function() { remove_exclude_filter(k); }))
                .append(
                    $(document.createElement('br')));
        });

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

$(function() {
      restore_options();
      $.each(
          {
              'add_filter_button': add_exclude_filter,
              'save_button': save_options,
              'restore_button': restore_options,
              'default_button': set_default
          },
          function(k, v) { $('#' + k).click(v); });
  });
