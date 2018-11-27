let models = {}
models.users = require('./users')
models.meetups = require('./meetups')
models.mentors = require('./mentors')
models.passwordReset = require('./passwordReset')

exports.users = models.users
exports.meetups = models.meetups
exports.mentors = models.mentors
exports.passwordReset = models.passwordReset
exports.get = (name) => {
  return models[name]
}