const Auth = require('./auth')
const Meetup = require('./meetup')
const Mentor = require('./mentor')
const Search = require('./search')
const Profile = require('./profile')

exports.init = (app) => {

  try {
    app.use('/auth', Auth.init(app))
    app.use('/meetup', Meetup.init(app))
    app.use('/mentor', Mentor.init(app))
    app.use('/search', Search.init(app))
    app.use('/profile', Profile.init(app))

    app.get('logger').verbose('Routers loaded')
  } catch (err) {
    app.get('logger').error('Could not load routers')
    process.exit(0)
  }
}