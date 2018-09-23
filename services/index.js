const Database = require('./database')

module.exports.init = (app) => {
  app.set('db', new Database(app))
}