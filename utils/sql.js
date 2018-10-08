const bcrypt = require('bcryptjs')


function createSQLqueryFromJSON(action, table, newJSON, whereJSON) {
  let query, params

  switch(action) {
  case 'INSERT':
    [query, params] = createInsertQuery(`INSERT INTO ${table}`, newJSON)
    break
  case 'UPDATE':
    [query, params] = createUpdateQuery(`UPDATE ${table} SET `, newJSON, whereJSON)
    break
  }
  
  return [query, params]
}

function createInsertQuery(query, json) {
  let params = []
  
  query += '('
  // add property names from JSON
  for (let prop in json) {
    query += prop + ','
  }
  query = query.slice(0, -1) + ') VALUES('

  // add ? as placeholders to VALUES list
  for(let prop in json) {
    query += '?,'
    params.push(json[prop])
  }
  query = query.slice(0, -1) + ')'

  return [query, params]
}

function createUpdateQuery(query, json, whereJson) {
  let params = []

  for(let prop in json) {
    query += prop + ' = ?, '

    if(prop === 'password') {
      // hash password
      let salt = bcrypt.genSaltSync(10)
      json[prop] = bcrypt.hashSync(json[prop], salt)
    }

    params.push(json[prop])
  }
  query = query.slice(0, -2) + ' WHERE '
  
  for(let prop in whereJson) {
    query += prop + '= ? AND '

    params.push(whereJson[prop])
  }
  query = query.slice(0, -5)

  return [query, params]
}

module.exports.createSQLqueryFromJSON = createSQLqueryFromJSON