class User {

  constructor(app) {
    this.database = app.get('db').getPool()
    this.logger = app.get('logger')
    if(this.logger) this.logger.verbose('User service loaded')
  }

  get(req, res) {
    let sql = 'SELECT * FROM users WHERE email = ?',
      response = {
        code: 200,
        ok: 1
      }
    
    this.database.getConnection((err, conn) => {
      conn.query(sql, req.query.userEmail, (err, result) => {
        if(err) res.status(500)
        
        response.user = result[0]
        res.status(response.code).send(response)
      })

      this.database.releaseConnection(conn)
    })
  }

  update(req, res) {
    let sql = 'UPDATE users SET',
      email = '',
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