import * as express from 'express'

const router: express.Router = express.Router()

function setRouters(app: express.Application): void {
  const analytics: any = app.get('analytics')

  router.get('/wau', async (req, res) => {
    const startTime = req.query.startTime
    const endTime = req.query.endTime

    const wau = await analytics.getWeeklyActiveUsers(startTime, endTime)

    res.status(200).json({
      ok: true,
      wau,
    })
  })
}

export function init(app: express.Application): express.Router {
  try {
    setRouters(app)
    app.get('logger').verbose('Analytics router loaded')
  } catch (err) {
    app.get('logger').error('Could not load analytics router')
  }

  return router
}
