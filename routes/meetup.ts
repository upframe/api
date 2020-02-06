import * as express from 'express'

import { meetup, auth, logger } from '../services'

const router: express.Router = express.Router()

function setRouters(): void {
  router.get('/', auth.verifyToken, (req, res) => {
    meetup.get(req, res)
  })

  router.post('/', (req, res) => {
    meetup.create(req, res)
  })

  router.get('/confirm', auth.verifyToken, auth.isMentor, (req, res) => {
    meetup.confirm(req, res)
  })

  router.get('/refuse', auth.verifyToken, auth.isMentor, (req, res) => {
    meetup.refuse(req, res)
  })
}

export function init(): express.Router {
  try {
    setRouters()
    logger.verbose('Meetup router loaded')
  } catch (err) {
    logger.error('Could not load meetup router')
  }

  return router
}
