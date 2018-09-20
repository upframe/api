const express = require('express')
const router = express.Router()
const db = require('../services/db.js')
const verifyToken = require('../services/token.js')

router.get('/', (req, res) => {
  res.status(200).send('Tudo correu bem')
})

router.get('/random', (req, res) => {
  res.status(200).send('Tudo correu bem')
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

module.exports = router;