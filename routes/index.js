var express = require('express');
var router = express.Router();
// var youtube = require('youtube-feeds');

var Youtube = require('youtube-node');

var youtube = new Youtube();

youtube.setKey('AIzaSyCXNnoeEVyQq39OBD0SF3KOxU3uuG54doU');

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

function replaceAll(str, target, replacement) {
  return str.split(target).join(replacement);
}

/* GET home page. */
router.get('/', function(req, res) {
  youtube.search('famosas desnudas', 2, function(err, data){
    var videos = data.items;

    for (var i = videos.length - 1; i >= 0; i--) {
      videos[i].snippet.slug = slug(videos[i].snippet.title);
    }

    res.render('list', {vids: videos});
  });
});

router.get('/:keyword', function(req, res) {
  if (req.params.keyword.indexOf(' ') > 0) {
    var keywordSlug = slug(req.params.keyword);
    Keywords.insert({keyword: req.params.keyword, slug: keywordSlug});
    res.redirect(keywordSlug);
  } else {
    var searchTerm = replaceAll(req.params.keyword, '-', ' ');

    youtube.search(searchTerm, 2, function(err, data){
      if (err) {
        return;
      }

      var videos = data.items;

      for (var i = videos.length - 1; i >= 0; i--) {
        videos[i].snippet.slug = slug(videos[i].snippet.title);
      }

      res.render('list', {vids: videos, title: req.params.keyword});
    });
  }
});

router.get('/:slug/:id', function(req, res) {
  youtube.getById(req.params.id, function(err, data) {
    var vid = data.items[0];
    console.log(vid);
    res.render('view', {vid: vid, title: vid.snippet.title});
  });
});

module.exports = router;
