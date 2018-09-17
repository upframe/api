const express = require('express')
const router = express.Router()

router.post('/login', (req, res) => {
  res.status(200).send('Tudo correu bem')
})

router.post('/register', (req, res) => {
  res.status(200).send('Tudo correu bem')
})

module.exports = router;