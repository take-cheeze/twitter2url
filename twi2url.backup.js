twi2url.backup = function() {
    $.each(
        ['since', 'urls', 'gallery_stack'], function(index, value) {
            localStorage[value] = JSON.stringify(twi2url[value]);
        }
    );
    twi2url.clean_urls();
};
twi2url.timeout_auto_backup = function() {
    twi2url.auto_backup_timeout =
        setTimeout(twi2url.auto_backup,
                   parseInt(localStorage.check_freq));
};
twi2url.auto_backup = function() {
    twi2url.backup();
    twi2url.timeout_auto_backup();
};
