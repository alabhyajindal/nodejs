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

module.exports.addUser = async (values) => {
  const pool = new Pool({
    connectionString: process.env.CONNECTION_STRING,
  })
  const text = `INSERT INTO profiles(email, name, username, geojson) 
  VALUES($1, $2, $3, $4)
  ON CONFLICT (email) 
  DO NOTHING
  `
  const res = await pool.query(text, values)
  console.log(res.rows[0])
}
