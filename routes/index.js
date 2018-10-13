const authRouter = require('./auth')
const meetupRouter = require('./meetup')
const mentorRouter = require('./mentor')
const searchRouter = require('./search')
const profileRouter = require('./profile')

exports.init = (app) => {
  authRouter.init(app)
  let meetup = meetupRouter.init(app)
  mentorRouter.init(app)
  searchRouter.init(app)
  let profile = profileRouter.init(app)
  app.get('logger').verbose('Routers loaded')

  app.use('/auth', authRouter)
  app.use('/meetup', meetup)
  app.use('/mentor', mentorRouter)
  app.use('/search', searchRouter)
  app.use('/profile', profile)
}