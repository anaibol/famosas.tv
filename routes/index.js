var express = require('express');
var router = express.Router();
var youtube = require('youtube-feeds');

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
  youtube.feeds.videos({q: 'famosas desnudas'}, function(err, data){
    var videos = data.items;

    for (var i = videos.length - 1; i >= 0; i--) {
      videos[i].slug = slug(videos[i].title);
    }

    // youtube.feeds.related(videos[1].id, function(err, related){
    //   console.log(data.items)

      res.render('list', {vids: data.items});
    // });
  });
});

router.get('/:keyword', function(req, res) {
  if (req.params.keyword.indexOf(' ') > 0) {
    var keywordSlug = slug(req.params.keyword);
    Keywords.insert({keyword: req.params.keyword, slug: keywordSlug});
    res.redirect(keywordSlug);
  } else {
    var searchTerm = replaceAll(req.params.keyword, '-', ' ');

    youtube.feeds.videos({q: searchTerm}, function(err, data){
      if (err) {
        res.render('list', {title: req.params.keyword});
        return;
      }

      var videos = data.items;

      for (var i = videos.length - 1; i >= 0; i--) {
        videos[i].slug = slug(videos[i].title);
      }

      // youtube.feeds.related(videos[1].id, function(err, related){
      //   console.log(data.items)
        res.render('list', {vids: data.items, title: req.params.keyword});
      // });
    });
  }
});

router.get('/:slug/:id', function(req, res) {
  youtube.video(req.params.id, function(err, data){
    var video = data;

    // youtube.feeds.related(video.id, function(err, data){
    //   console.log(data.items)
      res.render('view', {vid: video, title: video.title});
    // });
  });
});

module.exports = router;
