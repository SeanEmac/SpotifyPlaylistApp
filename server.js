const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const querystring = require('querystring');
const rp = require('request-promise');
const app = express();

const redirect_uri = 'http://localhost:3000/callback';
const client_id = process.env.SPOTIFY_CLIENT_ID
const client_secret = process.env.SPOTIFY_CLIENT_SECRET
let access_token = "";
let trackURIs = [];

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')

app.get('/', function (req, res) {
  res.render('pages/index');
})
app.get('/home', function (req, res) {
  res.render('pages/home');
})

app.post('/getRecommendations', function (req, res) {
  let playlistLength = req.body.playlistLength
  let artistName = req.body.artistName

  let Options = {
    url: `https://api.spotify.com/v1/search?q=${artistName}&type=artist&limit=1`,
    headers: {
      'Authorization': 'Bearer ' + access_token
    },
    json: true
  }
  request.get(Options, function (err, response, body) { //Search for Id
    if(err){console.log(err.message)}
    else{
      let artistId = body.artists.items[0].id
      let Options = {
        url: `https://api.spotify.com/v1/recommendations?seed_artists=${artistId}&limit=${playlistLength}`,
        headers: {
          'Authorization': 'Bearer ' + access_token
        },
        json: true
      }
      request.get(Options, function (err, response, body) {
        if(err){console.log(err.message)}
        else{
          let tracks = []
          for(i = 0; i < body.tracks.length; i++){
            let track = body.tracks[i]
            let obj = {
              number: i+1,
              name: track.name,
              artist: track.artists[0].name
            }
            tracks.push(obj)
            trackURIs.push(track.uri)
          }
          res.render('pages/playlist', {
            tracks: tracks
          });
        } 
      });
    }
  });
})

app.post('/makePlaylist', function (req, res) {
  let playlistName = req.body.playlistName;
  
  let Options = {
    url: 'https://api.spotify.com/v1/me',
    headers: {
      'Authorization': 'Bearer ' + access_token
    },
    json: true
  }
  request.get(Options, function (err, response, body) {
    if(err){console.log(err.message)}
    else{
      let userId = body.id

      let Options = {
        url: `https://api.spotify.com/v1/users/${userId}/playlists`,
        headers: {
          'Authorization': 'Bearer ' + access_token,
          'Content-Type': 'application/json'
        },
        body: {
          'name': playlistName
        },
        json: true
      }
      request.post(Options, function (err, response, body) {
        if(err){console.log(err.message)}
        else{
          let playlistId = body.id
          let Options = {
            url: `https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks`,
            headers: {
              'Authorization': 'Bearer ' + access_token,
              'Content-Type': 'application/json'
            },
            body: {
              uris: trackURIs
            },
            json: true
          }
          request.post(Options, function (err, response, body) {
            if(err){console.log(err.message)}
            else{
              res.render('pages/home');
            }
          });
        }
      });
    } 
  });
})

// AUTHENTICATION
// Standard Oauth 2 code + token
app.get('/login', function(req, res) {
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: 'user-read-private user-read-email playlist-modify-public',
      redirect_uri
    }))
})
app.get('/callback', function(req, res) {
  let code = req.query.code
  let authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: code,
      redirect_uri,
      grant_type: 'authorization_code'
    },
    headers: {
      'Authorization': 'Basic ' + (new Buffer(
        client_id + ':' + client_secret
      ).toString('base64'))
    },
    json: true
  }
  request.post(authOptions, function(error, response, body) {
    access_token = body.access_token
    let uri = 'http://localhost:3000/home'
    res.redirect(uri)
  })
})

app.listen(3000, function () {
  console.log('Running on localhost:3000')
})

/*
function getID(artistName){
  let Options = {
    url: `https://api.spotify.com/v1/search?q=${artistName}&type=artist&limit=1`,
    headers: {
      'Authorization': 'Bearer ' + access_token
    },
    json: true
  }
  rp(Options)
    .then(function (response) {
      return response.artists.items[0].id
    })
    .catch(function (err) {
      console.log(err.message)
    })
}
//let artist1 = "2o8lOQRjzsSC8UdbNN88HN"//mansions
  //let artist2 = "2h93pZq0e7k5yf4dywlkpM"//frank Ocean
  //let artist3 = "73sIBHcqh3Z3NyqHKZ7FOL"//Gambino
  //let artist4 = "6l3HvQ5sa6mXTsMTB19rO5"//Jcole

  //let genre ="r-n-b"{
    //"genres" : [ "acoustic", "afrobeat", "alt-rock", "alternative", "ambient", "anime", "black-metal", "bluegrass", "blues", "bossanova", "brazil", "breakbeat", "british", "cantopop", "chicago-house", "children", "chill", "classical", "club", "comedy", "country", "dance", "dancehall", "death-metal", "deep-house", "detroit-techno", "disco", "disney", "drum-and-bass", "dub", "dubstep", "edm", "electro", "electronic", "emo", "folk", "forro", "french", "funk", "garage", "german", "gospel", "goth", "grindcore", "groove", "grunge", "guitar", "happy", "hard-rock", "hardcore", "hardstyle", "heavy-metal", "hip-hop", "holidays", "honky-tonk", "house", "idm", "indian", "indie", "indie-pop", "industrial", "iranian", "j-dance", "j-idol", "j-pop", "j-rock", "jazz", "k-pop", "kids", "latin", "latino", "malay", "mandopop", "metal", "metal-misc", "metalcore", "minimal-techno", "movies", "mpb", "new-age", "new-release", "opera", "pagode", "party", "philippines-opm", "piano", "pop", "pop-film", "post-dubstep", "power-pop", "progressive-house", "psych-rock", "punk", "punk-rock", "r-n-b", "rainy-day", "reggae", "reggaeton", "road-trip", "rock", "rock-n-roll", "rockabilly", "romance", "sad", "salsa", "samba", "sertanejo", "show-tunes", "singer-songwriter", "ska", "sleep", "songwriter", "soul", "soundtracks", "spanish", "study", "summer", "swedish", "synth-pop", "tango", "techno", "trance", "trip-hop", "turkish", "work-out", "world-music" ]
  //}
*/