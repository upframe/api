const express = require('express')
const router = express.Router()

let app, services;

function setRouters() {
  router.get('/random', (req, res) => {
    services.mentor.getRandom(req, res)
  })

  router.get('/slots', services.auth.verifyToken, services.auth.isMentor, (req, res) => {
    services.mentor.getTimeSlots(req, res)
  })

  router.post('/slots', services.auth.verifyToken, services.auth.isMentor, (req, res) => {
    services.mentor.updateTimeSlots(req, res)
  })
  
  router.get('/verify', (req, res) => {
    services.mentor.verify(req, res)
  })

  router.get('/:keycode', (req, res, next) => {
    services.mentor.get(req, res, next)
  })
}

module.exports = router
module.exports.init = (appRef) => {
  app = appRef
  services = app.get('services')
  
  setRouters()
  app.get('logger').verbose('Mentor router loaded')
  return router
}