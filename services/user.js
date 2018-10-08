const jwt = require('jsonwebtoken')

const { sql } = require('../utils')

class User {

  constructor(app) {
    this.database = app.get('db').getPool()
    this.logger = app.get('logger')

    if(this.logger) this.logger.verbose('User service loaded')
  }

  async get(req, res) {
    let sql = 'SELECT * FROM users WHERE email = ?',
      response = {
        code: 200,
        ok: 1
      },
      token = jwt.decode(req.headers['authorization'].split('Bearer ')[1])
    
    try {
      let [rows] = await this.database.query(sql, token.email)
      if(!rows.length) throw 404
    } catch (err) {
      response.ok = 0
      response.code = 400

      if(err === 404) {
        response.code = err
        response.message = 'User not found'
      }
    }

    res.status(response.code).json(response)
  }

  async update(req, res) {
    let uid = jwt.decode(req.headers['authorization'].split('Bearer ')[1]).uid,
      response = {
        code: 200,
        ok: 1
      },
      json = Object.assign({}, req.body)
    
    let [sqlQuery, params] = sql.createSQLqueryFromJSON('UPDATE', 'users', json, {uid: uid})

    try {
      let [rows] = await this.database.query(sqlQuery, params)

      if(rows.changedRows) response.code = 202
      else throw 409
    } catch (err) {
      
      response.ok = 0
      response.code = 400

      if(err === 404) {
        response.code = err
        response.message = 'User not found'
      } else if(err === 409) response.code = err
    }
    
    res.status(response.code).json(response)
  }

}

module.exports = User;