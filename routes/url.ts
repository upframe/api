import * as express from 'express'

import { Services } from '../service'
import { APIrequest } from '../types'

const router: express.Router = express.Router()

function setRouters(app: express.Application): void {
  const services: Services = app.get('services')

  router.get('/', (req: APIrequest, res: express.Response) => {
    services.url.getRealUrl(req, res)
  })
}

export function init(app: express.Application): express.Router {
  try {
    setRouters(app)
    app.get('logger').verbose('URL shortener router loaded')
  } catch (err) {
    app.get('logger').error('Could not URL shortener router')
  }

  return router
}
