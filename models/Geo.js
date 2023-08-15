const mongoose = require('mongoose')

const Geo = mongoose.model(
  'Geo',
  new mongoose.Schema({
    user_id: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    geo: { type: String, required: true },
  })
)

module.exports = Geo
