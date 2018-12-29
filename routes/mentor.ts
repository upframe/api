import * as express from 'express'

import { Services } from '../service'
import { APIrequest } from '../types'

let router: express.Router = express.Router()

function setRouters(app: express.Application) {
  let services: Services = app.get('services')
  
  router.get('/random', (req: APIrequest , res: express.Response) => {
    services.mentor.getRandom(req, res)
  })

  router.get('/slots', services.auth.verifyToken, services.auth.isMentor, (req: APIrequest , res: express.Response) => {
    services.mentor.getTimeSlots(req, res)
  })

  router.post('/slots', services.auth.verifyToken, services.auth.isMentor, (req: APIrequest , res: express.Response) => {
    services.mentor.updateTimeSlots(req, res)
  })
  
  router.get('/verify', (req: APIrequest , res: express.Response) => {
    services.mentor.verify(req, res)
  })

  router.get('/:keycode', (req: APIrequest , res: express.Response) => {
    services.mentor.get(req, res)
  })

  return router
}

module.exports.init = (app: express.Application) => {
  try {
    let router = setRouters(app)
    app.get('logger').verbose('Mentor router loaded')
    return router
  } catch(err) {
    app.get('logger').error('Could not load mentor router')
  }
}