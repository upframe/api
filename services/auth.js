// get local (folder) environment variables
require('dotenv').config()

const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const { sql } = require('../utils')

class Auth {
  constructor(app) {
    // inject independent services
    this.database = app.get('db').getPool()
    this.logger = app.get('logger')
    this.mailer = app.get('mailer')

    if(this.logger) this.logger.verbose('Auth service loaded')
  }

  isMentor(req, res, next) {
    if(req.jwt.aud === 'mentor') next()
    else {
      let response = {
        ok: 0,
        code: 403,
        message: 'You\'re not a mentor'
      }
      res.status(response.code).json(response)
    }
  }

  verifyToken(req, res, next) {
    let token = req.cookies['access_token']

    try {
      if(!token) throw 403;

      let decoded = jwt.verify(token, process.env.CONNECT_PK)
      req.jwt = decoded

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

  createToken(user, accountType) {
    return jwt.sign(user, process.env.CONNECT_PK, {expiresIn: 86400 * 15, audience: accountType})
  }

  async login(req, res) {
    let sql = 'SELECT * FROM users WHERE email = ?',
      response = {
        ok: 1,
        code: 200
      }

    let [rows] = await this.database.query(sql, req.body.email)
    if(rows.length) {
      try {
        if(bcrypt.compareSync(req.body.password, rows[0].password)) {
          response.token = this.createToken({
            email: rows[0].email,
            uid: rows[0].uid
          }, rows[0].type)

          res.cookie('access_token', response.token, {maxAge: 86400 * 15, httpOnly: true})
        } else throw 401
      } catch (err) {
        response.ok = 0
        response.code = 400

        if(err === 401) response.message = 'The email or password didn\'t match'
      }
    } else {
      response.ok = 0
      response.code = 404
    }

    res.status(response.code).json(response)
  }

  async register(req, res) {
    let response = {
        code: 200,
        ok: 1
      },
      json = Object.assign({}, req.body)
    try {
      // hash password
      let salt = bcrypt.genSaltSync(10)
      json.password = bcrypt.hashSync(req.body.password, salt)
      // generate keycode
      json.keycode = json.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(new RegExp(' ', 'g'), '.').toLowerCase()
      // generate unique account id
      json.uid = crypto.randomBytes(20).toString('hex')

      let [sqlQuery, params] = sql.createSQLqueryFromJSON('INSERT', 'users', json)
      await this.database.query(sqlQuery, params)
    } catch (err) {
      response.ok = 0
      response.code = 400

      if(err.errno == 1062 && err.sqlState == 23000) {
        response.message = 'There is already an account using that email'
      }
    }

    res.status(response.code).json(response)
  }

  async resetPassword(req, res) {
    let response = {
      ok: 1,
      code: 200
    }

    if(req.body.token) {
      try {
        // verify if token is valid
        let result = (await this.database.query('SELECT COUNT(*) FROM resetPassword WHERE token = ?', req.body.token))[0]
        if (!result[0]['COUNT(*)']) throw 403

        let json = { password: bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10)) },
          whereJson = { email: req.body.email }

        let [sqlQuery, params] = sql.createSQLqueryFromJSON('UPDATE', 'users', json, whereJson)
        result = (await this.database.query(sqlQuery, params))[0]
        if(!result.affectedRows) throw 404 

        sqlQuery = 'DELETE FROM resetPassword WHERE token = ?'
        params = [req.body.token];
        result = (await this.database.query(sqlQuery, params))[0]

        res.status(response.code).json(response)
      } catch (err) {
        response.ok = 0
        response.code = 400

        if(err == 403) {
          response.code = err
          response.message = 'Token is invalid'
        }

        res.status(response.code).json(response)
      }
    } else {
      // result = 1 means email was sent
      // result = 0 means email was NOT sent
      let result = await this.mailer.sendPasswordReset(req.body.email)
      
      if(result != 0) {
        response.ok = 0
        response.code = 400
      }

      res.status(response.code).json(response)
    }
  }
  
  /**
   * @description changes account's email
   */
  async changeEmail(req, res) {
    let response = {
      ok: 1,
      code: 200
    }

    if(req.body.token) {
      try {
        // verify if token is valid by fetching it from the database
        let [rows] = (await this.database.query('SELECT * FROM emailChange WHERE token = ?', req.body.token))
        if (!rows.length) throw 403

        let params = [],
          sql = 'UPDATE users SET email = ? WHERE email = ?'
        
        params.push(req.body.email, rows[0].email)
        await this.database.query(sql, params)

        res.clearCookie('access_token')

        sql = 'DELETE FROM emailChange WHERE token = ?'
        params = [req.body.token];
        await this.database.query(sql, params)
      } catch (err) {
        response.ok = 0
        response.code = 400

        if(err == 403) {
          response.code = err
          response.message = 'Token is invalid'
        }
      }
    } else {
      // result = 1 means email was sent
      // result = 0 means email was NOT sent
      let result = await this.mailer.sendEmailChange(req.body.email)
      
      if(result != 0) {
        response.ok = 0
        response.code = 400
      }
    }

    res.status(response.code).json(response)
  }
}

module.exports = Auth