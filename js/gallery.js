var history = [];
var cache = [], CACHE_SIZE = 10;
var last_draw = null;

function draw() {
    $('#left_count')
        .empty()
        .append($(document.createElement('div')).text(
                    gallery_stack().length + ' items left / (' + history.length + ' items in history)')
        .append($(document.createElement('input'))
                  .attr({ 'type': 'button' })
                  .val('Clean')
                  .click(get_background().twi2url.refilter_gallery)));
    if(gallery_stack().length === 0) {
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

    if(gallery_stack().length > 0) {
        var current = gallery_stack()[0];
        if((last_draw === null) || (current.url !== last_draw.url)) {
            rebuild_tag_cache();
            $('#url_bar').html(current.url);
            $('#canvas').empty();
            $(cache[0]).appendTo('#canvas');
            $('#message').html(current.message);
            $('a[rel=video]').createVideo();
            last_draw = current;
        }
    } else {
        last_draw = null;
        $('#url_bar').html('');
        $('#canvas').html('');
        $('#message').html('');
    }
}

function next() {
    if(gallery_stack().length <= 0) { return; }

    // add to history
    chrome.history.addUrl({'url': gallery_stack()[0].url});

    gallery_stack()[0].tag_obj = cache.shift();
    history.push(gallery_stack().shift());
    while(cache.length < Math.min(gallery_stack().length, CACHE_SIZE))
    { cache.push($(gallery_stack()[cache.length].tag)); }
}
function prev() {
    if(history.length <= 0) { return; }

    cache.unshift(history[history.length-1].tag_obj);
    gallery_stack().unshift(history.pop());
    delete gallery_stack()[0].tag_obj;
    while(cache.length > CACHE_SIZE) { cache.pop(); }
}
function open_url() {
    if(gallery_stack().length <= 0) { return; }
    window.open(gallery_stack()[0].url);
}

function get_background() {
    return chrome.extension.getBackgroundPage();
}
function gallery_stack() {
    return get_background().twi2url.gallery_stack;
}
function rebuild_tag_cache() {
    cache = [];
    for(var i = 0; i < Math.min(gallery_stack().length, CACHE_SIZE); i++) {
        try {
            cache.push($(gallery_stack()[i].tag));
        } catch(e) { console.log(e); }
    }
}

$(function() {
      document.onkeydown = function(e) {
          switch(e.keyIdentifier) {
          case 'Left': prev(); break;
          case 'Right': next(); break;
          case 'U+0056': open_url(); break;
          default: return undefined;
          }
          return false;
      };
      window.setInterval(window.draw, 500);
      $('#prev_button').click(prev);
      $('#open_button').click(open_url);
      $('#next_button').click(next);
  });
