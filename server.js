const fs = require('fs')
const dotenv = require('dotenv')
const express = require('express')
const { OAuth2Client } = require('google-auth-library')
const {
  getGeoJSON,
  addUser,
  checkUsername,
  submitUsername,
  getUsername,
} = require('./models/profiles')

dotenv.config()
const app = express()
const client = new OAuth2Client()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static('public'))

app.set('view engine', 'pug')

const htmlFile = fs.readFileSync(`${__dirname}/index.html`, 'utf-8')
let jsFile = fs.readFileSync(`${__dirname}/script.js`, 'utf-8')
jsFile = `mapboxgl.accessToken = '${process.env.MAPBOX_TOKEN}'\n` + jsFile

app.route('/').get((req, res) => {
  res.render('home', { uri: process.env.URI })
})

async function verify(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.OAUTH_CLIENT_ID,
  })
  const payload = ticket.getPayload()
  addUser([payload.email, payload.name, null, null])
  return payload
}

app.route('/redirect').post(async (req, res) => {
  const token = req.body.credential
  const userDetails = await verify(token)
  const response = await getUsername(userDetails.email)
  if (!response.username) {
    res.redirect('/welcome')
  } else {
    res.redirect(`/${response.username}`)
  }
})

app.route('/welcome').get(async (req, res) => {
  const email = ''
  const requestURI = process.env.URI
  res.status(200).send(`
  <div>
    <h1>Choose a username</h1>
    <input />
    <button id='check'>Check</button>
    <div id='message'>
      <p></p>
      <button id='submit' style='display:none'>Submit</button>
    </div>
  </div>
  <script>
    const check = document.querySelector('#check')
    const input = document.querySelector('input')
    const message = document.querySelector('#message')
    const p = document.querySelector('p')
    const submit = document.querySelector('#submit')

    async function checkUsername() {
      const res = await fetch('${requestURI}/api/profiles/check', {
      method: 'POST', 
      body: JSON.stringify({username: input.value}),
      headers: {
        'Content-type': 'application/json',
      },
    })
      const body = await res.json()
      return body
    }

    function displayMessage(isAvailable) {
      if (isAvailable) {
        p.textContent = 'Username is available'
        submit.style.display = 'block'
      } else {
        p.textContent = 'Username is not available'
        submit.style.display = 'none'
      }
    }

    async function submitUsername() {
    const res = await fetch('${requestURI}/api/profiles/submit', {
      method: 'POST', 
      body: JSON.stringify({
        email: '${email}',
        username: input.value
      }),
      headers: {
        'Content-type': 'application/json',
      },
    })
      const body = await res.json()
      return body
    }

    check.addEventListener('click', async (e) => {
      const res = await checkUsername()
      displayMessage(res.data.available)
    })

    submit.addEventListener('click', async (e) => {
      const res = await submitUsername()
      if (res.status === 'success') {
        window.location.href = '${requestURI}' + '/' + input.value
      }
    })
  </script>
  `)
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

app.listen(process.env.PORT, '0.0.0.0')
