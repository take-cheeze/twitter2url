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
    function error_callback(res) {
        twi2url.error(res);
        twi2url.urls.unshift(str);
    };
    function get_og_image(data) {
        return data.match(
                /<meta property=["']og:image["'] content=["']([^'"]+)["']/)[1];
    };
    function get_og_description(data) {
        return data.match(
                /<meta property=["']og:description["'] content=["']([^'"]+)["']/)[1];
    };
    function get_og_title(data) {
        return data.match(
                /<meta property=["']og:title["'] content=["']([^'"]+)["']/)[1];
    };
    function image_tag(url) { return '<img src="' + url + '">'; };
    function image_file(url, callback)
    { callback(url, '', image_tag(url)); };
    function unescapeHTML(str) {
        return $('<div />').html(str).text();
    };
    function escapeHTML(str) {
        return $('<div />').text(str).html();
    };
    function og_callback(url, callback) {
        $.ajax(
            {
                'url': url, dataType: 'html',
                success: function(data) {
                    callback(
                        url, unescapeHTML(get_og_description(data)),
                        image_tag(get_og_image(data))
                    );
                }, error: error_callback
            });
    };
    function og_callback_title(url, callback) {
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
    function google_docs_viewer(url, callback) {
        callback(url, '',
                 '<iframe title="Google Docs Viewer" class="google-docs-viewer" type="text/html" ' +
                 'src="https://docs.google.com/viewer?' +
                 $.param({'url': url, 'embedded': true}) + '" width="100%" height="600" />');
    };
    function oembed_default_callback(data, callback) {
        callback(data.url, data.description, data.html);
    };
    function oembed(url, default_callback, oembed_callback) {
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
        '^http://photozou.jp/photo/\\w+/(\\d+)/(\\d+)$': function(url, callback) {
            var id = url.match(/^http:\/\/photozou.jp\/photo\/\w+\/(\d+)\/(\d+)/)[2];
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
        '^http://twitpic\\.com/(\\w+)(/full)?/?': function(url, callback) {
            var id = url.match(/^http:\/\/twitpic.com\/(\w+)(\/full)?\/?/)[1];
            $.ajax(
                {
                    'url': 'http://api.twitpic.com/2/media/show.json?' +
                        $.param({'id': id}),
                    dataType: 'json',
                    success: function(data) {
                        callback(
                            'http://twitpic.com/' + id + '/full', data.message,
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
        '^http://www.twitlonger.com/show/\\w+/?$': function(url, callback) {
            $.ajax(
                {
                    'url': url, dataType: 'html',
                    success: function(data) {
                        callback(url, '', '<p>' + data.match(/<p>\n\t*(.*)\s*/m)[1] + '</p>');
                    }, error: error_callback
                });
        },
        '^https?://gist.github.com/\\w+/?': function(url, callback) {
            var id = url.match(/^https?:\/\/gist.github.com\/(\w+)\/?/)[1];
            $.ajax(
                {
                    'url': 'https://gist.github.com/' + id + '.js', dataType: 'text',
                    success: function(data) {
                        var html = '';
                        $.each(data.match(/document\.write\('(.+)'\)/g), function(k, v) {
                                   html += v.match(/document\.write\('(.+)'\)/)[1];
                               });
                        callback(url, '', eval("html = '" + html + "'"));
                    }, error: error_callback
                });
        },
        '^http://www.tweetdeck.com/twitter/\\w+/~\\w+': function(url, callback) {
            $.ajax(
                {
                    'url': url, dataType: 'html',
                    success: function(data) {
                        callback(url, '', '<p>' + data.match(/\/\/ <p>(.*)<\/p>/)[1] + '</p>');
                    }, error: error_callback
                });
        },
        '^http://tmbox.net/pl/\\d+/?$': function(url, callback) {
            $.ajax(
                {
                    'url': url, dataType: 'html',
                    success: function(data) {
                        callback(url, '', data.match(/\/\/<object>(.*)<\/object>$/)[1]);
                    }, error: error_callback
                });
        },
        '^https?://ideone.com/\\w+/?$': function(url, callback) {
            var id = url.match(/^http:\/\/ideone.com\/(\w+)\/?$/)[1];
            $.ajax(
                {
                    'url': 'http://ideone.com/plain/' + id, dataType: 'text',
                    success: function(data) {
                        callback(url, '', '<pre>' + escapeHTML(data) + '</pre>');
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
        '^http://ow.ly/i/\\w+': function(url, callback) {
            var id = url.match(/^http:\/\/ow.ly\/i\/(\w+)/)[1];
            callback(
                'http://ow.ly/i/' + id + '/original', '',
                image_tag('http://static.ow.ly/photos/normal/' + id + '.jpg'));
        },
        '^http://www.youtube.com/watch\\?.*v=[\\w\\-]+': function(url, callback) {
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
        /*
        '/.+/': function(url, callback) {
            $.ajax(
                {
                    url: url, dataType: 'html', success: function(data) {
                        if(data.match(/<link rel=("|')stylesheet("|') [^>]+wp-content/i)) {
                            oembed('http://public-api.wordpress.com/oembed/1.0/?' +
                                   $.param({'for': 'twi2url', format: 'json', 'url': url}),
                                   callback, function(data) {
                                       callback(url, data.title, data.html);
                                   });
                        } else { error_callback(); }
                    }, error: error_callback
                });
        },
         */
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
        '^http://www.flickr.com/photos/[@\\w\\-]+/\\d+/?': function(url, callback) {
            oembed('http://www.flickr.com/services/oembed?' +
                   $.param({'url': url, format: 'json'}),
                   callback, function(data) {
                       callback(url, data.title, image_tag(data.url));
                   });
        },
        '^http://www.docodemo.jp/twil/view/': function(url, callback) {
            oembed('http://www.docodemo.jp/twil/oembed.json?' +
                   $.param({'url': url}),
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
                                 unescapeHTML(data.match(/<input type="text" class="txt" id="vtSource" value="([^"]+)" onClick/)[1]));
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
                     'width="480" height="360" frameborder="0" />');
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
        '^http://www.ustream.tv/channel/.+#?': function(url, callback) {
            var id = url.match(/^http:\/\/www.ustream.tv\/channel\/(.+)#?/)[1];
            $.ajax(
                {
                    url: 'http://api.ustream.tv/json/channel/' + id + '/getCustomEmbedTag?' +
                        $.param({key: consumer.USTREAM_KEY, params: 'autoplay:true'}),
                    dataType: 'json', success: function(data) {
                        callback(url, '', data.results);
                    }
                });
        },
        '^http://layercloud.net/items/detail_top/\\d+/?$': function(url, callback) {
            var id = url.match(/^http:\/\/layercloud.net\/items\/detail_top\/(\d+)\/?$/)[1];
            $.ajax(
                {
                    url: url, dataType: 'html', success: function(data) {
                        callback(
                            url, data.match(/<p class="ItemDescription">(.*)<\/p>/m),
                            image_tag('http://layercloud.net/img/items/' + id + '.jpg'));
                    }
                });
        },
        '^http://www.drawlr.com/d/\\w+/view/?$': function(url, callback) {
            $.ajax(
                {
                    url: url, dataType: 'html', success: function(data) {
                        callback(
                            url, '',
                            data.match(/var embed_code = '(.+)';/)[1]);
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
        '^http://fotolog.cc/\\w+/?$': og_callback,
        '^http://img.ly/\\w+$': og_callback,
        // open graph that use title as message
        '^http://www.lomography.jp/photos/\\d+/?$': og_callback_title,
        '^http://pikubo.jp/photo/[\\w\\-]+$': og_callback_title,
        '^http://picplz.com/user/\\w+/pic/\\w+/$': og_callback_title,
        '^http://www.mobypicture.com/user/\\w+/view/\\d+': og_callback_title,
        '^http://yfrog.com/(\\w*)$': og_callback_title,
        '^.*$': function(url, callback) {
            oembed('http://embeddit.appspot.com/fetch/?' + $.param({'url': url}), callback);
        },
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
    } catch(e) { console.error(e); }
    return false;
};
