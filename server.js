const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const querystring = require('querystring');
const app = express();
const session = require('express-session');
const cookieParser = require('cookie-parser');
const axios = require('axios');
require('dotenv').config();

//const redirect_uri = 'http://localhost:3000/callback';
const redirect_uri = 'https://playlist-gen.herokuapp.com/callback';
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: {}
}))

app.set('view engine', 'ejs')

app.get('/', function (req, res) {
  res.render('pages/index');
})
app.get('/home', function (req, res) {
  res.render('pages/home', { artistInfo: [] });
})

app.post('/addToList', async function(req, res){
  let access_token = req.cookies.access_token
  let artistName = req.body.artistName
  let artistInfo = []

  if(req.cookies.artistInfo){
    artistInfo = req.cookies.artistInfo
  }

  await search(artistName, access_token).then(function(result) {
    let artist = result.data.artists.items[0]
    let obj = {
      img: artist.images[0].url,
      name: artist.name,
      artistId: artist.id
    }
    artistInfo.push(obj)
    res.cookie('artistInfo', artistInfo)
    res.render('pages/home', { artistInfo: artistInfo });
  })
})

app.post('/getRecommendations', async function (req, res) {
  let playlistLength = req.body.playlistLength
  let artistQuery = ""
  
  let access_token = req.cookies.access_token
  let artistInfo = req.cookies.artistInfo

  for(i=0; i < artistInfo.length; i++){
    artistQuery += artistInfo[i].artistId + ","
  }
  
  artistQuery = artistQuery.slice(0, -1);

  await getRecommendations(artistQuery, playlistLength, access_token).then(function(result) {
    let tracks = []
    let trackURIs = []
    
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
      res.cookie('URIs', trackURIs)
    }
    res.render('pages/playlist', { tracks: tracks });
  })

})

app.post('/makePlaylist', async function (req, res) {
  let playlistName = req.body.playlistName
  let userId = ""
  let playlistId = ""
  let access_token = req.cookies.access_token
  let trackURIs = req.cookies.URIs

  await getUser(access_token).then(function(result) {
    userId = result.data.id
  })

  await makePlaylist(userId, playlistName, access_token).then(function(result) {
    playlistId = result.data.id
  })

  await addToPlaylist(userId, playlistId, trackURIs, access_token).then(function(result) {
    res.clearCookie("URIs");
    res.clearCookie("artistInfo");
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
    res.cookie('access_token', body.access_token)
    //let uri = 'http://localhost:3000/home'
    let uri = 'https://playlist-gen.herokuapp.com/home'
    res.redirect(uri)
  })
})

//FUNCTIONS
async function getRecommendations(artistQuery, playlistLength, access_token) {
  return await axios({
      url: `https://api.spotify.com/v1/recommendations?seed_artists=${artistQuery}&limit=${playlistLength}`,
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + access_token
      }
  });
}

async function getUser(access_token) {
  return await axios({
      url: `https://api.spotify.com/v1/me`,
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + access_token
      }
  });
}

async function makePlaylist(userId, playlistName, access_token) {
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

async function addToPlaylist(userId, playlistId, trackURIs, access_token) {
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

async function search(artistName, access_token) {
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
  console.log('Our app is running on port ' + port);
});