import * as express from 'express'

import * as Analytics from './analytics'
import * as Auth from './auth'
import * as Meetup from './meetup'
import * as Mentor from './mentor'
import * as Profile from './profile'
import * as Search from './search'
import * as Url from './url'
import * as Webhooks from './webhooks'

import { logger } from '../services'

export function init(app: express.Application): void {
  try {
    app.use('/analytics', Analytics.init())
    app.use('/auth', Auth.init())
    app.use('/meetup', Meetup.init())
    app.use('/mentor', Mentor.init())
    app.use('/search', Search.init())
    app.use('/profile', Profile.init())
    app.use('/url', Url.init())
    app.use('/webhooks', Webhooks.init())

    logger.verbose('Routers loaded')
  } catch (err) {
    logger.error('Could not load routers')
    process.exit(0)
  }
}
