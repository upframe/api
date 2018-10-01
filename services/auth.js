// get local (folder) environment variables
require('dotenv').config()

const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

class Auth {
  constructor(app) {
    this.database = app.get('db').getPool()
    this.logger = app.get('logger')

    if(this.logger) this.logger.verbose('Auth service loaded')
  }

  verifyToken(req, res, next) {
    let authHeader = req.headers['authorization']

    try {
      if(!authHeader) throw 403;

      jwt.verify(authHeader.split('Bearer ')[1], process.env.CONNECT_PK)
      
      next()
    } catch (err) {
      let response = {
        ok: 0,
        code: 403,
        message: 'The JWT token is not valid'
      }

      if(err.name === 'TokenExpiredError') {
        response.code = 403
        response.message = 'Session expired'
      }

      res.status(response.code).json(response)
    }
  }

  createToken(user) {
    return jwt.sign(user, process.env.CONNECT_PK, {expiresIn: 86400 * 15, audience: 'user'})
  }

  async login(req, res) {
    let sql = 'SELECT * FROM users WHERE email = ?',
      response = {
        ok: 1,
        code: 200
      }
    
    this.database.getConnection((err, conn) => {
      conn.query(sql, req.body.email, (err, result) => {
        
        if(bcrypt.compareSync(req.body.password, result[0].password)) {
          let token = this.createToken({email: result[0].email})    
          
          response.token = token
        } else {
          response.code = 0
          response.code = 401
          response.message = 'Wrong username/password'
        }

        res.status(response.code).json(response)
      })
    })
  }
}

module.exports = Auth