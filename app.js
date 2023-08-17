const express = require('express')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const session = require('express-session')
const bcrypt = require('bcryptjs')
const helmet = require('helmet')
const morgan = require('morgan')
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
  const geo = await Geo.find({ user_id: req.user._id })
  if (geo.length === 1) {
    return res.redirect(`/${geo.username}`)
  }
  next()
}

app.set('view engine', 'pug')

app.route('/').get((req, res) => {
  res.render('home', { uri: process.env.URI })
})

app
  .route('/welcome')
  .get(loginRequired, usernameChosen, (req, res) => {
    res.render('welcome')
  })
  .post(async (req, res) => {
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
        const user = new User({ ...req.body, password: hash })
        await user.save()
      })
    })
    res.redirect('/')
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
        res.redirect('/welcome')
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

app.route('/:username').get(async (req, res) => {
  const geo = await Geo.find({ username: req.params.username })
  console.log(geo)
  if (geo[0]?.geo) {
    res.render('username', { geojson: geo[0].geo })
  } else {
    res.redirect('/404')
  }
})

module.exports = app
