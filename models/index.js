let models = {}
models.user = require('./user')

exports.user = models.user
exports.get = (name) => {
  return models[name]
}