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
  try {
    await pool.query(text, values)
  } catch (err) {
    console.error(err)
  }
}

module.exports.checkUsername = async (username) => {
  const pool = new Pool({
    connectionString: process.env.CONNECTION_STRING,
  })
  const text = 'SELECT * FROM profiles WHERE username = $1;'
  const values = [username]

  try {
    const res = await pool.query(text, values)
    if (res.rows.length === 0) {
      return { status: 'success', available: true }
    } else {
      return { status: 'success', available: false }
    }
  } catch (err) {
    console.error(err)
    return { status: 'error' }
  }
}
