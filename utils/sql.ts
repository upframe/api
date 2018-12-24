import * as bcrypt from 'bcryptjs';

import * as models from '../models'

/**
 * @param {string} action 
 * @param {string} table 
 * @param {object} fjson 
 * @param {object} sjson 
 */
export function createSQLqueryFromJSON(action: string, table: string, fjson: object, sjson: object) {
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
 * @param {object} json 
 */
function createInsertQuery(table: string, json: object) {
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
 * @param {object} newJson - JSON object with the new information
 * @param {object} whereJson - JSON object with the information needed to indentify record
 */
function createUpdateQuery(table: string, newJson: object, whereJson: object) {
  let sqlQuery = `UPDATE ${table} SET `,
    params = []

  for(let prop in newJson) {
    sqlQuery += prop + ' = ?, '

    if(prop === 'password') {
      // hash password
      let salt = bcrypt.genSaltSync(10)
      newJson[prop] = bcrypt.hashSync(newJson[prop], salt)
    }

    params.push(newJson[prop])
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
 * @param {object} whereJSON 
 */
function createSelectQuery(table: string, whereJSON: object) {
  let fields = models.get(table).fields,
    sqlQuery = 'SELECT ',
    params = []

  for(let fieldName of fields) {
    sqlQuery += `${fieldName}, `
  }
  if(table !== 'mentors') sqlQuery = sqlQuery.slice(0, -2) + ` FROM ${table} WHERE `
  else sqlQuery = sqlQuery.slice(0, -2) + ' FROM users WHERE '

  for(let prop in whereJSON) {
    if(fields.includes(prop)) {
      sqlQuery += `${prop} = ? AND `
      params.push(whereJSON[prop])
    }
  }
  sqlQuery = sqlQuery.slice(0, -5)

  return [sqlQuery, params]
}