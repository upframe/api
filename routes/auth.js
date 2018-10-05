const router = require('express').Router()

let app,
  logger,
  services;

router.post('/login', (req, res) => {
  services.auth.login(req, res)  
})

router.post('/register', (req, res) => {
  services.user.create(req, res)
})

router.post('/forgotmypassword', (req, res) => {
  services.auth.resetPassword(req, res)
})

module.exports = router;
module.exports.init = (appRef) => {
  app = appRef
  services = app.get('services')
  logger = app.get('logger')

  logger.verbose('Authentication router loaded')
};