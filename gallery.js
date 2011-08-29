var history = [];
var cache = [], CACHE_SIZE = 5;
var last_draw = null;

function draw() {
    $('#left_count').html(get_background().twi2url.gallery_stack.length +
                          ' items left');

    if(get_background().twi2url.gallery_stack.length > 0) {
        var current = get_background().twi2url.gallery_stack[0];
        if((last_draw === null) || (current.url !== last_draw.url)) {
            $('#image_canvas').html(current.tag);
            $('#image_message').html(current.message);
            last_draw = current;
        }
    } else {
        last_draw = null;
        $('#image_canvas').html('');
        $('#image_message').html('');
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

setInterval(this.draw, 500);
