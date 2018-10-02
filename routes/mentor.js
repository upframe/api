const express = require('express')
const router = express.Router()
const db = require('../services/database.js')

let app, services;

router.get('/:keycode', (req, res) => {
  services.mentor.get(req, res)
})

router.get('/verify', (req, res) => {
  res.status(200).send('Tudo correu bem')
})

router.post('/meetup', (req, res) => {
  res.status(200).send('Tudo correu bem')
})

module.exports = router
module.exports.init = (appRef) => {
  app = appRef
  services = app.get('services')
  
  app.get('logger').verbose('Mentor router loaded')
}