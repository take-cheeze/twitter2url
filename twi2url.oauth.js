twi2url.signout = function() {
    $.each(
        twi2url.LOCAL_STORAGE_KEY,
        function(key, value) { delete localStorage[value]; }
    );
};
twi2url.is_signed_in = function() {
    var ret = true;
    $.each(
        twi2url.LOCAL_STORAGE_KEY,
        function(key, value) {
            if(!(value in localStorage)) { ret = false; }
        }
    );
    return ret;
};
twi2url.signin = function() {
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
};
