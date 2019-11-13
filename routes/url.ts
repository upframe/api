import * as express from 'express'

import { url, logger } from '../services'

const router: express.Router = express.Router()

function setRouters(): void {
  router.get('/', (req: ApiRequest, res: express.Response) => {
    url.getRealUrl(req, res)
  })
}

export function init(): express.Router {
  try {
    setRouters()
    logger.verbose('URL shortener router loaded')
  } catch (err) {
    logger.error('Could not URL shortener router')
  }

  return router
}
