const express = require('express')
const router = express.Router()

function setRouters(app) {
  let services = app.get('services')
  
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

  return router
}

module.exports.init = (app) => {
  try {
    let router = setRouters(app)
    app.get('logger').verbose('Mentor router loaded')
    return router
  } catch(err) {
    app.get('logger').error('Could not load mentor router')
  }
}