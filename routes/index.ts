import * as express from 'express'

import * as Analytics from './analytics'
import * as Auth from './auth'
import * as Meetup from './meetup'
import * as Mentor from './mentor'
import * as Profile from './profile'
import * as Search from './search'
import * as Url from './url'
import * as Webhooks from './webhooks'

export function init(app: express.Application): void {
  try {
    app.use('/analytics', Analytics.init(app))
    app.use('/auth', Auth.init(app))
    app.use('/meetup', Meetup.init(app))
    app.use('/mentor', Mentor.init(app))
    app.use('/search', Search.init(app))
    app.use('/profile', Profile.init(app))
    app.use('/url', Url.init(app))
    app.use('/webhooks', Webhooks.init(app))

    app.get('logger').verbose('Routers loaded')
  } catch (err) {
    app.get('logger').error('Could not load routers')
    process.exit(0)
  }
}
