const crypto = require('crypto')

const { sql } = require('../utils')

class meetup {
  constructor(app) {
    // inject independent services
    this.database = app.get('db').getPool()
    this.logger = app.get('logger')
    this.mailer = app.get('mailer')

    if(this.logger) this.logger.verbose('Auth service loaded')
  }


  async create(req, res) {
    let json = Object.assign({}, req.body),
      sqlQuery = '',
      response = {
        ok: 1,
        code: 200
      }
    
    try {
      let meetup = {
        mentee: req.jwt.uid,
        mid: crypto.randomBytes(20).toString('hex'),
        location: req.body.location
      }
      
      // get mentor id
      sqlQuery = 'SELECT uid FROM users WHERE keycode = ? AND type = "mentor"'
      meetup.mentor = (await this.database.query(sqlQuery, json.mentorKeycode))[0][0].uid
      if(!meetup.mentor) throw { APIerr: true, err: 404, msg: 'Mentor not found' }
      if(meetup.mentor === meetup.mentee) throw { APIerr: true, err: 400, msg: 'A user cannot set a meetup with itself'}

      let [sqlQuery2, params] = await sql.createSQLqueryFromJSON('INSERT', 'meetups', meetup)

      let [rows] = await this.database.query(sqlQuery2, params)
      if(!rows.affectedRows) throw { APIerr: true, err: 500, msg: 'Internal Server Error' }
    } catch (err) {
      response.ok = 0
      response.code = 400

      if(err && err.APIerr) {
        response.code = 404
        response.message = err.msg
      }
    }

    res.status(response.code).json(response)
  }
}

module.exports = meetup