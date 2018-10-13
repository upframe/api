const router = require('express').Router()

let app, services, logger;

function setRouters() {
  router.post('/', services.auth.verifyToken, (req, res) => {
    services.meetup.create(req, res)
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