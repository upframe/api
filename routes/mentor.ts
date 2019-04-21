import * as express from 'express'

import { Services } from '../service'
import { APIrequest } from '../types'

const router: express.Router = express.Router()

function setRouters(app: express.Application): void {
  const services: Services = app.get('services')

  router.get('/all', (req: APIrequest, res: express.Response) => {
    services.mentor.getAll(req, res)
  })

  router.get('/random', (req: APIrequest , res: express.Response) => {
    services.mentor.getRandom(req, res)
  })

  router.get('/slots', services.auth.verifyToken, services.auth.isMentor, (req: APIrequest , res: express.Response) => {
    services.mentor.getTimeSlots(req, res)
  })

  router.post('/slots',
    services.auth.verifyToken,
    services.auth.isMentor,
    (req: APIrequest , res: express.Response) => {
      services.mentor.updateTimeSlots(req, res)
    },
  )

  router.post('/request', (req: APIrequest, res: express.Response) => {
    services.mentor.request(req, res)
  })

  router.get('/verify', (req: APIrequest , res: express.Response) => {
    services.mentor.verify(req, res)
  })

  router.get('/:keycode', (req: APIrequest , res: express.Response) => {
    services.mentor.get(req, res)
  })
}

export function init(app: express.Application): express.Router {
  try {
    setRouters(app)
    app.get('logger').verbose('Mentor router loaded')
  } catch (err) {
    app.get('logger').error('Could not load mentor router')
  }

  return router
}
