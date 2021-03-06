import * as express from 'express'

import { search, logger } from '../services'

const router: express.Router = express.Router()

function setRouters(): void {
  router.get('/quick', (req: ApiRequest, res: express.Response) => {
    search.quick(req, res)
  })

  router.get('/full', (req: ApiRequest, res: express.Response) => {
    search.full(req, res)
  })

  router.get('/tags', (req: ApiRequest, res: express.Response) => {
    search.tags(req, res)
  })

  router.post('/query', (req: ApiRequest, res: express.Response) => {
    search.query(req, res)
  })
}

export function init(): express.Router {
  try {
    setRouters()
    logger.verbose('Search router loaded')
  } catch (err) {
    logger.error('Could not load search router')
  }

  return router
}
