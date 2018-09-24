class User {

  constructor(app) {
    this.database = app.get('db')
    this.logger = app.get('logger')
    if(this.logger) this.logger.verbose('User service loaded')
  }

}

module.exports = User;