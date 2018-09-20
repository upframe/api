const express = require('express')
const router = express.Router()
const db = require('../services/db.js')

router.get('/', (req, res) => {
  let sql = 'SELECT * FROM users'
  db.query(sql, (err, result) => {  
    console.log(result)
    res.status(200).send('Tudo bem')
  })
})

router.get('/random', (req, res) => {
  let sql = 'SELECT name, role, company, bio, tags, keycode, profilePic FROM users'
  db.query(sql, (err, result) => {
    console.log(result)
    res.status(200).send(shuffle(result))
  })
})

router.get('/info', (req, res) => {
  res.status(200).send('Tudo correu bem')
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

module.exports = router;