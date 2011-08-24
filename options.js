var filters = [];

function load_filter() {
    var t = '';
    $.each(
        filters, function(k, v) {
            t +=
            '<input type="text" id="filter_' + k + '" value="' + v + '" onchange="set_filter(' + k + ')">' +
                '<input type="button" onclick="remove_filter(' + k + ')" value="Remove Filter">' +
                '<br>'
            ;
        }
    );
    $('#filters').html(t);
}

function add_filter() {
    filters.push('');
    load_filter();
}
function set_filter(index) {
    filters[index] = $('#filter_' + index).val();
}
function remove_filter(index) {
    if(index < (filters.length - 1)) { filters.splice(index, 1); }
    else if(index == (filters.length - 1)) { filters.pop(); }
    load_filter();
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
    $.each(get_background().twi2url.defaults, function(k, v) {
               $("#" + k).val(get_background().localStorage[k]);
           });
    filters = JSON.parse(get_background().localStorage.filters);
    load_filter();
}
