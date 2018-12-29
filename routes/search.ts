import * as express from 'express'

import { Services } from '../service'
import { APIrequest } from '../types'

const router: express.Router = express.Router()

function setRouters(app: express.Application) {
  let services: Services = app.get('services')

  router.get('/quick', (req: APIrequest , res: express.Response) => {
    services.search.quick(req, res)
  })
  
  router.get('/full', (req: APIrequest , res: express.Response) => {
    services.search.full(req, res)
  })
  
  router.get('/tags', (req: APIrequest , res: express.Response) => {
    services.search.tags(req, res)
  })

  return router
}

module.exports.init = (app: express.Application) => {
  try {
    let router = setRouters(app)
    app.get('logger').verbose('Search router loaded')
    return router
  } catch(err) {
    app.get('logger').error('Could not load search router')
  }
};