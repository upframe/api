let models = {}
models.users = require('./users')
models.meetups = require('./meetups')

exports.users = models.users
exports.get = (name) => {
  return models[name]
}