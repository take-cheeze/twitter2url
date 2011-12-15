/*
 localStorage.backup_freq - backup interval
 localStorage.check_freq - list check interval
 localStorage.exclude_filters - list of url filter regexp
 localStorage.open_tab_max - maximum of tab that will be opened at once
 localStorage.since - since_id of lists
 localStorage.tweet_max - max tweet per one interval
 localStorage.urls - URLs that had been saved
 */

var consumer = consumer || {
    CONSUMER_KEY: '', CONSUMER_SECRET: '', USTREAM_KEY: ''
};

var twi2url = twi2url || {
    LOCAL_STORAGE_KEY: [
        'oauth_token',
        'oauth_token_secret',
        'user_id',
        'screen_name'
    ],
    EXPANDING_URL_LENGTH_MAX: 35,
    TWEET_MAX: 200,

    defaults: {
        auto_open_freq: 500, // milli-second
        backup_freq: 1000 * 60 * 5, // 5 minutes
        check_freq: 1000 * 60 * 15, // 15 minutes
        open_tab_max: 10 // tabs
    },
    since: 'since' in localStorage ? JSON.parse(localStorage.since) : {},
    urls: 'urls' in localStorage ? JSON.parse(localStorage.urls) : [],
    exclude_filters: [], // list of exclude filter regexp
    gallery_stack: 'gallery_stack' in localStorage
        ? JSON.parse(localStorage.gallery_stack) : [],
    auto_open_state: false,
    auto_open_count: 0,
    auto_fetch_timeout: null,
    auto_backup_timeout: null,
    twitter_api_left: true,
    tab_ids: [], // list of auto opened tab id

    error: function(obj) {
        console.trace();
        console.error(obj);
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
                        if(callback !== undefined) { callback(tab); }
                    });
            });
    },
    in_history: function(url, callback) {
        chrome.history.getVisits(
            {'url': url}, function(results) {
                callback(results.length != 0);
            }
        );
    },
    can_open_tab: function() {
        return(
            (twi2url.auto_open_count < parseInt(localStorage.open_tab_max)) &&
                (twi2url.urls.length > 0));
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
                            });
                    });
            }
            setTimeout(twi2url.auto_open,
                       parseInt(localStorage.auto_open_freq));
        }
    },
    update_options: function() {
        // build exclude filters
        twi2url.exclude_filters = [];
        $.each(
            JSON.parse(localStorage.exclude_filters), function(k, v) {
                twi2url.exclude_filters.push(new RegExp(v));
            }
        );
        twi2url.timeout_auto_fetch();
        twi2url.timeout_auto_backup();
    }
};

$(function() {
      if(!('exclude_filters' in localStorage)) {
          localStorage.exclude_filters = '[]';
      }

      $.each(
          twi2url.defaults, function(key, value) {
              if(!(key in localStorage)) {
                  localStorage[key] = JSON.stringify(value);
              }
          }
      );
      twi2url.signin();
      twi2url.timeout_auto_fetch();
      twi2url.timeout_auto_backup();
      twi2url.update_options();

      setInterval( // badge change
          function() {
              chrome.browserAction.setBadgeText(
                  {
                      text: twi2url.auto_open_state
                          ? twi2url.can_open_tab()
                          ? twi2url.auto_open_count.toString()
                          : '+' + twi2url.urls.length.toString()
                      : twi2url.urls.length.toString()
                  });
              chrome.browserAction.setBadgeBackgroundColor(
                  {
                      color: twi2url.auto_open_state
                          ? [0, 0, 255, 255] : [255, 0, 0, 255]
                  });
          }, 500);
      chrome.tabs.onRemoved.addListener( // tab remove event
          function(tab_id, remove_info) {
              $.each(
                  twi2url.tab_ids, function(k, v) {
                      if(v === tab_id) {
                          if(twi2url.auto_open_count > 0) {
                              twi2url.auto_open_count--;
                          }
                          twi2url.tab_ids.splice(k, 1);
                      }
                  });
          });
      window.onunload = function() { twi2url.backup(); };

      chrome.omnibox.onInputEntered.addListener(
          function(text) {
              twi2url.oauth.post(
                  'http://api.twitter.com/1/statuses/update.json',
                  { status: text }, function(data) {
                  },
                  function(data) {
                      alert('Tweet failed: ' + JSON.stringify(data));
                  }
              );
          });
  });
