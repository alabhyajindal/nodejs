const dotenv = require('dotenv')
dotenv.config()

const app = require('./app')

app.listen(process.env.PORT, '0.0.0.0', () => {
  console.log(`Listening on ${process.env.URI}`)
})
