const express = require('express')
const router = express.Router()
const db = require('../services/db.js')
const verifyToken = require('../services/token.js')

router.get('/quick', (req, res) => {
  res.status(200).send('Tudo correu bem')
})

router.get('/full', (req, res) => {
  res.status(200).send('Tudo correu bem')
})

router.get('/tags', (req, res) => {
  res.status(200).send('Tudo correu bem')
})

module.exports = router;