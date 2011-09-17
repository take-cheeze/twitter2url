twi2url.match_exclude_filter = function(str) {
    if(str == null) return true;
    for(var i in twi2url.exclude_filters) {
        if(twi2url.exclude_filters[i].test(str)) {
            return true;
        }
    }
    return false;
};
twi2url.refilter_gallery = function() {
    $.each(
        twi2url.gallery_stack, function(k, v) {
            if(!twi2url.match_gallery_filter(
                   v.url, function(url, message, tag) {
                       var t = {
                           'url': url, 'message': message, 'tag': tag };
                       result.push(t);
                   })) { return; }
        }
    );
};
twi2url.match_gallery_filter = function(str, callback) {
    var error_callback = function(res) {
        twi2url.error(res);
        twi2url.urls.push(str);
    };
    var get_og_image = function(data) {
        var m = data.match(/<meta property=["']og:image["'] content=["']([^'"]+)["']/);
        if(m.length != 2) {
            error_callback(m);
            throw new Error('og:image parse error');
        }
        return m[1];
    };
    var get_og_description = function(data) {
        var m = data.match(/<meta property=["']og:description["'] content=["']([^'"]+)["']/);
        if(m.length != 2) {
            error_callback(m);
            throw new Error('og:description parse error');
        }
        return unescape(m[1]);
    };
    var get_og_title = function(data) {
        var m = data.match(/<meta property=["']og:title["'] content=["']([^'"]+)["']/);
        if(m.length != 2) {
            error_callback(m);
            throw new Error('og:title parse error');
        }
        return unescape(m[1]);
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
    var og_callback_title = function(url, callback) {
        $.ajax(
            {
                'url': url, dataType: 'html',
                success: function(data) {
                    callback(
                        url, get_og_title(data),
                        image_tag(get_og_image(data))
                    );
                }, error: error_callback
            });
    };
    var google_docs_viewer = function(url, callback) {
        twi2url.urls.push('https://docs.google.com/viewer?url='
                          + encodeURIComponent(url));
    };
    var oembed = function(url, default_callback, oembed_callback) {
        $.ajax(
            {
                'url': url, dataType: 'json',
                success: function(data) {
                    if(oembed_callback === undefined) {
                        default_callback(url, data.description, data.html);
                    } else { oembed_callback(data); }
                }, error: error_callback
            });
    };
    var oembed_image_callback = function(data) {
        callback(url, data.title, image_tag(data.url));
    };
    var GALLERY_FILTER = {
        '^http://pikubo.jp/photo/[a-zA-Z_0-9\\-]+$': og_callback_title,
        '^http://picplz.com/user/[a-zA-Z0-9_]+/pic/[a-zA-Z_0-9]+/$': og_callback_title,
        '^http://www.mobypicture.com/user/[a-zA-Z0-9_]+/view/[0-9]+': og_callback_title,
        '^http://yfrog.com/([a-z0-9]*)$': og_callback_title,
        '^http://photozou.jp/photo/show/([0-9]+)/([0-9]+)$': function(url, callback) {
            var id = url.match(/http:\/\/photozou.jp\/photo\/show\/([0-9]+)\/([0-9]+)/)[2];
            $.ajax(
                {
                    'url': 'http://api.photozou.jp/rest/photo_info?'
                        + $.param({photo_id: id}),
                    dataType: 'xml',
                    success: function(xml) {
                        callback(
                            url.replace('show', 'photo_only'),
                            $('description', xml).text(),
                            image_tag($('image_url', xml).text()));
                    }, error: error_callback
                });
        },
        '^http://twitpic\\.com/([a-zA-Z0-9]+)$': function(url, callback) {
            var id = url.match(/^http:\/\/twitpic.com\/([a-zA-Z0-9]+)$/)[1];
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
        "^http://english.aljazeera.net/.+": og_callback,
        "^http://seiga.nicovideo.jp/seiga/im": og_callback,
        "^http://www.pixiv.net/member_illust.php": og_callback,
        "^http://soundtracking.com/tracks/[a-z0-9]+$": og_callback,
        "^http://img.ly/[A-Za-z0-9]+$": og_callback,
        "^http://p.twipple.jp/[a-zA-Z0-9]+$": function(url, callback) {
            var id = url.match(/^http:\/\/p.twipple.jp\/([a-zA-Z0-9]*)$/)[1];
            var photo_url = 'http://p.twipple.jp/data';
            for(var i = 0; i < id.length; i++) { photo_url += '/' + id[i]; }
            photo_url += '.jpg';
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
                url, '', image_tag(
                    url.replace(
                            /http:\/\/movapic.com\/pic\/([a-z0-9]+)/,
                        'http://image.movapic.com/pic/m_$1.jpeg'
                    )));
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
        '^http://www.youtube.com/watch\\?v=[a-zA-Z0-9]+': function(url, callback) {
            oembed('http://www.youtube.com/oembed?url=' +
                   encodeURIComponent(url) + '&format=json', callback,
                   function(data) {
                       data.html = data.html.replace(
                               /(src="[^"]+)"/, '$1&autoplay=1"');
                       callback(url, data.title, data.html);
                   });
        },
        '[a-z]+.wordpress.com/.+': function(url, callback) {
            oembed('http://public-api.wordpress.com/oembed/1.0/?' +
                       $.param({
                                   'for': 'twi2url',
                                   format: 'json',
                                   'url': url
                               }),
                   callback,
                   function(data) { callback(url, data.title, data.html); });
        },
        '^http://vimeo.com/[0-9]+$': function(url, callback) {
            oembed('http://vimeo.com/api/oembed.json?url=' +
                   encodeURIComponent(url) + '&autoplay=1', callback);
        },
        '^http://soundcloud.com/.+/.+$': function(url, callback) {
            oembed('http://soundcloud.com/oembed?url=' +
                   encodeURIComponent(url) + '&format=json&autoplay=true', callback);
        },
        '^http://www.slideshare.net/[^/]+/[^/]+$': function(url, callback) {
            oembed('http://www.slideshare.net/api/oembed/2?url=' +
                   encodeURIComponent(url) + '&format=json', callback,
                   function(data) { callback(url, data.title, data.html); });
        },
        "^http://instagr.am/p/[\\-_a-zA-Z0-9]+/?$": function(url, callback) {
            oembed('http://api.instagram.com/oembed?url=' +
                   encodeURIComponent(url), callback, oembed_image_callback);
        },
        "^http://.+\\.deviantart/art/.+$": function(url, callback) {
            oembed('http://backend.deviantart.com/oembed?url=' +
                   encodeURIComponent(url), callback, oembed_image_callback);
        },
        '^http://www.flickr.com/photos/': function(url, callback) {
            oembed('http://flickr.com/services/oembed?url=' +
                   encodeURIComponent(url) + '&format=json',
                   callback, oembed_image_callback);
        },
        '^http://www.nicovideo.jp/watch/[a-z0-9]+': function(url, callback) {
            callback(url, '', '<a rel="video" href="' + url + '" />');
            /*
            var id = url.match(/^http:\/\/www.nicovideo.jp\/watch\/([a-z0-9]+)/)[1];
            callback(
                url, '', '<script type="text/javascript" src="http://ext.nicovideo.jp/thumb_watch/' +
                    id + '"></script>');
             */
        },
        "^http://lockerz.com/s/[0-9]+$": function(url, callback) {
            $.ajax(
                {
                    'url': url, dataType: 'html',
                    success: function(data) {
                        callback(
                            url, data.match(/<p>([^<]+)<\/p>/)[1],
                            image_tag(data.match(/<img id="photo" src="([^"]+)"/)[1])
                        );
                    }, error: error_callback});
        },
        "^.*\\.docx?$": google_docs_viewer,
        "^.*\\.xlsx?$": google_docs_viewer,
        "^.*\\.pptx?$": google_docs_viewer,
        "^.*\\.pages$": google_docs_viewer,
        "^.*\\.ttf$": google_docs_viewer,
        "^.*\\.psd$": google_docs_viewer,
        "^.*\\.ai$": google_docs_viewer,
        "^.*\\.tiff$": google_docs_viewer,
        "^.*\\.dxf$": google_docs_viewer,
        "^.*\\.svg$": google_docs_viewer,
        "^.*\\.xps$": google_docs_viewer,
        "^.*\\.pdf$": google_docs_viewer
    };
    try {
        for(var k in GALLERY_FILTER) {
            if((new RegExp(k)).test(str)) {
                twi2url.in_history(
                    str, function(exists) {
                        if(exists) { return; }
                        GALLERY_FILTER[k](str, callback);
                    });
                return true;
            }
        }
    } catch(e) { console.log(e); }
    return false;
};
