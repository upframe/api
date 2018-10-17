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
      token = req.jwt
    
    try {
      let [rows] = await this.database.query(sql, token.email)
      response.me = rows[0]
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
    let uid = req.jwt.uid,
      response = {
        code: 200,
        ok: 1
      },
      json = Object.assign({}, req.body)
    
    let [sqlQuery, params] = sql.createSQLqueryFromJSON('UPDATE', 'users', json, {uid: uid})

    try {
      console.log(params)
      console.log(sqlQuery)
      let [rows] = await this.database.query(sqlQuery, params)
      if(rows.changedRows) response.code = 202
      else throw 409
    } catch (err) {
      console.log(err)
      response.ok = 0
      response.code = 400

      if(err === 404) {
        response.code = err
        response.message = 'User not found'
      } else if(err === 409) response.code = err
    }
    
    res.status(response.code).json(response)
  }

  async image(url, userEmail, res, location) {
    let sqlQuery = 'UPDATE users SET profilePic = ? WHERE email = ?'
    try {
      let [rows] = await this.database.query(sqlQuery, [url, userEmail])
      res.status(200).json({
        code: 200,
        ok: 1,
        url: location
      })
    } catch (err) {
      console.log(err)
    }
    
  }

}

module.exports = User;