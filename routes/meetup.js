const router = require('express').Router()

let app, services, logger;

function setRouters() {
  router.post('/', services.auth.verifyToken, (req, res) => {
    services.meetup.create(req, res)
  })

  router.get('/', services.auth.verifyToken, (req, res) => {
    services.meetup.get(req, res)
  })

  router.get('/confirm', services.auth.verifyToken, services.auth.isMentor, (req, res) => {
    services.meetup.confirm(req, res)
  })
}

module.exports.init = (appRef) => {
  app = appRef
  services = app.get('services')
  logger = app.get('logger')

  logger.verbose('Meetup router loaded')

  setRouters()
  return router
}