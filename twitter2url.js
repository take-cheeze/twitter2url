#!/usr/bin/env node

var assert = require('assert');
var fs = require('fs');
var https = require('https');
var path = require('path');
var querystring = require('querystring');

var program_path = path.dirname(process.argv[1]);

var screen_name = 'take_cheeze';
var config_file = path.join(program_path, '.twitter2url_config.json');
var config = {};

if(path.existsSync(config_file)) {
    config_json = '';
    stream = fs.createReadStream(config_file);
    stream.on('data', function(data) {
        config_json += data;
    });
    stream.on('end', function() {
        config = JSON.parse(config_json);
    });
}

https.get({
    host: 'api.twitter.com', port: 443,
    path: '/1/lists.json?' + querystring.stringify({
        'screen_name': screen_name,
    }),
}, function(res) {
    var json_list_info = '';
    res.on('data', function(chunk) {
        json_list_info += chunk;
        res.resume();
    });
    res.on('end', function() {
        function gen_filename() {
            var d = new Date();
            return [
                d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(),
                d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(),
            ].join('_') + '.txt'
        }
        var result = fs.createWriteStream(path.join(program_path, gen_filename()))
        var list_info = JSON.parse(json_list_info).lists;
        for(var i in list_info) { (function(list_id, list_name) {
            https.get({
                host: 'api.twitter.com', port: 443,
                path: '/1/lists/statuses.json?' + querystring.stringify({
                    'include_entities': true,
                    'list_id': list_id,
                    'per_page': 500,
                }) + ((list_name in config)? '&' + querystring.stringify(
                    { 'since_id': config[list_name].since_id }) : ""),
            }, function(status_res) {
                assert.equal(status_res.statusCode, 200);
                var json_data = '';
                status_res.on('data', function(chunk) {
                    json_data += chunk;
                    status_res.resume();
                });
                status_res.on('end', function() {
                    var data = JSON.parse(json_data);
                    console.log('Processing list: ' + list_name);
                    var found_urls = 0;
                    if(data.length > 0) {
                        console.log('Fetched ' + data.length + ' tweets');
                        for(var j in data) {
                            if((list_name in config) && (config[list_name].since_id > data[j].id_str)) {
                                continue;
                            }
                            var urls = data[j].entities.urls;
                            for(var k in urls) {
                                var url = unescape(urls[k].expanded_url);
                                if(url == null) { continue; }

                                ++found_urls;
                                var expander = new (require('url-expander').SingleUrlExpander)(url);
                                expander.on('expanded', function(original, expandedUrl) {
                                    result.write(expandedUrl + '\n');
                                });
                                expander.expand();
                            }
                        }
                        config[list_name] = { 'since_id': data[0].id_str };
                        fs.createWriteStream(config_file).write(JSON.stringify(config));
                    }
                    console.log('Found ' + found_urls + ' urls');
                });
            });
        })(list_info[i].id_str, list_info[i].name); }
    });
});
