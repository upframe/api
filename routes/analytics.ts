import * as express from 'express'

import { AnalyticsService } from '../service'

const router: express.Router = express.Router()

function setRouters(app: express.Application): void {
  const analytics: AnalyticsService = app.get('analytics')

  router.get('/wau', async (req, res) => {
    const wau = await analytics.getWeeklyActiveUsers()

    res.status(200).json({
      ok: 1,
      wau,
    })
  })

  router.get('/wes', async (req, res) => {
    const wes = await analytics.getWeeklyEventsScheduled()

    res.status(200).json({
      ok: 1,
      wes
    })
  })

  router.get('/wam', async (req, res) => {
    const wam = await analytics.getWeeklyActiveMentors()

    res.status(200).json({
      ok: 1,
      wam
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
