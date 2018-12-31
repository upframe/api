import * as express from 'express'

import { Services } from '../service'

const router: express.Router = express.Router()

function setRouters(app: express.Application): void {
  const services: Services = app.get('services')

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
}

export function init(app: express.Application): express.Router {
  try {
    setRouters(app)
    app.get('logger').verbose('Meetup router loaded')
  } catch (err) {
    app.get('logger').error('Could not load meetup router')
  }

  return router
}
