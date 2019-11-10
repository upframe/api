import * as express from 'express'

const router: express.Router = express.Router()
import { logger, analytics } from '../services'

function setRouters(): void {
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
      wes,
    })
  })

  router.get('/wam', async (req, res) => {
    const wam = await analytics.getWeeklyActiveMentors()

    res.status(200).json({
      ok: 1,
      wam,
    })
  })
}

export function init(): express.Router {
  try {
    setRouters()
    logger.verbose('Analytics router loaded')
  } catch (err) {
    logger.error('Could not load analytics router')
  }

  return router
}
