var history = [];

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
    if(get_background().twi2url.gallery_stack.length <= 0) { return; }

    history.push(get_background().twi2url.gallery_stack.shift());
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
    console.log(e);
    (e.keyIdentifier == 'Left')? prev() :
    (e.keyIdentifier == 'Right')? next() :
    (e.keyIdentifier == 'U+0056')? open_url() :
        (function() {})();
};

function get_background() {
    return chrome.extension.getBackgroundPage();
}

setInterval(this.draw, 1000);