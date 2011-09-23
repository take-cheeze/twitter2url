var history = [];
var cache = [], CACHE_SIZE = 5;
var last_draw = null;

function draw() {
    $('#left_count').html(get_background().twi2url.gallery_stack.length +
                          ' items left / (' +
                          history.length + ' items in history)' +
                          ' <input type="button" value="Clean"' +
                          ' onclick="get_background().twi2url.refilter_gallery()">');
    if(get_background().twi2url.gallery_stack.length === 0) {
        $('#next_button').attr('disabled', true);
        $('#open_button').attr('disabled', true);
    } else {
        $('#next_button').removeAttr('disabled');
        $('#open_button').removeAttr('disabled');
    }
    if(history.length === 0) {
        $('#prev_button').attr('disabled', true);
    } else {
        $('#prev_button').removeAttr('disabled');
    }

    if(get_background().twi2url.gallery_stack.length > 0) {
        var current = get_background().twi2url.gallery_stack[0];
        if((last_draw === null) || (current.url !== last_draw.url)) {
            $('#url_bar').html(current.url);
            $('#canvas').html(current.tag);
            $('#message').html(unescapeHTML(current.message));
	        $('a[rel=video]').createVideo();
            last_draw = current;
        }
    } else {
        last_draw = null;
        $('#url_bar').html('');
        $('#canvas').html('');
        $('#message').html('');
    }

    (function() {
         var gallery_stack = get_background().twi2url.gallery_stack;
         cache = [];
         for(var i = 0; i < Math.min(gallery_stack.length, CACHE_SIZE); i++) {
             (function(tag) {
                  var m = tag.match(/<img src="([^"]*)"/);
                  if(m && m.length == 2) {
                      cache.unshift(new Image());
                      cache[0].src = m[1];
                  }
              })(gallery_stack[i].tag);
         }
     })();
}

function next() {
    var gallery_stack = get_background().twi2url.gallery_stack;
    if(gallery_stack.length <= 0) { return; }

    history.push(gallery_stack.shift());
    chrome.history.addUrl({'url': history[history.length-1].url});
}
function prev() {
    if(history.length <= 0) { return; }

    get_background().twi2url.gallery_stack.unshift(history.pop());
}
function open_url() {
    if(get_background().twi2url.gallery_stack.length <= 0) { return; }
    window.open(get_background().twi2url.gallery_stack[0].url);
}

document.onkeydown = function(e) {
    (e.keyIdentifier == 'Left')? prev() :
    (e.keyIdentifier == 'Right')? next() :
    (e.keyIdentifier == 'U+0056')? open_url() :
        (function() {})();
};

function get_background() {
    return chrome.extension.getBackgroundPage();
}

function unescapeHTML(str) {
    return $('<div />').html(str).text();
};
function escapeHTML(str) {
    return $('<div />').text(str).html();
};

$(function() { window.setInterval(window.draw, 500); });
