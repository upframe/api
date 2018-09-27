const express = require('express')
const router = express.Router()
const db = require('../services/database.js')

let app, services;

router.get('/', (req, res) => {
  services.mentor.get(req, res)
  let sql = 'SELECT name, role, company, location, tags, bio, freeSlots, profilePic, twitter, linkedin, github, facebook, dribbble, favoritePlaces FROM users WHERE keycode = ?'
  db.query(sql, req.query.keycode, (err, result) => {
    res.status(200).send(result)
  })
})

router.get('/random', (req, res) => {
  let sql = 'SELECT name, role, company, bio, tags, keycode, profilePic FROM users'
  db.query(sql, (err, result) => {
    console.log(result)
    res.status(200).send(shuffle(result))
  })
})

router.get('/verify', (req, res) => {
  res.status(200).send('Tudo correu bem')
})

router.post('/meetup', (req, res) => {
  res.status(200).send('Tudo correu bem')
})

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = router
module.exports.init = (appRef) => {
  app = appRef
  services = app.get('services')
  app.get('logger').verbose('Mentor router loaded')
}