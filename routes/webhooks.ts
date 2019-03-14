import * as express from 'express'

import { Services } from '../service'
import { APIrequest } from '../types'

const router: express.Router = express.Router()

function setRouters(app: express.Application): void {
  const services: Services = app.get('services')

  router.post('/calendar', (req: APIrequest, res: express.Response) => {
    services.webhooks.parseGoogleWebhook(req, res)
  })
}

export function init(app: express.Application): express.Router {
  try {
    setRouters(app)
    app.get('logger').verbose('Webhooks router loaded')
  } catch (err) {
    app.get('logger').error('Could not load Webhooks router')
  }

  return router
}
