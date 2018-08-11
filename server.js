const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const querystring = require('querystring');
const app = express();
const axios = require('axios');
require('dotenv').config();

//const redirect_uri = 'http://localhost:3000/callback';
const redirect_uri = 'https://boiling-dusk-55361.herokuapp.com/callback';
//const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_id = "a3e402af8edc47f09f0d2092cd2697a8";
//const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const client_secret = "94d05387e51b4523bbd4ad4691136c25";
const port = process.env.PORT || 3000;

let access_token = ""
let trackURIs = []
let artistInfo = []

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')

app.get('/', function (req, res) {
  res.render('pages/index');
})
app.get('/home', function (req, res) {
  res.render('pages/home', { artistInfo: artistInfo });
})

app.post('/addToList', async function(req, res){
  let artistName = req.body.artistName

  await search(artistName).then(function(result) {
    let artist = result.data.artists.items[0]
    console.log(result.data.artists.items[0])
    let obj = {
      img: artist.images[0].url,
      name: artist.name,
      artistId: artist.id
    }
    console.log(obj)
    artistInfo.push(obj)
    res.render('pages/home', { artistInfo: artistInfo });
  })
})

app.post('/getRecommendations', async function (req, res) {
  let playlistLength = req.body.playlistLength
  let artistQuery = ""

  for(i=0; i < artistInfo.length; i++){
    artistQuery += artistInfo[i].artistId + ","
  }
  
  artistQuery = artistQuery.slice(0, -1);

  await getRecommendations(artistQuery, playlistLength).then(function(result) {
    let tracks = []
    
    for(i = 0; i < result.data.tracks.length; i++){
      let track = result.data.tracks[i]
      let obj = {
        number: i+1,
        name: track.name,
        artist: track.artists[0].name,
        duration: toMins(track.duration_ms)
      }
      tracks.push(obj)
      trackURIs.push(track.uri)
    }
    res.render('pages/playlist', { tracks: tracks });
  })

})

app.post('/makePlaylist', async function (req, res) {
  let playlistName = req.body.playlistName
  let userId = ""
  let playlistId = ""

  await getUser().then(function(result) {
    userId = result.data.id
  })

  await makePlaylist(userId, playlistName).then(function(result) {
    playlistId = result.data.id
  })

  await addToPlaylist(userId, playlistId, trackURIs).then(function(result) {
    res.render('pages/done')
  })

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
    //let uri = 'http://localhost:3000/home'
    let uri = 'https://boiling-dusk-55361.herokuapp.com/home'
    res.redirect(uri)
  })
})

//FUNCTIONS
async function getRecommendations(artistQuery, playlistLength) {
  return await axios({
      url: `https://api.spotify.com/v1/recommendations?seed_artists=${artistQuery}&limit=${playlistLength}`,
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + access_token
      }
  });
}

async function getUser() {
  return await axios({
      url: `https://api.spotify.com/v1/me`,
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + access_token
      }
  });
}

async function makePlaylist(userId, playlistName) {
  return await axios({
      url: `https://api.spotify.com/v1/users/${userId}/playlists`,
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + access_token,
        'Content-Type': 'application/json'
      },
      data: {
        'name': playlistName
      }
  });
}

async function addToPlaylist(userId, playlistId, trackURIs) {
  return await axios({
      url: `https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks`,
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + access_token,
        'Content-Type': 'application/json'
      },
      data: {
        uris: trackURIs
      }
  });
}

async function search(artistName) {
  return await axios({
      url: `https://api.spotify.com/v1/search?q=${artistName}&type=artist&limit=1`,
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + access_token
      }
  });
}

function toMins(millis) {
  var minutes = Math.floor(millis / 60000);
  var seconds = ((millis % 60000) / 1000).toFixed(0);
  return (seconds == 60 ? (minutes+1) + ":00" : minutes + ":" + (seconds < 10 ? "0" : "") + seconds);
}

app.listen(port, function() {
  console.log('Our app is running on http://localhost:' + port);
});

/*
  //let genre ="r-n-b"{
    //"genres" : [ "acoustic", "afrobeat", "alt-rock", "alternative", "ambient", "anime", "black-metal", "bluegrass", "blues", "bossanova", "brazil", "breakbeat", "british", "cantopop", "chicago-house", "children", "chill", "classical", "club", "comedy", "country", "dance", "dancehall", "death-metal", "deep-house", "detroit-techno", "disco", "disney", "drum-and-bass", "dub", "dubstep", "edm", "electro", "electronic", "emo", "folk", "forro", "french", "funk", "garage", "german", "gospel", "goth", "grindcore", "groove", "grunge", "guitar", "happy", "hard-rock", "hardcore", "hardstyle", "heavy-metal", "hip-hop", "holidays", "honky-tonk", "house", "idm", "indian", "indie", "indie-pop", "industrial", "iranian", "j-dance", "j-idol", "j-pop", "j-rock", "jazz", "k-pop", "kids", "latin", "latino", "malay", "mandopop", "metal", "metal-misc", "metalcore", "minimal-techno", "movies", "mpb", "new-age", "new-release", "opera", "pagode", "party", "philippines-opm", "piano", "pop", "pop-film", "post-dubstep", "power-pop", "progressive-house", "psych-rock", "punk", "punk-rock", "r-n-b", "rainy-day", "reggae", "reggaeton", "road-trip", "rock", "rock-n-roll", "rockabilly", "romance", "sad", "salsa", "samba", "sertanejo", "show-tunes", "singer-songwriter", "ska", "sleep", "songwriter", "soul", "soundtracks", "spanish", "study", "summer", "swedish", "synth-pop", "tango", "techno", "trance", "trip-hop", "turkish", "work-out", "world-music" ]
  //}
*/