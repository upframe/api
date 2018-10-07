const jwt = require('jsonwebtoken')

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
    let sql = 'UPDATE users SET',
      email = jwt.decode(req.headers['authorization'].split('Bearer ')[1]).email,
      response = {
        code: 200,
        ok: 1
      }

    for(let prop in req.body) {
      sql += ` ${prop}="${req.body[prop]}",`
    }
    sql = sql.slice(0, -1)
    
    // get email/uid from JWT token
    sql += ' WHERE email = ?'

    try {
      let [rows] = await this.database.query(sql, email)

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