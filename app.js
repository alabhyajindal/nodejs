const express = require('express')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const session = require('express-session')
const bcrypt = require('bcryptjs')
const helmet = require('helmet')
const morgan = require('morgan')
const postmark = require('postmark')
const User = require('./models/User')
const Geo = require('./models/Geo')

const app = express()

mongoose.connect(
  `mongodb+srv://alabhya10:${process.env.MONGODB_PASSWORD}@cluster0.pqhtd9a.mongodb.net/?retryWrites=true&w=majority`
)

app.use(morgan('dev'))
// app.use(helmet()) // getting issues with Mapbox because of this
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static('public'))
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // secure: true, // enable in prod
    },
    maxAge: 60 * 30 * 100,
  })
)

app.use(async (req, res, next) => {
  if (!(req.session && req.session.userId)) {
    return next()
  }

  const user = await User.findById(req.session.userId)
  if (!user) {
    return next()
  }

  user.password = undefined
  req.user = user
  res.locals.user = user

  next()
})

function loginRequired(req, res, next) {
  if (!req.user) {
    return res.redirect('/login')
  }
  next()
}

async function usernameChosen(req, res, next) {
  const [geo] = await Geo.find({ user_id: req.user._id })
  if (geo?.username) {
    return res.redirect(`/${geo.username}`)
  }
  next()
}

app.set('view engine', 'pug')

// Define a middleware to handle favicon requests
app.use('/favicon.ico', (req, res) => {
  // Send an empty 204 No Content response for favicon requests
  res.status(204).end()
})

app.route('/').get((req, res) => {
  res.render('home', { uri: process.env.URI })
})

app
  .route('/welcome')
  .get(loginRequired, usernameChosen, (req, res) => {
    res.render('welcome')
  })
  .post(loginRequired, usernameChosen, async (req, res) => {
    const find = await Geo.find({ username: req.body.username })
    if (find.length === 0) {
      // dynamic routing needs to be added here
      const geo = new Geo({
        user_id: req.user._id,
        username: req.body.username,
        geo: '{"type":"FeatureCollection","features":[]}',
      })
      await geo.save()
      return res.redirect(`/${req.body.username}`)
    } else {
      return res.render('welcome', { error: 'Username NOT available' })
    }
  })

app
  .route('/register')
  .get((req, res) => {
    res.render('register')
  })
  .post((req, res) => {
    bcrypt.genSalt(10, (err1, salt) => {
      bcrypt.hash(req.body.password, salt, async (err2, hash) => {
        if (err1 || err2) {
          return res.render('register', {
            error: 'Something went wrong. Please try later.',
          })
        }
        const user = new User({
          ...req.body,
          password: hash,
          emailVerified: false,
        })
        await user.save()
        const client = new postmark.ServerClient(
          '20942814-c5a1-4300-aa53-fb99e98f0f3c'
        )
        client.sendEmail({
          From: 'aj@alabhyajindal.com',
          To: 'auratice@alabhyajindal.com',
          Subject: 'Verify your email for Travel Log',
          TextBody:
            'Hello from Travel Log! Verify your email address by clicking this link: https://www.google.com',
        })
      })
    })
    res
      .status(200)
      .send(
        "<script>alert('Check your email for a confirmation mail')</script>"
      )
  })

app
  .route('/login')
  .get((req, res) => {
    res.render('login')
  })
  .post(async (req, res) => {
    const user = await User.findOne({ email: req.body.email })
    if (!user) {
      return res.render('login', { error: 'Incorrect email/password' })
    }
    return bcrypt.compare(req.body.password, user.password, (err, response) => {
      if (response === false) {
        return res.render('login', { error: 'Incorrect email/password' })
      } else {
        req.session.userId = user._id
        return res.redirect('/welcome')
      }
    })
  })

app.route('/logout').post((req, res) => {
  req.session.userId = null
  res.locals.user = null
  res.redirect('/')
})

app.route('/404').get((req, res) => {
  res.status(404).send('404 - Page not found')
})

app.route('/save').post(async (req, res) => {
  const updateRes = await Geo.updateOne(
    { username: req.body.username },
    { geo: JSON.stringify(req.body.geojson) }
  )
  console.log(updateRes)
  res.status(200).send({ status: 'success' })
})

app.route('/:username').get(async (req, res) => {
  const [geo] = await Geo.find({ username: req.params.username })
  const options = {
    geojson: geo.geo,
    username: req.params.username,
    isOwner:
      req.user?._id &&
      req.user._id.equals(new mongoose.Types.ObjectId(geo.user_id)),
    isOwner: true,
  }

  res.render('username', options)
})

module.exports = app
