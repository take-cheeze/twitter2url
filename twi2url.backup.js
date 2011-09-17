twi2url.backup = function() {
    $.each(
        ['since', 'urls', 'gallery_stack'], function(k, v) {
            localStorage.removeItem(v);
            localStorage.setItem(v, JSON.stringify(twi2url[v]));
        }
    );
    twi2url.clean_urls();

    twi2url.timeout_auto_backup();
};
twi2url.timeout_auto_backup = function() {
    clearTimeout(twi2url.auto_backup_timeout);
    twi2url.auto_backup_timeout =
        setTimeout(twi2url.backup,
                   parseInt(localStorage.backup_freq));
};
twi2url.clean_urls = function() {
    var table = {};
    var result = [];

    $.each(
        twi2url.urls, function(k, v) {
            if(
                (v in table) ||
                twi2url.match_exclude_filter(v)
            ) { return; }

            if(!twi2url.match_gallery_filter(
                   v, function(url, message, tag) {
                       twi2url.in_history(
                           url, function(exists) {
                               if(exists) { return; }
                               var t = {
                                   'url': url, 'message': message, 'tag': tag
                               };
                               twi2url.gallery_stack.push(t);
                           });
                   })) { result.push(v); }
            table[v] = '';
        }
    );
    twi2url.urls = result;
};
