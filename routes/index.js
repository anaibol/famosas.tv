var express = require('express');
var router = express.Router();
// var youtube = require('youtube-feeds');

var Youtube = require('youtube-node');

var youtube = new Youtube();

youtube.setKey('AIzaSyCXNnoeEVyQq39OBD0SF3KOxU3uuG54doU');

youtube.addParam('safeSearch', 'none');
youtube.addParam('type', 'video');
youtube.addParam('videoEmbeddable', 'true');

var db = require('monk')('localhost/famosas');
var Keywords = db.get('keywords');

var videosPerPage = 20;

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

function searchVideos(searchTerm, num, cb) {
  youtube.search(searchTerm, num, function(err, data){
    if (err) {
      console.log(err);
      return;
    }

    var videos = data.items;
    var meta = data.pageInfo;

    for (var i = videos.length - 1; i >= 0; i--) {
      videos[i].snippet.slug = slug(videos[i].snippet.title);
    }

    cb(videos, meta);
  });
}

function getRelatedKeywords(keyword, cb) {
  Keywords.find({keyword: {$regex : '.*' + keyword + '.*'}}, function (err, keywords) {
    if (err) {
      console.log(err);
      return;
    }

    var relatedKeywords = [];

    keywords.forEach(function(keyword) {
      relatedKeywords.push(keyword.keyword);
    })

    cb(relatedKeywords);
  });
}

function getRelatedVideos(id, num, cb) {
  youtube.related(id, num, function(err, data) {
    if (err) {
      console.log(err);
      return;
    }

    var related = data.items;

    related.forEach(function(vid) {
      vid.snippet.slug = slug(vid.snippet.title);
    })

    cb(related);
  });
}

/* GET home page. */
router.get('/', function(req, res) {
  var keyword = 'famosas desnudas';
  searchVideos(keyword, videosPerPage, function(videos, meta){
    getRelatedKeywords(keyword, function(relatedKeywords) {
      res.render('list', {vids: videos, title: keyword, meta: meta, relatedKeywords: relatedKeywords});
    });
  });
});

router.get('/:keyword', function(req, res) {
  if (req.params.keyword.indexOf(' ') > 0) {
    var keywordSlug = slug(req.params.keyword);

    Keywords.insert({keyword: req.params.keyword, slug: keywordSlug});
    res.redirect(keywordSlug);
  } else {
    var searchTerm = replaceAll(req.params.keyword, '-', ' ');

    searchVideos(searchTerm, videosPerPage, function(vids, meta) {
      vids.forEach(function(vid) {
        vid.snippet.slug = slug(vid.snippet.title);
      })

      getRelatedKeywords(searchTerm, function(relatedKeywords) {
        res.render('list', {vids: vids, title: req.params.keyword, meta: meta, relatedKeywords: relatedKeywords});
      });
    })
  }
});

router.get('/:slug/:id', function(req, res) {
  youtube.getById(req.params.id, function(err, data) {
    var vid = data.items[0];
    vid.snippet.slug = slug(vid.snippet.title);

    if (req.params.slug !== vid.snippet.slug) {
      res.redirect('/' + vid.snippet.slug + '/' + vid.id);

    } else {
      getRelatedVideos(req.params.id, 6, function(relatedVideos) {
        vid.relatedVideos = relatedVideos;

        getRelatedKeywords(vid.snippet.slug, function(relatedKeywords) {
          res.render('view', {vid: vid, title: vid.snippet.title, relatedKeywords: relatedKeywords});
        });

      });
    }
  });
});

module.exports = router;
