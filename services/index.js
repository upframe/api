const Database = require('./database')

const User = require('./user')
const Auth = require('./auth')
const Mentor = require('./mentor')

module.exports.init = (app) => {
  app.set('db', new Database(app))

  let services = {}
  services.user = new User(app)
  services.auth = new Auth(app)
  services.mentor = new Mentor(app)

  app.set('services', services)
  app.get('logger').verbose('Services loaded')
}