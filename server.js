const dotenv = require('dotenv')
const app = require('./app')

dotenv.config()

app.listen(process.env.PORT, '0.0.0.0', () => {
  console.log(`Listening on ${process.env.URI}`)
})
