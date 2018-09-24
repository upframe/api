const Database = require('./database')

const User = require('./user')

module.exports.init = (app) => {
  app.set('db', new Database(app))

  let services = {}
  services.user = new User(app)

  app.set('services', services)
  app.get('logger').verbose('Services loaded')
}