import * as express from 'express'

import { Services } from '../service'
import { APIrequest } from '../types'

const router: express.Router = express.Router()

function setRouters(app: express.Application): void {
  const services: Services = app.get('services')

  router.get('/quick', (req: APIrequest, res: express.Response) => {
    services.search.quick(req, res)
  })

  router.get('/full', (req: APIrequest, res: express.Response) => {
    services.search.full(req, res)
  })

  router.get('/tags', (req: APIrequest, res: express.Response) => {
    services.search.tags(req, res)
  })
}

export function init(app: express.Application): express.Router {
  try {
    setRouters(app)
    app.get('logger').verbose('Search router loaded')
  } catch (err) {
    app.get('logger').error('Could not load search router')
  }

  return router
}
