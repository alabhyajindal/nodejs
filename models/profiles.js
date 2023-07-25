const { Pool, Client } = require('pg')

module.exports.getGeoJSON = async (username) => {
  const pool = new Pool({
    connectionString: process.env.CONNECTION_STRING,
  })

  const result = await pool.query(
    `SELECT * FROM profiles WHERE username LIKE '%${username}%';`
  )
  const data = result.rows[0]
  if (data?.geojson) {
    return JSON.stringify(data?.geojson)
  } else {
    return 'null'
  }
}

module.exports.upsertUser = async () => {
  const pool = new Pool({
    connectionString: process.env.CONNECTION_STRING,
  })

  const text =
    'INSERT INTO profiles(username, geojson) VALUES($1, $2) RETURNING *'
  const values = [
    'alabhya',
    {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [91.753943, 26.180598],
          },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [77.5913, 12.97912],
          },
        },
      ],
    },
  ]

  const res = await pool.query(text, values)
  console.log(res.rows[0])
}
