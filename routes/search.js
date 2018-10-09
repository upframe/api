const router = require('express').Router()

let app, services, logger;

router.get('/quick', (req, res) => {
  services.search.quick(req, res)
})

router.get('/full', (req, res) => {
  services.search.full(req, res)
})

router.get('/tags', (req, res) => {
  services.search.tags(req, res)
})

module.exports = router;
module.exports.init = (appRef) => {
  app = appRef
  services = app.get('services')
  logger = app.get('logger')

  logger.verbose('Search router loaded')
};