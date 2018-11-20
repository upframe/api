const router = require('express').Router()

function setRouters(app) {
  let services = app.get('services')

  router.post('/login', (req, res) => {
    services.auth.login(req, res)  
  })
  
  router.post('/register', (req, res) => {
    services.auth.register(req, res)
  })
  
  router.post('/forgotmypassword', (req, res) => {
    services.auth.resetPassword(req, res)
  })
  
  
  router.post('/changemyemail', (req, res) => {
    services.auth.changeEmail(req, res)
  })

  return router
}

module.exports.init = (app) => {
  try {
    let router = setRouters(app)
    app.get('logger').verbose('Authentication router loaded')
    return router
  } catch(err) {
    app.get('logger').error('Could not load authentication router')
  }
};