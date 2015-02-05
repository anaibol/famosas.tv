var express = require('express');
var router = express.Router();

var url = require('url');
var path = require('path');
var fs = require('fs');
var zlib = require('zlib');

var db = require('monk')('localhost/famosas');
var Keywords = db.get('keywords');

function slug(str) {
  str = str.replace(/^\s+|\s+$/g, ''); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  var from = "ãàáäâẽèéëêìíïîõòóöôùúüûñç·/_,:;";
  var to = "aaaaaeeeeeiiiiooooouuuunc------";
  for (var i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }

  str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-'); // collapse dashes

  return str;
}

router.get('/index.xml.gz', function(req, res) {
  var siteMapFile = publicDir + 'index.xml.gz';
  //fs.exists(siteMapFile, function(exists) {
  //if (!exists) {
  generateSitemapIndex(req.headers.host, siteMapFile, function(success) {
    if (success) {
      res.type('gzip');
      res.sendFile(path.resolve(siteMapFile));
    }
  });
  //}
  //else {
  //  res.sendFile(siteMapFile);
  //}
});

router.get('/:id.xml.gz', function(req, res) {
  var id = req.params.id;
  var siteMapFile = publicDir + id + '.xml.gz';

  //fs.exists(siteMapFile, function(exists) {
  //if (!exists) {

  generateSitemap(id, req.headers.host, siteMapFile, function(success) {
    if (success) {
      res.type('gzip');
      res.sendFile(path.resolve(siteMapFile));
    }
  });
  //}
  //else {
  //  res.sendFile(siteMapFile);
  //}
  //});
});

var MaxSitemapUrls = 10000;

function generateSitemapIndex(host, siteMapFile, cb) {
  var url;
  var priority = 0.5;
  var freq = 'monthly';
  var xml = '<sitemapindex xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/siteindex.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

  var siteMap = {};
  var dateModified;

  return Keywords.count({}, function(err, numKeywords) {
    var numSiteMaps = Math.floor(numKeywords / MaxSitemapUrls);
    if (numSiteMaps < 1) {
      numSiteMaps = 1;
    }

    for (var i = 1; i <= numSiteMaps; i++) {
      //dateModified = post.dateModified;
      url = 'http://' + host + '/sitemap/' + i + '.xml.gz';
      xml += '<sitemap>';
      xml += '<loc>' + url + '</loc>';
      //xml += '<lastmod>' + dateModified + '</lastmod>';
      //xml += '<changefreq>' + freq + '</changefreq>';
      //xml += '<priority>' + priority + '</priority>';
      xml += '</sitemap>';
    }

    xml += '</sitemapindex>';

    zlib.gzip(xml, function(_, result) { // The callback will give you the 
      fs.writeFile(siteMapFile, result, function(err) {
        if (err) {
          console.log(err);

        } else {
          if (typeof cb == "function") cb(true);
        }
      }); // result, so just send it.
    });
  });
}

function generateSitemap(id, host, siteMapFile, cb) {
  var from = MaxSitemapUrls * (id - 1);

  var options = {
    limit: MaxSitemapUrls,
    skip: from,
    sort: {
      _id: 1
    }
  };

  return Keywords.find({}, options, function(err, keywords) {
    if (err) return;

    var url;
    var priority = 0.5;
    var freq = 'monthly';
    var xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

    var keyword = {};

    var date;
    var month;
    var day;

    for (var i = 0; i < keywords.length; i++) {
      keyword = keywords[i];
      //date = new Date(post.dateModified);
      //month = ('0' + date.getMonth() + 1).slice(-2);
      //day = ('0' + date.getDate()).slice(-2);

      //date = date.getFullYear() + '-' + month + '-' + day;
      url = 'http://' + host + '/' + slug(keyword.keyword);
      xml += '<url>';
      xml += '<loc>' + url + '</loc>';
      //xml += '<lastmod>' + date + '</lastmod>';
      //xml += '<changefreq>' + freq + '</changefreq>';
      //xml += '<priority>' + priority + '</priority>';
      xml += '</url>';
    }

    xml += '</urlset>';

    zlib.gzip(xml, function(_, result) { // The callback will give you the 
      fs.writeFile(siteMapFile, result, function(err) {
        if (err) {
          console.log(err);

        } else {
          if (typeof cb == "function") cb(true);
        }
      }); // result, so just send it.
    });
  });
}

module.exports = router;