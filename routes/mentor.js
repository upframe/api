const express = require('express')
const router = express.Router()

let app, services;

router.get('/verify', (req, res) => {
  services.mentor.verify(req, res)
})

router.post('/meetup', (req, res) => {
  res.status(200).send('Tudo correu bem')
})

router.get('/random', (req, res) => {
  services.mentor.getRandom(req, res)
})

router.get('/:keycode', (req, res) => {
  services.mentor.get(req, res)
})

module.exports = router
module.exports.init = (appRef) => {
  app = appRef
  services = app.get('services')
  
  app.get('logger').verbose('Mentor router loaded')
}