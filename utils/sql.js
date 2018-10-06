
function createSQLPlaceholderFromJSON(json) {
  let partial = '('
  let params = []

  // add property names from JSON
  for (let prop in json) {
    partial += prop + ','
  }
  partial = partial.slice(0, -1) + ') VALUES('

  // add ? as placeholders to VALUES list
  for(let prop in json) {
    partial += '?,'
    params.push(json[prop])
  }
  partial = partial.slice(0, -1) + ')'

  return [partial, params]
}

module.exports.createSQLPlaceholderFromJSON = createSQLPlaceholderFromJSON