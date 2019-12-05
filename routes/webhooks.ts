import * as express from 'express'

import { webhooks, logger } from '../services'

const router: express.Router = express.Router()

function setRouters(): void {
  router.post('/calendar', (req: ApiRequest, res: express.Response) => {
    webhooks.parseGoogleWebhook(req, res)
  })
}

export function init(): express.Router {
  try {
    setRouters()
    logger.verbose('Webhooks router loaded')
  } catch (err) {
    logger.error('Could not load Webhooks router')
  }

  return router
}
