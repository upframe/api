const router = require('express').Router()

function setRouters(app) {
  let services = app.get('services')

  router.post('/', services.auth.verifyToken, (req, res) => {
    services.meetup.create(req, res)
  })

  router.get('/', services.auth.verifyToken, (req, res) => {
    services.meetup.get(req, res)
  })

  router.get('/confirm', services.auth.verifyToken, services.auth.isMentor, (req, res) => {
    services.meetup.confirm(req, res)
  })

  router.get('/refuse', services.auth.verifyToken, services.auth.isMentor, (req, res) => {
    services.meetup.refuse(req, res)
  })

  return router
}

module.exports.init = (app) => {
  try {
    let router = setRouters(app)
    app.get('logger').verbose('Meetup router loaded')
    return router
  } catch(err) {
    app.get('logger').error('Could not load meetup router')
  }
}