const fs = require('fs')
const express = require('express')
const dotenv = require('dotenv')
const { Pool, Client } = require('pg')

dotenv.config()

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

app.use(express.static('public'))

const htmlFile = fs.readFileSync(`${__dirname}/index.html`, 'utf-8')

let jsFile = fs.readFileSync(`${__dirname}/script.js`, 'utf-8')
jsFile = `mapboxgl.accessToken = '${process.env.MAPBOX_TOKEN}'\n` + jsFile

app.route('/').get((req, res) => {
  res.send('<h1>Welcome</h1>')
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
    res.status(400).send('fuck you')
  }
})

app.listen(`0.0.0.0:${PORT}`)
