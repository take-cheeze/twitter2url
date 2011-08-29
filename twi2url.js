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

var twi2url = twi2url || {
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
        'tweet_max': 200 // 200 tweets
    },
    since: 'since' in localStorage ? JSON.parse(localStorage.since) : {},
    urls: 'urls' in localStorage ? JSON.parse(localStorage.urls) : [],
    gallery_stack: 'gallery_stack' in localStorage
        ? JSON.parse(localStorage.gallery_stack) : [],
    auto_open_state: false,
    auto_open_count: 0,
    tab_ids: [], // list of auto opened tab id
    filters: [], // list of filter regexp

    error: function(obj) {
        console.trace();
        console.error(obj);
    },

    signout: function() {
        $.each(
            twi2url.LOCAL_STORAGE_KEY,
            function(key, value) { delete localStorage[value]; }
        );
    },
    is_signed_in: function() {
        var ret = true;
        $.each(
            twi2url.LOCAL_STORAGE_KEY,
            function(key, value) {
                if(!(value in localStorage)) { ret = false; }
            }
        );
        return ret;
    },
    signin: function() {
        twi2url.oauth = new OAuth(
            {
                consumerKey: consumer.CONSUMER_KEY,
                consumerSecret: consumer.CONSUMER_SECRET,

                requestTokenUrl: 'https://api.twitter.com/oauth/request_token',
                authorizationUrl: 'https://api.twitter.com/oauth/authorize',
                accessTokenUrl: 'https://api.twitter.com/oauth/access_token'
            }
        );
        if(twi2url.is_signed_in()) {
            twi2url.oauth.setAccessToken(
                localStorage.oauth_token, localStorage.oauth_token_secret);
            return;
        }

        twi2url.oauth.fetchRequestToken(
            function(url) {
                twi2url.open_current_window_tab(url, true);

                var pin = prompt('Please enter your PIN', '');
                twi2url.oauth.setVerifier(pin);
                twi2url.oauth.fetchAccessToken(
                    function(data) {
                        var q = $.query.load('?' + data.text);
                        // console.log(q.toString());
                        $.each(
                            twi2url.LOCAL_STORAGE_KEY,
                            function(k, v) {
                                localStorage[v] = q.get(v);
                            }
                        );
                    }, twi2url.error
                );
            }, twi2url.error
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
            twi2url.tab_ids, function(key, value) {
                if(value == tab_id) {
                    if(twi2url.auto_open_count > 0) {
                        twi2url.auto_open_count--;
                    }
                    twi2url.tab_ids.splice(key, 1);
                }
            }
        );
    },
    match_filter: function(str) {
        if(str == null) return true;
        for(var i in twi2url.filters) {
            if(twi2url.filters[i].test(str)) {
                // console.log("Filtered URL: " + str);
                return true;
            }
        }
        return false;
    },
    match_gallery_filter: function(str, callback) {
        var error_callback = function(res) {
            twi2url.error(res);
            twi2url.urls.push(str);
            // throw new Error('match_gallery_filter error');
        };
        var get_og_image = function(data) {
            var m = data.match(/<meta property=["']og:image["'] content=["']([^'"]+)["']/);
            if(m.length != 2) { throw new Error('og:image parse error'); }
            return m[1];
        };
        var get_og_description = function(data) {
            var m = data.match(/<meta property=["']og:description["'] content=["']([^'"]+)["']/);
            if(m.length != 2) { throw new Error('og:description parse error'); }
            return m[1];
        };
        var image_tag = function(url) { return '<img src="' + url + '">'; };
        var image_file = function(url, callback)
        { callback(url, '', image_tag(url)); };
        var og_callback = function(url, callback) {
            $.ajax(
                {
                    'url': url, dataType: 'html',
                    success: function(data) {
                        callback(
                            url, get_og_description(data),
                            image_tag(get_og_image(data))
                        );
                    }, error: error_callback
                });
        };
        var GALLERY_FILTER = {
            "^http://twitpic\\.com/([a-zA-Z0-9]+)$": function(url, callback) {
                var id = url.replace(/^http:\/\/twitpic.com\/([a-zA-Z0-9]+)$/, '$1');
                $.ajax(
                    {
                        'url': 'http://api.twitpic.com/2/media/show.json?id=' + id,
                        dataType: 'json',
                        success: function(data) {
                            callback(
                                url + '/full', data.message,
                                image_tag('http://twitpic.com/show/large/' + id)
                            );
                        }, error: error_callback
                    });
            },
            "^http://yfrog.com/([a-z0-9]*)$": function(url, callback) {
                $.ajax(
                    {
                        'url': url, dataType: 'html',
                        success: function(data) {
                            callback(
                                url.replace('yfrog.com/', 'yfrog.com/z/'),
                                get_og_description(data),
                                image_tag(get_og_image(data))
                            );
                        }, error: error_callback
                    });
            },
            "^http://seiga.nicovideo.jp/seiga/im": og_callback,
            "^http://www.pixiv.net/member_illust.php": og_callback,
            "^http://instagr.am/p/[\\-_a-zA-Z0-9]+/?$": og_callback,
            "^http://soundtracking.com/tracks/[a-z0-9]+$": og_callback,
            "^http://img.ly/[A-Za-z0-9]+$": og_callback,
            "^http://p.twipple.jp/[a-zA-Z0-9]+$": function(url, callback) {
                var id = url.match(/'^http:\/\/p.twipple.jp\/([a-zA-Z0-9]*)$/)[1];
                var photo_url = 'http://p.twipple.jp/data';
                for(var i in id) { photo_url += '/' + id[i]; }
                console.log(photo_url);
                $.ajax(
                    {
                        'url': url, dataType: 'html',
                        success: function(data) {
                            callback(
                                url, get_og_description(data),
                                image_tag(photo_url));
                        }, error: error_callback
                    });
            },
            '^.+\\.png$': image_file, '^.+\\.JPG$': image_file,
            '^.+\\.jpg$': image_file, '^.+\\.gif$': image_file,
            '^.+\\.jpeg$': image_file,
            '^http://movapic.com/pic/[a-z0-9]+$': function(url, callback) {
                callback(
                    url.replace(
                            /http:\/\/movapic.com\/pic\/([a-z0-9]+)/,
                        'http://image.movapic.com/pic/m_$1.jpeg'
                    ), '', image_tag(url + '.png'));
            },
            '^http://gyazo.com/[a-z0-9]+$': function(url, callback) {
                callback(url, '', image_tag(url + '.png'));
            },
            "^http://ow.ly/i/[a-zA-Z0-9]+$": function(url, callback) {
                var id = url.match(/^http:\/\/ow.ly\/i\/([a-zA-Z0-9]+)$/)[1];
                callback(
                    url + '/original', '',
                    image_tag('http://static.ow.ly/photos/normal/' + id + '.jpg'));
            },
            "^http://lockerz.com/s/[0-9]+$": function(url, callback) {
                $.ajax(
                    {
                        'url': url, dataType: 'html',
                        success: function(data) {
                            console.log(data.match(/<p>([^<]+)<\/p>/));
                            console.log(data.match(/'<img id="photo" src="([^"]+)"'/));
                            callback(
                                url, data.match(/<p>([^<]+)<\/p>/)[1],
                                image_tag(data.match(/'<img id="photo" src="([^"]+)"'/)[1])
                            );
                        }, error: error_callback
                    });
            }
        };
        try {
            for(var k in GALLERY_FILTER) {
                if((new RegExp(k)).test(str)) {
                    GALLERY_FILTER[k](str, callback);
                    return true;
                }
            }
        } catch(e) {}
        return false;
    },
    clean_urls: function() {
        var table = {};
        var result = [];

        $.each(
            twi2url.urls, function(k, v) {
                if(
                    (v in table) ||
                    twi2url.match_filter(v)
                ) { return; }

                if(twi2url.match_gallery_filter(
                       v, function(url, message, tag) {
                           var t = {
                               'url': url, 'message': message, 'tag': tag };
                           twi2url.gallery_stack.push(t);
                       })) { return; }

                result.push(v);
                table[v] = '';
            }
        );
        twi2url.urls = result;
    },
    backup: function() {
        $.each(
            ['since', 'urls', 'gallery_stack'], function(index, value) {
                localStorage[value] = JSON.stringify(twi2url[value]);
            }
        );
        twi2url.clean_urls();
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
                        twi2url.urls.push(url);
                        twi2url.error(data);
                    }
                }
            );
        } else { callback(url); }
    },
    fetch: function() {
        if(!twi2url.is_signed_in()) { return; }

        twi2url.oauth.getJSON(
            'https://api.twitter.com/1/statuses/home_timeline.json?' +
                $.param({
                            'count': localStorage.tweet_max,
                            'exclude_replies': 'false',
                            'include_entities': 'true',
                            'include_rts': 'true'
                        }) +
                ('home_timeline' in twi2url.since
                 ? '&' + $.param({'since_id': twi2url.since.home_timeline}) : ''),
            function(data) {
                twi2url.process_data(data);
                if(data.length > 0) {
                    twi2url.since.home_timeline = data[0].id_str;
                }
            }, twi2url.error
        );
        twi2url.oauth.getJSON(
            'https://api.twitter.com/1/lists/all.json?' +
                $.param({'user_id': localStorage.user_id}),
            function(data) {
                $.each(
                    data, function(k, v) {
                        twi2url.oauth.getJSON(
                            'https://api.twitter.com/1/lists/statuses.json?' +
                                $.param({
                                            'include_entities': 'true',
                                            'include_rts': 'true',
                                            'list_id': v.id_str,
                                            'per_page': localStorage.tweet_max
                                        }) +
                                (v.full_name in twi2url.since
                                 ? '&' + $.param({'since_id': twi2url.since[v.full_name]}) : ''),
                            function(data) {
                                twi2url.process_data(data);
                                if(data.length > 0) {
                                    twi2url.since[v.full_name] = data[0].id_str;
                                }
                            }, twi2url.error
                        );
                    }
                );
            }, twi2url.error
        );
    },
    process_data: function(data) {
        if(data.length <= 0)  return;

        $.each(
            data, function(k, v) {
                $.each(
                    v.entities.urls, function(k, v) {
                        if(!v.expanded_url) return;

                        twi2url.expand_url(
                            v.expanded_url, function(result) {
                                twi2url.urls.push(result);
                            }
                        );
                    }
                );
            }
        );
    },

    can_open_tab: function() {
        return(twi2url.auto_open_count <
               parseInt(localStorage.open_tab_max));
    },
    auto_open: function(enable) {
        if(enable != undefined) { twi2url.auto_open_state = enable; }

        if(twi2url.auto_open_state) {
            if(twi2url.can_open_tab()) {
                var url = twi2url.urls.shift();
                twi2url.auto_open_count++;
                twi2url.in_history(
                    url, function(exists) {
                        if(exists) {
                            twi2url.auto_open_count--;
                            return;
                        }

                        twi2url.open_current_window_tab(
                            url, false, function(tab) {
                                twi2url.tab_ids.push(tab.id);
                            }
                        );
                    }
                );
            }
            setTimeout(twi2url.auto_open,
                       parseInt(localStorage.auto_open_freq));
        }
    },
    auto_fetch: function() {
        twi2url.fetch();
        setTimeout(twi2url.auto_fetch,
                   parseInt(localStorage.check_freq));
    },
    auto_backup: function() {
        twi2url.backup();
        setTimeout(twi2url.auto_backup,
                   parseInt(localStorage.backup_freq));
    },
    build_filters: function() {
        twi2url.filters = [];
        $.each(
            JSON.parse(localStorage.filters), function(k, v) {
                twi2url.filters.push(new RegExp(v));
            }
        );
    },
    init: function() {
        if(!('filters' in localStorage)) { localStorage.filters = '[]'; }

        $.each(
            twi2url.defaults, function(key, value) {
                if(!(key in localStorage)) {
                    localStorage[key] = JSON.stringify(value);
                }
            }
        );
        chrome.tabs.onRemoved.addListener(twi2url.tab_remove);
        twi2url.build_filters();

        twi2url.signin();

        setTimeout(twi2url.auto_fetch,
                   parseInt(localStorage.check_freq));
        setTimeout(twi2url.auto_backup,
                   parseInt(localStorage.backup_freq));

        setInterval( // badge
            function() {
                chrome.browserAction.setBadgeText(
                    {
                        text: twi2url.auto_open_state
                            ? twi2url.can_open_tab()
                            ? twi2url.auto_open_count.toString()
                            : '+' + twi2url.urls.length.toString()
                        : twi2url.urls.length.toString()
                    }
                );
                chrome.browserAction.setBadgeBackgroundColor(
                    {
                        color: twi2url.auto_open_state
                            ? [0, 0, 255, 255] : [255, 0, 0, 255]
                    }
                );
            }, 500
        );
    }
};

twi2url.init();
