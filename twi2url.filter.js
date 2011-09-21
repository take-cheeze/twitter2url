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
    var src = twi2url.gallery_stack; // swap(twi2url.gallery_stack, src);
    twi2url.gallery_stack = [];

    $.each(src, function(k, v) { twi2url.urls.push(v.url); });
    twi2url.clean_urls();
};
twi2url.match_gallery_filter = function(str, callback) {
    var error_callback = function(res) {
        twi2url.error(res);
        twi2url.urls.push(str);
    };
    var get_og_image = function(data) {
        return data.match(
                /<meta property=["']og:image["'] content=["']([^'"]+)["']/)[1];
    };
    var get_og_description = function(data) {
        return data.match(
                /<meta property=["']og:description["'] content=["']([^'"]+)["']/)[1];
    };
    var get_og_title = function(data) {
        return data.match(
                /<meta property=["']og:title["'] content=["']([^'"]+)["']/)[1];
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
        twi2url.urls.push('https://docs.google.com/viewer?' +
                          $.param({'url': url}));
    };
    var oembed_default_callback = function(data, callback) {
        callback(url, data.description, data.html);
    };
    var oembed = function(url, default_callback, oembed_callback) {
        $.ajax(
            {
                'url': url, dataType: 'json',
                success: function(data) {
                    if(oembed_callback === undefined) {
                        oembed_default_callback(data, default_callback);
                    } else { oembed_callback(data); }
                }, error: error_callback
            });
    };

    var GALLERY_FILTER = {
        '^http://photozou.jp/photo/show/(\\d+)/(\\d+)$': function(url, callback) {
            var id = url.match(/^http:\/\/photozou.jp\/photo\/show\/(\d+)\/(\d+)/)[2];
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
        '^http://twitpic\\.com/(\\w+)/?$': function(url, callback) {
            var id = url.match(/^http:\/\/twitpic.com\/(\w+)$/)[1];
            $.ajax(
                {
                    'url': 'http://api.twitpic.com/2/media/show.json?' +
                        $.param({'id': id}),
                    dataType: 'json',
                    success: function(data) {
                        callback(
                            url + '/full', data.message,
                            image_tag('http://twitpic.com/show/large/' + id)
                        );
                    }, error: error_callback
                });
        },
        '^http://p.twipple.jp/\\w+$': function(url, callback) {
            var id = url.match(/^http:\/\/p.twipple.jp\/(\w+)$/)[1];
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
        '^http://lightbox.com/\\w+$': function(url, callback) {
            $.ajax(
                {
                    'url': url, dataType: 'html',
                    success: function(data) {
                        callback(
                            url, data.match(
                                    /<div id="photo_title"><h2 id="head_title">(.*)<\/h2>/)[1],
                            image_tag(get_og_image(data)));
                    }, error: error_callback
                });
        },
        '^http://\\w+.tuna.be/\\d+.html$': function(url, callback) {
            $.ajax(
                {
                    'url': url, dataType: 'html',
                    success: function(data) {
                        callback(
                            url, data.match(
                                    /<link rel="alternate" media="handheld" title="([^"]+)"/)[1],
                            image_tag('http://tuna.be/show/thumb/' +
                                      url.match(/^http:\/\/\w+.tuna.be\/(\d+).html$/)[1]));
                    }, error: error_callback
                });
        },
        '^http://movapic.com/pic/\\w+$': function(url, callback) {
            callback(
                url, '', image_tag(
                    url.replace(
                            /http:\/\/movapic.com\/pic\/(\w+)/,
                        'http://image.movapic.com/pic/m_$1.jpeg')));
        },
        '^http://gyazo.com/\\w+$': function(url, callback) {
            callback(url, '', image_tag(url + '.png'));
        },
        '^http://ow.ly/i/\\w+$': function(url, callback) {
            var id = url.match(/^http:\/\/ow.ly\/i\/(\w+)$/)[1];
            callback(
                url + '/original', '',
                image_tag('http://static.ow.ly/photos/normal/' + id + '.jpg'));
        },
        '^http://www.youtube.com/watch\\?v=[\\w\\-]+': function(url, callback) {
            oembed('http://www.youtube.com/oembed?' +
                   $.param({'url': url, format: 'json'}),
                   callback, function(data) {
                       data.html = data.html.replace(
                               /(src="[^"]+)"/, '$1&autoplay=1"');
                       callback(url, data.title, data.html);
                   });
        },
        '^http://vimeo.com/\\d+$': function(url, callback) {
            oembed('http://vimeo.com/api/oembed.json?' +
                   $.param({'url': url, autoplay: true, iframe: true}),
                   callback);
        },
        '^http://soundcloud.com/.+/.+$': function(url, callback) {
            oembed('http://soundcloud.com/oembed?' +
                   $.param({'url': url,
                            format: 'json', auto_play: true}), callback);
        },
        '\\w+.wordpress.com/.+': function(url, callback) {
            oembed('http://public-api.wordpress.com/oembed/1.0/?' +
                   $.param({'for': 'twi2url', format: 'json', 'url': url}),
                   callback, function(data) {
                       callback(url, data.title, data.html);
                   });
        },
        '^http://www.slideshare.net/[^/]+/[^/]+$': function(url, callback) {
            oembed('http://www.slideshare.net/api/oembed/2?' +
                   $.param({'url': url, format: 'json'}),
                   callback, function(data) {
                       callback(url, data.title, data.html);
                   });
        },
        '^http://instagr.am/p/[\\-\\w]+/?$': function(url, callback) {
            oembed('http://api.instagram.com/oembed?' + $.param({'url': url}),
                   callback, function(data) {
                       callback(url, data.title, image_tag(data.url));
                   });
        },
        '^http://.+\\.deviantart.com/art/.+$': function(url, callback) {
            oembed('http://backend.deviantart.com/oembed?' +
                   $.param({'url': url}),
                   callback, function(data) {
                       callback(url, data.title, image_tag(data.url));
                   });
        },
        '^http://www.flickr.com/photos/[@\\w]+/\\d+/?$': function(url, callback) {
            oembed('http://www.flickr.com/services/oembed?' +
                   $.param({'url': url, format: 'json'}),
                   callback, function(data) {
                       callback(url, data.title, image_tag(data.url));
                   });
        },
        '^http://www.nicovideo.jp/watch/\\w+': function(url, callback) {
            callback(url, '', '<a rel="video" href="' + url + '" />');
            /*
            var id = url.match(/^http:\/\/www.nicovideo.jp\/watch\/(\w+)/)[1];
            callback(
                url, '', '<script type="text/javascript" src="http://ext.nicovideo.jp/thumb_watch/' +
                    id + '"></script>');
             */
        },
        '^http://lockerz.com/s/\\d+$': function(url, callback) {
            $.ajax(
                {
                    'url': url, dataType: 'html',
                    success: function(data) {
                        callback(
                            url, data.match(/<p>([^<]+)<\/p>/)[1],
                            image_tag(data.match(/<img id="photo" src="([^"]+)"/)[1])
                        );
                    }, error: error_callback
                });
        },
        '^http://kokuru.com/\\w+/?$': function(url, callback) {
            $.ajax(
                {
                    'url': url, dataType: 'html',
                    success: function(data) {
                        callback(url, data.match(/<p>(.*)<\/p>\s*<span class=/m)[1],
                                 image_tag(data.match(/http:\/\/image.kokuru.com\/file\/\d+\/real\/\w+\.jpg/)[0]));
                    }, error: error_callback
                });
        },
        '^http://twitvideo.jp/\\w+/?$': function(url, callback) {
            $.ajax(
                {
                    'url': url, dataType: 'html',
                    success: function(data) {
                        callback(url, data.match(/<span class="sf_comment">(.+)<\/span>/)[1],
                                 data.match(/<input type="text" class="txt" id="vtSource" value="([^"]+)" onClick/)[1]);
                    }, error: error_callback
                });
        },
        '^http://twitcasting.tv/\\w+/?$': function(url, callback) {
            var id = url.match(/^http:\/\/twitcasting.tv\/(\w+)\/?$/)[1];
            callback(url, '',
                     '<video src="http://twitcasting.tv/' + id + '/metastream.m3u8/?video=1"' +
                     ' autoplay="true" controls="true"' +
                     ' poster="http://twitcasting.tv/' + id + '/thumbstream/liveshot" />');
        },
        '^http://www.twitvid.com/\\w+/?$': function(url, callback) {
            var id = url.match(/^http:\/\/www.twitvid.com\/(\w+)\/?$/)[1];
            callback(url, '',
                     '<iframe title="Twitvid video player" class="twitvid-player" type="text/html" ' +
                     'src="http://www.twitvid.com/embed.php?' +
                     $.param({guid: id, autoplay: 1}) + '" ' +
                     'width=480" height="360" frameborder="0" />');
        },
        '^http://www.ustream.tv/recorded/\\d+': function(url, callback) {
            var id = url.match(/^http:\/\/www.ustream.tv\/recorded\/(\d+)/)[1];
            $.ajax(
                {
                    url: 'http://api.ustream.tv/json/video/' + id + '/getCustomEmbedTag?' +
                        $.param({key: consumer.USTREAM_KEY, params: 'autoplay:true'}),
                    dataType: 'json', success: function(data) {
                        callback(url, '', data.results);
                    }
                });
        },
        '^http://www.ustream.tv/channel/.+$': function(url, callback) {
            var id = url.match(/^http:\/\/www.ustream.tv\/channel\/(.+)$/)[1];
            $.ajax(
                {
                    url: 'http://api.ustream.tv/json/channel/' + id + '/getCustomEmbedTag?' +
                        $.param({key: consumer.USTREAM_KEY, params: 'autoplay:true'}),
                    dataType: 'json', success: function(data) {
                        callback(url, '', data.results);
                    }
                });
        },
        // image file
        '^.+\\.png$': image_file, '^.+\\.JPG$': image_file,
        '^.+\\.jpg$': image_file, '^.+\\.gif$': image_file,
        '^.+\\.jpeg$': image_file,
        // google docs
        '^http://.*\\.docx?$': google_docs_viewer,
        '^http://.*\\.xlsx?$': google_docs_viewer,
        '^http://.*\\.pptx?$': google_docs_viewer,
        '^http://.*\\.pages$': google_docs_viewer,
        '^http://.*\\.ttf$': google_docs_viewer,
        '^http://.*\\.psd$': google_docs_viewer,
        '^http://.*\\.ai$': google_docs_viewer,
        '^http://.*\\.tiff$': google_docs_viewer,
        '^http://.*\\.dxf$': google_docs_viewer,
        '^http://.*\\.svg$': google_docs_viewer,
        '^http://.*\\.xps$': google_docs_viewer,
        '^http://.*\\.pdf$': google_docs_viewer,
        // open graph
        '^http://english.aljazeera.net/.+': og_callback,
        '^http://seiga.nicovideo.jp/seiga/im': og_callback,
        '^http://www.pixiv.net/member_illust.php': og_callback,
        '^http://soundtracking.com/tracks/\\w+$': og_callback,
        '^http://img.ly/\\w+$': og_callback,
        // open graph that use title as message
        '^http://pikubo.jp/photo/[\\w\\-]+$': og_callback_title,
        '^http://picplz.com/user/\\w+/pic/\\w+/$': og_callback_title,
        '^http://www.mobypicture.com/user/\\w+/view/\\d+': og_callback_title,
        '^http://yfrog.com/(\\w*)$': og_callback_title
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
