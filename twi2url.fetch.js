twi2url.timeout_when_api_reset = function(callback) {
    twi2url.oauth.getJSON(
        'https://api.twitter.com/1/account/rate_limit_status.json',
        function(data) {
            if(data.remaining_hits > 0) {
                callback();
            } else {
                var wait_time
                    = data.reset_time_in_seconds
                    - Math.floor((new Date()).getTime() / 1000)
                    + 1;
                setTimeout(
                    callback,
                    (wait_time + Math.ceil(Math.random() * 10)) * 1000);
                twi2url.twitter_api_left = false;
                setTimeout(
                    function() {
                        twi2url.twitter_api_left = true;
                    }, wait_time * 1000);
            }
        }, twi2url.error);
};
twi2url.fetch_page = function(url, name, info) {
    if(info === undefined) {
        info = {};
        info.page = 1;
        info.since_id =
            (name in twi2url.since)? twi2url.since[name] : null;
        if(info.since_id !== null) {
            url += '&' + $.param({'since_id': info.since_id});
        }
        info.new_since_id = null;
    }
    var process_data = function(data) {
        var expand_url = function(url, callback) {
            if(url.length < twi2url.EXPANDING_URL_LENGTH_MAX) {
                $.ajax(
                    {
                        type: "GET",
                        url: 'http://api.longurl.org/v2/expand?format=json&' +
                            $.param({'url': url}),
                                         dataType: 'json',
                        success: function(data) {
                            callback(data['long-url']);
                        },
                        error: function(data) {
                            callback(url);
                            twi2url.error(data);
                        }
                    });
            } else { callback(url); }
        };
        $.each(
            data, function(k, v) {
                $.each(
                    v.entities.urls, function(k, v) {
                        if(!v.expanded_url) return;
                        
                        expand_url(
                            v.expanded_url, function(result) {
                                twi2url.urls.push(result);
                            });
                    });
            });
    };
    twi2url.timeout_when_api_reset(
        function() {
            twi2url.oauth.getJSON(
                url + '&' + $.param({page: info.page}), function(data) {
                    process_data(data);
                    if(info.new_since_id === null && data.length > 0) {
                        info.new_since_id = data[0].id_str;
                    }
                    console.log('fetched tweet number: ' + data.length);
                    if(((Math.ceil(data.length / 10) * 10) >= twi2url.TWEET_MAX) &&
                        (info.since_id !== null))
                    {
                        info.page++;
                        console.log('next page: ' + info.page);
                        twi2url.fetch_page(url, name, info);
                    } else {
                        twi2url.since[name] = info.new_since_id;
                    }
                }, twi2url.error);
        });
};
twi2url.fetch = function() {
    if(!twi2url.is_signed_in() || !twi2url.twitter_api_left) { return; }

    twi2url.timeout_when_api_reset(
        function() {
            twi2url.fetch_page(
                'https://api.twitter.com/1/statuses/home_timeline.json?' +
                    $.param({
                                'count': twi2url.TWEET_MAX,
                                'exclude_replies': 'false',
                                'include_entities': 'true',
                                'include_rts': 'true'
                            }), 'home_timeline');
        });
    twi2url.timeout_when_api_reset(
        function() {
            twi2url.oauth.getJSON(
                'https://api.twitter.com/1/lists/all.json?' +
                    $.param({'user_id': localStorage.user_id}),
                function(data) {
                    $.each(
                        data, function(k, v) {
                            twi2url.fetch_page(
                                'https://api.twitter.com/1/lists/statuses.json?' +
                                    $.param({
                                                'include_entities': 'true',
                                                'include_rts': 'true',
                                                'list_id': v.id_str,
                                                'per_page': twi2url.TWEET_MAX
                                            }), v.full_name);
                        }
                    );
                }, twi2url.error
            );
        });
};
twi2url.timeout_auto_fetch = function() {
    twi2url.auto_fetch_timeout =
        setTimeout(twi2url.auto_fetch,
                   parseInt(localStorage.check_freq));
};
twi2url.auto_fetch = function() {
    twi2url.fetch();
    twi2url.timeout_auto_fetch();
};
