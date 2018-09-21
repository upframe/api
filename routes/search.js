const express = require('express')
const router = express.Router()
//const db = require('../services/db.js')             - enable when you start working
//const verifyToken = require('../services/token.js') - enable when you start working

router.get('/quick', (req, res) => {
  res.status(200).send('Tudo correu bem')
})

router.get('/full', (req, res) => {
  res.status(200).send('Tudo correu bem')
})

router.get('/tags', (req, res) => {
  let tags = ['User Research', 'Event Marketing', 'Communities', 'Business Models', 'Ideation', 'B2B', 'B2C']
  res.status(200).send(tags)
})

module.exports = router;