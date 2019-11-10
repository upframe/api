import * as express from 'express'

import { search, logger } from '../services'
import { APIrequest } from '../types'

const router: express.Router = express.Router()

function setRouters(): void {
  router.get('/quick', (req: APIrequest, res: express.Response) => {
    search.quick(req, res)
  })

  router.get('/full', (req: APIrequest, res: express.Response) => {
    search.full(req, res)
  })

  router.get('/tags', (req: APIrequest, res: express.Response) => {
    search.tags(req, res)
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
