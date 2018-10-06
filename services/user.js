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
    
    let [rows] = await this.database.query(sql, token.email)
    if(rows.length) {
      response.user = rows[0]
    } else {
      response.ok = 0
      response.code = 404
    }

    res.status(response.code).json(response)
  }

  update(req, res) {
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

    this.database.getConnection((err, conn) => {
      if(err) res.status(500)
      
      conn.query(sql, email, (err, result) => {
        if(err) res.status(500)
        
        if(result.changedRows) response.code = 202
        else response.code = 409

        res.status(response.code).send(response)
        this.database.releaseConnection(conn)
      })
    })
  }

}

module.exports = User;