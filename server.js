// SETUP
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const querystring = require('querystring');
const app = express();

const redirect_uri = 'http://localhost:3000/callback';
const client_id = 'a3e402af8edc47f09f0d2092cd2697a8';
const client_secret = '94d05387e51b4523bbd4ad4691136c25';
let access_token = "";
let trackURIs = [];

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')


//ROUTES
app.get('/', function (req, res) {
  res.render('pages/index');
})
app.get('/home', function (req, res) {
  res.render('pages/home');
})


app.get('/getrec', function (req, res) {
  //default limt 20
  //5 seeds
  //tracks
  //artst
  //genre
  
  let artist1 = "2o8lOQRjzsSC8UdbNN88HN"//mansions
  let artist2 = "2h93pZq0e7k5yf4dywlkpM"//frank Ocean
  let artist3 = "73sIBHcqh3Z3NyqHKZ7FOL"//Gambino
  let artist4 = "6l3HvQ5sa6mXTsMTB19rO5"//Jcole

  let genre ="r-n-b"//{
    //"genres" : [ "acoustic", "afrobeat", "alt-rock", "alternative", "ambient", "anime", "black-metal", "bluegrass", "blues", "bossanova", "brazil", "breakbeat", "british", "cantopop", "chicago-house", "children", "chill", "classical", "club", "comedy", "country", "dance", "dancehall", "death-metal", "deep-house", "detroit-techno", "disco", "disney", "drum-and-bass", "dub", "dubstep", "edm", "electro", "electronic", "emo", "folk", "forro", "french", "funk", "garage", "german", "gospel", "goth", "grindcore", "groove", "grunge", "guitar", "happy", "hard-rock", "hardcore", "hardstyle", "heavy-metal", "hip-hop", "holidays", "honky-tonk", "house", "idm", "indian", "indie", "indie-pop", "industrial", "iranian", "j-dance", "j-idol", "j-pop", "j-rock", "jazz", "k-pop", "kids", "latin", "latino", "malay", "mandopop", "metal", "metal-misc", "metalcore", "minimal-techno", "movies", "mpb", "new-age", "new-release", "opera", "pagode", "party", "philippines-opm", "piano", "pop", "pop-film", "post-dubstep", "power-pop", "progressive-house", "psych-rock", "punk", "punk-rock", "r-n-b", "rainy-day", "reggae", "reggaeton", "road-trip", "rock", "rock-n-roll", "rockabilly", "romance", "sad", "salsa", "samba", "sertanejo", "show-tunes", "singer-songwriter", "ska", "sleep", "songwriter", "soul", "soundtracks", "spanish", "study", "summer", "swedish", "synth-pop", "tango", "techno", "trance", "trip-hop", "turkish", "work-out", "world-music" ]
  //}

  let Options = {
    url: `https://api.spotify.com/v1/recommendations?seed_genres=${genre}&seed_artists=${artist1},${artist2},${artist3},${artist4}`,
    headers: {
      'Authorization': 'Bearer ' + access_token
    }
  }
  request.get(Options, function (err, response, body) {
    let message = JSON.parse(body)
    console.log(message)
    let tracks = []
    for(i = 0; i < message.tracks.length; i++){
      let track = message.tracks[i]
      let obj = {
        number: i+1,
        name: track.name,
        artist: track.artists[0].name
      }
      tracks.push(obj)
      trackURIs.push(track.uri)
      
    }
    //console.log(trackURIs)
    res.render('pages/playlist', {
      tracks: tracks
    });
  });
})

app.post('/makePlaylist', function (req, res) {
  let playlistName = req.body.playlistName;
  console.log(playlistName)
  let Options = {
    url: 'https://api.spotify.com/v1/me',
    headers: {
      'Authorization': 'Bearer ' + access_token
    }
  }
  request.get(Options, function (err, response, body) {
    let message = JSON.parse(body)
    let userId = message.id

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
      console.log(body)
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
        console.log(body)
        res.render('pages/home');
      });
    });
  });
})

// AUTHENTICATION
// Request user permission
app.get('/login', function(req, res) {
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: 'user-read-private user-read-email playlist-modify-public',
      redirect_uri
    }))
})

//When user grants permission we receive a code, exchange this for an access token
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