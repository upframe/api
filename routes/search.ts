import * as express from 'express'

const router: express.Router = express.Router()

function setRouters(app: express.Application) {
  let services = app.get('services')

  router.get('/quick', (req, res) => {
    services.search.quick(req, res)
  })
  
  router.get('/full', (req, res) => {
    services.search.full(req, res)
  })
  
  router.get('/tags', (req, res) => {
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