$(function() {
      var q = $.query.load(location.href);
      var background = chrome.extension.getBackgroundPage();

      background.twi2url.oauth_verifier = q.get('oauth_verifier');
      window.close();
  });
