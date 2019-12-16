import * as express from 'express'

import { auth, logger } from '../services'

const router: express.Router = express.Router()

function setRouters(): void {
  router.post('/login', (req, res) => {
    auth.login(req, res)
  })

  router.get('/logout', (req, res) => {
    auth.logout(req, res)
  })

  router.post('/register', (req, res) => {
    auth.register(req, res)
  })

  router.post('/forgotmypassword', (req, res) => {
    auth.resetPassword(req, res)
  })

  router.post('/changemyemail', (req, res) => {
    auth.changeEmail(req, res)
  })

  router.get('/google', (req, res) => {
    auth.getGoogleUrl(req, res)
  })

  router.get('/oservices.authcode', (req, res) => {
    auth.receiveOauthCode(req, res)
  })

  router.delete('/delete', auth.verifyToken, auth.deleteAccount)
}

export function init(): express.Router {
  try {
    setRouters()
    logger.verbose('services.authentication router loaded')
  } catch (err) {
    logger.error('Could not load services.authentication router')
  }

  return router
}
