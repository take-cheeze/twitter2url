var history = [];
var cache = [], CACHE_SIZE = 5;

function draw() {
    $('#left_count').html(get_background().twi2url.gallery_stack.length +
                          ' items left');

    if(get_background().twi2url.gallery_stack.length > 0) {
        var current = get_background().twi2url.gallery_stack[0];
        $('#image_canvas').html(
            '<img src="' + current.photo_url +
                '" alt="' + current.message + '" />');
        $('#image_message').html(current.message);
    } else {
        $('#image_canvas').html('');
        $('#image_message').html('');
    }
}

function next() {
    var gallery_stack = get_background().twi2url.gallery_stack;
    if(gallery_stack.length <= 0) { return; }

    history.push(gallery_stack.shift());
    if(gallery_stack.length > CACHE_SIZE) {
        cache.unshift(new Image());
        cache[0].src = gallery_stack[1].photo_url;
        if(cache.length > CACHE_SIZE) { cache.pop(); }
    }
    draw();
}
function prev() {
    if(history.length <= 0) { return; }

    get_background().twi2url.gallery_stack.unshift(history.pop());
    draw();
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

setInterval(this.draw, 1000);
(function() {
     var gallery_stack = get_background().twi2url.gallery_stack;
     for(var i = 0; i < Math.min(gallery_stack.length, CACHE_SIZE); i++) {
         cache.unshift(new Image());
         cache[0].src = gallery_stack[i].photo_url;
     }
})();
