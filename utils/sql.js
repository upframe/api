const bcrypt = require('bcryptjs')

const models = require('../models')

/**
 * 
 * @param {string} action 
 * @param {string} table 
 * @param {JSON} fjson 
 * @param {JSON} sjson 
 */
function createSQLqueryFromJSON(action, table, fjson, sjson) {
  let query, params

  switch(action) {
  case 'INSERT':
    [query, params] = createInsertQuery(table, fjson)
    break
  case 'UPDATE':
    [query, params] = createUpdateQuery(table, fjson, sjson)
    break
  case 'SELECT':
    [query, params] = createSelectQuery(table, fjson)
    break
  }
  
  return [query, params]
}

/**
 * @description Creates INSERT SQL query using table name and JSON which contains info 
 * @param {string} table 
 * @param {JSON} json 
 */
function createInsertQuery(table, json) {
  let sqlQuery = `INSERT INTO ${table}(`,
    params = []

  // add property names from JSON
  for (let prop in json) {
    sqlQuery += prop + ','
  }
  sqlQuery = sqlQuery.slice(0, -1) + ') VALUES('

  // add ? as placeholders to VALUES list
  for(let prop in json) {
    sqlQuery += '?,'
    params.push(json[prop])
  }
  sqlQuery = sqlQuery.slice(0, -1) + ')'

  return [sqlQuery, params]
}

/**
 * @description Creates UPDATE SQL query using table name, JSON which contains info and JSON that identifies record
 * @param {string} table 
 * @param {JSON} json 
 * @param {JSON} whereJson 
 */
function createUpdateQuery(table, json, whereJson) {
  let sqlQuery = `UPDATE ${table} SET `,
    params = []

  for(let prop in json) {
    sqlQuery += prop + ' = ?, '

    if(prop === 'password') {
      // hash password
      let salt = bcrypt.genSaltSync(10)
      json[prop] = bcrypt.hashSync(json[prop], salt)
    }

    params.push(json[prop])
  }
  sqlQuery = sqlQuery.slice(0, -2) + ' WHERE '
  
  for(let prop in whereJson) {
    sqlQuery += prop + '= ? AND '

    params.push(whereJson[prop])
  }
  sqlQuery = sqlQuery.slice(0, -5)

  return [sqlQuery, params]
}

/**
 * @description Creates SELECT SQL query using table name and JSON which identifies record
 * @param {string} table 
 * @param {JSON} whereJSON 
 */
function createSelectQuery(table, whereJSON) {
  let userFields = models.get('user').userSafeFields,
    sqlQuery = 'SELECT ',
    params = []

  for(let fieldName of userFields) {
    sqlQuery += `${fieldName}, `
  }
  sqlQuery = sqlQuery.slice(0, -2) + ` FROM ${table} WHERE `

  for(let prop in whereJSON) {
    if(userFields.includes(prop)) {
      sqlQuery += `${prop} = ? AND `
      params.push(whereJSON[prop])
    }
  }
  sqlQuery = sqlQuery.slice(0, -5)

  return [sqlQuery, params]
}

module.exports.createSQLqueryFromJSON = createSQLqueryFromJSON