let models = {}
models.users = require('./users')
models.meetups = require('./meetups')
models.mentors = require('./mentors')

exports.users = models.users
exports.meetups = models.meetups
exports.mentors = models.mentors
exports.get = (name) => {
  return models[name]
}