/*
 localStorage.backup_freq - backup taking freq
 localStorage.check_freq - list check interval
 localStorage.filters - list of url filter regexp
 localStorage.open_tab_max - maximum of tab that will be opened at once
 localStorage.tweet_max - max tweet per one interval
 localStorage.since - map of each since_id of list
 localStorage.urls - URLs that had been saved
 */

// Google Analytics
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-10524326-6']);
_gaq.push(['_trackPageview']);

(function() {
     var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
     ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
     var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
 })();

var consomer = consumer || {
    CONSUMER_KEY: '', CONSUMER_SECRET: ''
};

var twitter2url = twitter2url || {
    LOCAL_STORAGE_KEY: [
        'oauth_token',
        'oauth_token_secret',
        'user_id',
        'screen_name'
    ],
    defaults: {
        'auto_open_freq': 500, // 500 milli-second
        'backup_freq': 1000 * 60 * 5, // 5 minutes
        'check_freq': 1000 * 60 * 15, // 15 minutes
        'open_tab_max': 30, // 30
        'tweet_max': 200, // 200 tweets
        'filters': [], // empty filter list
    },
    since: 'since' in localStorage ? JSON.parse(localStorage.since) : {},
    urls: 'urls' in localStorage ? JSON.parse(localStorage.urls) : [],
    auto_open_state: false,
    auto_open_count: 0,
    tab_ids: [], // list of auto opened tab id
    filters: [], // list of filter regexp

    error: function(obj) {
        console.error(obj);
    },

    signout: function() {
        $.each(
            twitter2url.LOCAL_STORAGE_KEY,
            function(key, value) { delete localStorage[value]; }
        );
    },
    is_signed_in: function() {
        var ret = true;
        $.each(
            twitter2url.LOCAL_STORAGE_KEY,
            function(key, value) {
                if(!(value in localStorage)) { ret = false; }
            }
        );
        return ret;
    },
    signin: function() {
        twitter2url.oauth = new OAuth(
            {
                consumerKey: consumer.CONSUMER_KEY,
                consumerSecret: consumer.CONSUMER_SECRET,

                requestTokenUrl: 'https://api.twitter.com/oauth/request_token',
                authorizationUrl: 'https://api.twitter.com/oauth/authorize',
                accessTokenUrl: 'https://api.twitter.com/oauth/access_token'
            }
        );
        if(twitter2url.is_signed_in()) {
            twitter2url.oauth.setAccessToken(
                localStorage.oauth_token, localStorage.oauth_token_secret);
            return;
        }

        twitter2url.oauth.fetchRequestToken(
            function(url) {
                twitter2url.open_current_window_tab(url, true);

                var pin = prompt('Please enter your PIN', '');
                twitter2url.oauth.setVerifier(pin);
                twitter2url.oauth.fetchAccessToken(
                    function(data) {
                        var q = $.query.load('?' + data.text);
                        // console.log(q.toString());
                        $.each(
                            twitter2url.LOCAL_STORAGE_KEY,
                            function(k, v) {
                                localStorage[v] = q.get(v);
                            }
                        );
                    }, twitter2url.error
                );
            }, twitter2url.error
        );
    },
    open_current_window_tab: function(url, selected, callback) {
        chrome.windows.getCurrent(
            function(window) {
                chrome.tabs.create(
                    {
                        'windowId': window.id,
                        'selected': selected,
                        'url': url
                    }, function(tab) {
                        if(callback) { callback(tab); }
                    }
                );
            }
        );
    },

    tab_remove: function(tab_id, remove_info) {
        $.each(
            twitter2url.tab_ids, function(key, value) {
                if(value == tab_id) {
                    if(twitter2url.auto_open_count > 0) {
                        twitter2url.auto_open_count--;
                    }
                    twitter2url.tab_ids.splice(key, 1);
                }
            }
        );
    },
    match_filter: function(str) {
        if(str == null) return true;
        for(var i in twitter2url.filters) {
            if(twitter2url.filters[i].test(str)) {
                // console.log("Filtered URL: " + str);
                return true;
            }
        }
        return false;
    },
    clean_urls: function() {
        var table = {};
        var result = [];

        $.each(
            twitter2url.urls, function(k, v) {
                if(
                    (v in table) ||
                    twitter2url.match_filter(v)
                  ) { return; }
                result.push(v);
                table[v] = '';
                /*
                twitter2url.in_history(
                    v, function(res) {
                        if(!res) { twitter2url.push(v); }
                    }
                );
                 */
            }
        );
        twitter2url.urls = result;
    },
    backup: function() {
        twitter2url.clean_urls();
        $.each(
            ['since', 'urls'], function(index, value) {
                localStorage[value] = JSON.stringify(twitter2url[value]);
            }
        );
    },
    in_history: function(url, callback) {
        // console.log("Searching: " + url);
        chrome.history.getVisits(
            {'url': url}, function(results) {
                callback(results.length != 0);
            }
        );
    },
    expand_url: function(url, callback) {
        if(url.length < 35) {
            $.ajax(
                {
                    type: "GET",
                    url: 'http://api.longurl.org/v2/expand?format=json&' +
                        $.param({'url': url}),
                    dataType: 'json',
                    success: function(result) {
                        callback(result['long-url']);
                    },
                    error: function(data) {
                        twitter2url.urls.push(url);
                        twitter2url.error(data);
                    }
                }
            );
        } else { callback(url); }
    },
    fetch: function() {
        if(!twitter2url.is_signed_in()) { return; }

        twitter2url.oauth.getJSON(
            'https://api.twitter.com/1/statuses/home_timeline.json?' +
                $.param({
                            'count': localStorage.tweet_max,
                            'exclude_replies': 'false',
                            'include_entities': 'true',
                            'include_rts': 'true'
                        }) +
                ('home_timeline' in twitter2url.since
                ? '&' + $.param({'since_id': twitter2url.since.home_timeline}) : ''),
            function(data) {
                twitter2url.process_data(data);
                if(data.length > 0) {
                    twitter2url.since.home_timeline = data[0].id_str;
                }
            }, twitter2url.error
        );
        twitter2url.oauth.getJSON(
            'https://api.twitter.com/1/lists/all.json?' +
                $.param({'user_id': localStorage.user_id}),
            function(data) {
                $.each(
                    data, function(k, v) {
                        twitter2url.oauth.getJSON(
                            'https://api.twitter.com/1/lists/statuses.json?' +
                                $.param({
                                            'include_entities': 'true',
                                            'include_rts': 'true',
                                            'list_id': v.id_str,
                                            'per_page': localStorage.tweet_max
                                        }) +
                                (v.full_name in twitter2url.since
                                 ? '&' + $.param({'since_id': twitter2url.since[v.full_name]}) : ''),
                            function(data) {
                                twitter2url.process_data(data);
                                if(data.length > 0) {
                                    twitter2url.since[v.full_name] = data[0].id_str;
                                }
                            }, twitter2url.error
                        );
                    }
                );
            }, twitter2url.error
        );
    },
    process_data: function(data) {
        if(data.length <= 0)  return;

        $.each(
            data, function(k, v) {
                $.each(
                    v.entities.urls, function(k, v) {
                        if(!v.expanded_url) return;

                        twitter2url.expand_url(
                            v.expanded_url, function(result) {
                                twitter2url.urls.push(result);
                            }
                        );
                    }
                );
            }
        );
    },

    can_open_tab: function() {
        return(twitter2url.auto_open_count <
               parseInt(localStorage.open_tab_max));
    },
    auto_open: function(enable) {
        if(enable != undefined) { twitter2url.auto_open_state = enable; }

        if(twitter2url.auto_open_state) {
            if(twitter2url.can_open_tab()) {
                var url = twitter2url.urls.shift();
                twitter2url.auto_open_count++;
                twitter2url.in_history(
                    url, function(exists) {
                        if(exists) {
                            twitter2url.auto_open_count--;
                            return;
                        }

                        twitter2url.open_current_window_tab(
                            url, false, function(tab) {
                                twitter2url.tab_ids.push(tab.id);
                            }
                        );
                    }
                );
            }
            setTimeout(twitter2url.auto_open,
                       parseInt(localStorage.auto_open_freq));
        }
    },
    auto_fetch: function() {
        twitter2url.fetch();
        setTimeout(twitter2url.auto_fetch,
                   parseInt(localStorage.check_freq));
    },
    auto_backup: function() {
        twitter2url.backup();
        setTimeout(twitter2url.auto_backup,
                   parseInt(localStorage.backup_freq));
    },
    build_filters: function() {
        twitter2url.filters = [];
        $.each(
            JSON.parse(localStorage.filters), function(k, v) {
                twitter2url.filters.push(new RegExp(v));
            }
        );
    },
    init: function() {
        $.each(
            twitter2url.defaults, function(key, value) {
                if(!(key in localStorage)) {
                    localStorage[key] = JSON.stringify(value);
                }
            }
        );
        chrome.tabs.onRemoved.addListener(twitter2url.tab_remove);
        twitter2url.build_filters();

        twitter2url.signin();

        setTimeout(twitter2url.auto_fetch,
                   parseInt(localStorage.check_freq));
        setTimeout(twitter2url.auto_backup,
                   parseInt(localStorage.backup_freq));

        setInterval( // badge
            function() {
                chrome.browserAction.setBadgeText(
                    {
                        text: twitter2url.auto_open_state
                            ? twitter2url.can_open_tab()
                            ? twitter2url.auto_open_count.toString()
                            : '+' + twitter2url.auto_open_count.toString()
                        : twitter2url.urls.length.toString()
                    }
                );
                chrome.browserAction.setBadgeBackgroundColor(
                    {
                        color: twitter2url.auto_open_state
                            ? [0, 0, 255, 255] : [255, 0, 0, 255]
                    }
                );
            }, 500
        );
    }
};

twitter2url.init();
