const express = require('express')
const router = express.Router()
const verifyToken = require('../services/token.js')

let app, services, logger;

router.get('/me', verifyToken, (req, res) => {
  services.user.get(req, res)
})

router.patch('/me', verifyToken, (req, res) => {
  services.user.update(req,res)
})

router.post('/image', verifyToken, (req, res) => {
  res.status(200).send('Tudo correu bem')
})

module.exports = router
module.exports.init = (appRef) => {
  app = appRef
  services = app.get('services')
  logger = app.get('logger')

  logger.verbose('Profile router loaded')
}