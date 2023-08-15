const fs = require('fs')
const express = require('express')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const session = require('express-session')
const bcrypt = require('bcryptjs')
const helmet = require('helmet')
const User = require('./models/User')

const app = express()

mongoose.connect(
  `mongodb+srv://alabhya10:${process.env.MONGODB_PASSWORD}@cluster0.pqhtd9a.mongodb.net/?retryWrites=true&w=majority`
)

app.use(helmet())
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

app.set('view engine', 'pug')

const htmlFile = fs.readFileSync(`${__dirname}/index.html`, 'utf-8')
let jsFile = fs.readFileSync(`${__dirname}/script.js`, 'utf-8')
jsFile = `mapboxgl.accessToken = '${process.env.MAPBOX_TOKEN}'\n` + jsFile

app.route('/').get((req, res) => {
  res.render('home', { uri: process.env.URI })
})

app.route('/welcome').get((req, res) => {
  const email = req.query.email
  res.render('welcome', { uri: process.env.URI, email })
})

function loginRequired(req, res, next) {
  if (!req.user) {
    return res.redirect('/login')
  }
  next()
}

app.route('/dashboard').get(loginRequired, async (req, res) => {
  res.render('dashboard')
})

app
  .route('/register')
  .get((req, res) => {
    res.render('register')
  })
  .post((req, res) => {
    bcrypt.genSalt(10, (err1, salt) => {
      bcrypt.hash(req.body.password, salt, (err2, hash) => {
        if (err1 || err2) {
          return res.render('register', {
            error: 'Something went wrong. Please try later.',
          })
        }
        const user = new User({ ...req.body, password: hash })
        user.save()
      })
    })
    res.redirect('/dashboard')
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
    bcrypt.compare(req.body.password, user.password, (err, response) => {
      if (response === false) {
        return res.render('login', { error: 'Incorrect email/password' })
      }
    })
    req.session.userId = user._id
    res.redirect('/dashboard')
  })

app.route('/logout').post((req, res) => {
  req.session.userId = null
  res.locals.user = null
  res.redirect('/')
})

module.exports = app
