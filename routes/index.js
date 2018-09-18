const authRouter = require('./auth')
const mentorRouter = require('./mentor')
const searchRouter = require('./search')
const profileRouter = require('./profile')

exports.init = (app) => {
  app.use('/auth', authRouter)
  app.use('/mentor', mentorRouter)
  app.use('/search', searchRouter)
  app.use('/profile', profileRouter)
}