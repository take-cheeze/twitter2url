twi2url.signout = function() {
    $.each(
        twi2url.LOCAL_STORAGE_KEY,
        function(key, value) { delete localStorage[value]; });
};
twi2url.is_signed_in = function() {
    var ret = true;
    $.each(
        twi2url.LOCAL_STORAGE_KEY,
        function(key, value) {
            if(!(value in localStorage)) { ret = false; }
        });
    return ret;
};
twi2url.signin = function() {
    twi2url.oauth = new OAuth(
        {
            consumerKey: consumer.CONSUMER_KEY,
            consumerSecret: consumer.CONSUMER_SECRET,

            requestTokenUrl: 'https://api.twitter.com/oauth/request_token',
            authorizationUrl: 'https://api.twitter.com/oauth/authorize',
            accessTokenUrl: 'https://api.twitter.com/oauth/access_token',
            callbackUrl: chrome.extension.getURL('page/oauth_callback.html')
        });
    if(twi2url.is_signed_in()) {
        twi2url.oauth.setAccessToken(
            localStorage.oauth_token, localStorage.oauth_token_secret);
        return;
    }

    twi2url.oauth.get(
        twi2url.oauth.requestTokenUrl, function(data) {
            window.open(twi2url.oauth.authorizationUrl + '?' + data.text);
            twi2url.wait_verifier(data);
        }, twi2url.error);
};
twi2url.wait_verifier = function(data) {
    if('oauth_verifier' in twi2url) {
        twi2url.oauth.get(
            twi2url.oauth.accessTokenUrl +
                '?' + data.text + '&' +
                $.param({oauth_verifier: twi2url.oauth_verifier}),
            function(data) {
                delete twi2url.oauth_verifier;

                var q = $.query.load('?' + data.text);
                $.each(
                    twi2url.LOCAL_STORAGE_KEY,
                    function(k, v) {
                        localStorage[v] = q.get(v);
                    });
                twi2url.signin();
            }, twi2url.error);
    } else {
        window.setTimeout(function() {
                              twi2url.wait_verifier(data);
                          }, 1000);
    }
};
