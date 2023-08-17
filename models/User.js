const mongoose = require('mongoose')

const User = mongoose.model(
  'User',
  new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    emailVerified: { type: Boolean, required: true },
  })
)

module.exports = User
