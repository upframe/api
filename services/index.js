const Database = require('./database')
const Mailer = require('./mailer')

const Auth = require('./auth')
const Mentor = require('./mentor')
const User = require('./user')
const Search = require('./search')

module.exports.init = (app) => {
  /**
   *  Independent services 
   *  that work 100% alone
   **/
  app.set('db', new Database(app))
  app.set('mailer', new Mailer(app))

  /**
   *  Dependent services 
   *  that need other 
   *  services to work
   **/
  let services = {}  
  services.auth = new Auth(app)
  services.mentor = new Mentor(app)
  services.user = new User(app)
  services.search = new Search(app)

  app.set('services', services)
  app.get('logger').verbose('Services loaded')
}