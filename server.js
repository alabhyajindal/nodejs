const fs = require('fs')
const express = require('express')
const dotenv = require('dotenv')
const { Pool, Client } = require('pg')

dotenv.config()
const PORT = process.env.PORT

// pg
const connectionString = process.env.CONNECTION_STRING
async function getGeoJSON(username) {
  const pool = new Pool({
    connectionString,
  })

  const result = await pool.query(
    `SELECT * FROM test WHERE username LIKE '%${username}%';`
  )
  const data = result.rows[0]
  if (data?.geojson) {
    return JSON.stringify(data?.geojson)
  } else {
    return 'null'
  }
}
// pgend

const app = express()

// app.set('view engine', 'pug')
app.use(express.static('public'))

const htmlFile = fs.readFileSync(`${__dirname}/index.html`, 'utf-8')

let jsFile = fs.readFileSync(`${__dirname}/script.js`, 'utf-8')
jsFile = `mapboxgl.accessToken = '${process.env.MAPBOX_TOKEN}'\n` + jsFile

app.route('/').get((req, res) => {
  // res.status(200).render('base')
  res.status(200).send(`
  <script src="https://accounts.google.com/gsi/client" async></script>
  <div>
  <p>Get a personal travel log</p>
  <div id="g_id_onload"
  data-client_id="259494879046-t6ejuqrlbmgdlqotrkes0fgev4iak86e.apps.googleusercontent.com"
  data-context="signin"
  data-ux_mode="popup"
  data-login_uri="https://travel.up.railway.app/welcome"
  data-auto_prompt="false">
</div>

<div class="g_id_signin"
  data-type="standard"
  data-shape="rectangular"
  data-theme="outline"
  data-text="continue_with"
  data-size="large"
  data-logo_alignment="left">
</div>
</div>
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

app.listen(PORT, '0.0.0.0')
