const fs = require('fs')
const express = require('express')
const { OAuth2Client } = require('google-auth-library')
const {
  getGeoJSON,
  addUser,
  checkUsername,
  submitUsername,
  getUsername,
} = require('./models/profiles')

const app = express()
const client = new OAuth2Client()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static('public'))

app.set('view engine', 'pug')

const htmlFile = fs.readFileSync(`${__dirname}/index.html`, 'utf-8')
let jsFile = fs.readFileSync(`${__dirname}/script.js`, 'utf-8')
jsFile = `mapboxgl.accessToken = '${process.env.MAPBOX_TOKEN}'\n` + jsFile

async function verify(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.OAUTH_CLIENT_ID,
  })
  const payload = ticket.getPayload()
  addUser([payload.email, payload.name, null, null])
  return payload
}

app.route('/').get((req, res) => {
  res.render('home', { uri: process.env.URI })
})

app.route('/redirect').post(async (req, res) => {
  const token = req.body.credential
  const userDetails = await verify(token)

  const email = userDetails.email
  const response = await getUsername(email)

  if (!response.username) {
    res.redirect('/welcome?email=' + encodeURIComponent(email))
  } else {
    res.redirect('/' + response.username)
  }
})

app.route('/welcome').get(async (req, res) => {
  const email = req.query.email
  res.render('welcome', { uri: process.env.URI, email })
})

app.route('/:username').get(async (req, res) => {
  const { username } = req.params
  if (username !== 'favicon') {
    const geoJSON = await getGeoJSON(username)
    const withGeoJSON = `\nconst geojson = ${geoJSON}\n` + jsFile
    const withScript = htmlFile.replace(
      '</body>',
      `<script type="module">${withGeoJSON}</script></body>`
    )
    res.status(200).send(withScript)
  } else {
    res.status(400).send('Error')
  }
})

app.route('/api/profiles/check').post(async (req, res) => {
  const checkRes = await checkUsername(req.body.username)
  if (checkRes.status === 'success') {
    res
      .status(200)
      .send({ status: 'success', data: { available: checkRes.available } })
  } else {
    res.status(500).send({ status: 'error', data: { available: false } })
  }
})

app.route('/api/profiles/submit').post(async (req, res) => {
  const checkRes = await submitUsername([
    req.body.username,
    {
      type: 'FeatureCollection',
      features: [],
    },
    req.body.email,
  ])
  if (checkRes.status === 'success') {
    res.status(201).send({ status: 'success' })
  } else {
    res.status(500).send({ status: 'error' })
  }
})

module.exports = app