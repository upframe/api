const crypto = require('crypto')
const moment = require('moment')

const { sql, calendar } = require('../utils')

class meetup {
  constructor(app) {
    // inject independent services
    this.database = app.get('db').getPool()
    this.logger = app.get('logger')
    this.mailer = app.get('mailer')

    if(this.logger) this.logger.verbose('Auth service loaded')
  }

  /**
   * @description Creates a pending meetup which the mentor has to confirm by email
   * @param {Request} req 
   * @param {Response} res 
   */
  async create(req, res) {
    let json = Object.assign({}, req.body),
      sqlQuery = '',
      response = {
        ok: 1,
        code: 200
      }

    try {
      let meetup = {
        menteeUID: req.jwt.uid,
        mid: crypto.randomBytes(20).toString('hex'),
        sid: json.sid,
        location: json.location,
        start: json.start
      }
      
      // get Slot info using Slot ID
      sqlQuery = 'SELECT * FROM timeSlots WHERE sid = ?'
      let [slots] = (await this.database.query(sqlQuery, [meetup.sid]))
      if(!slots.length) throw { APIerr: false, errorCode: 404, errorMessage: 'Slot not found' }
      // verify if the user requesting the meetup is the mentor itself
      if(slots[0].mentorUID === meetup.menteeUID) throw { APIerr: false, errorCode: 400, errorMessage: 'A user cannot set a meetup with itself'}

      meetup.mentorUID = slots[0].mentorUID

      // verify if the requested meetup location is valid (if the mentor has this location as a favorite place)
      sqlQuery = 'SELECT * FROM users WHERE uid = ?'
      if( (await this.database.query(sqlQuery, [meetup.mentorUID]))[0][0].location != meetup.location) {
        throw { APIerr: false, errorCode: 400, errorMessage: 'Slot location is invalid' }
      }

      // verify if slot is already occupied
      let genSlots = calendar.generateSlots(slots, moment(meetup.start).add(1, 'd').toDate())
      for(let slot of genSlots) {
        // find slot whose date matches the requested meetup date
        if(new Date(slot.start).getTime() == new Date(meetup.start).getTime()) {
          // verify if slot is free (there is no meetup with status confirmed)
          sqlQuery = 'SELECT * FROM meetups WHERE sid = ? AND start = TIMESTAMP(?) AND status = "confirmed"'
          let [freeSlots] = (await this.database.query(sqlQuery, [meetup.sid, meetup.start]))
          if(freeSlots.length) throw { APIerr: false, errorCode: 404, errorMessage: 'There is no slot available' }
          else {
            // verify if user has already made a meetup request to that space in time
            sqlQuery = 'SELECT * FROM meetups WHERE sid = ? AND start = TIMESTAMP(?) AND status = "pending" AND menteeUID = ?'
            let [userRequests] = (await this.database.query(sqlQuery, [meetup.sid, meetup.start, meetup.menteeUID]))
            if(userRequests.length) throw { APIerr: true, errorCode: 400, errorMessage: 'One user can only make one request for each slot' }
            
            // finally, let's insert a new meetup request
            let [sqlQuery2, params] = await sql.createSQLqueryFromJSON('INSERT', 'meetups', meetup)
            let [rows] = await this.database.query(sqlQuery2, params)
            if(!rows.affectedRows) throw { APIerr: true, errorCode: 500, errorMessage: 'Internal Server Error' }
            
            // send email
            let result = await this.mailer.sendMeetupInvitation(meetup.mid)
            if(result) throw 500
          }
        }
      }
    } catch (err) {
      response.ok = 0
      response.code = 400

      if(err.APIerr) {
        response.code = err.errorCode
        response.message = err.errorMessage
      }
    }

    res.status(response.code).json(response)
  }

  /**
   * @description Confirms meetup
   * @param {Request} req 
   * @param {Response} res 
   */
  async confirm(req, res) {
    let response = {
      ok: 1,
      code: 200
    }

    try {
      let [sqlQuery, params] = sql.createSQLqueryFromJSON('UPDATE', 'meetups', {status: 'confirmed'}, { mid: req.query.meetup })
      let [rows] = await this.database.query(sqlQuery, params)
      
      if(rows.affectedRows && !rows.changedRows) throw { APIerr: true, errorCode: 400, errorMessage: 'Meetup arleady confirmed' }
      else if(!rows.affectedRows) throw { APIerr: true, errorCode: 404, errorMessage: 'Meetup not found' }
    } catch (err) {
      response.ok = 0
      response.code = 400
      
      if(err.APIerr) {
        response.code = err.errorCode
        response.message = err.errorMessage
      }
    }

    res.status(response.code).json(response)
  }

  /**
   * @description Returns all user's events (confirmed + pending) 
   * @param {Request} req 
   * @param {Response} res 
   */
  async get(req, res) {
    let response = {
        ok: 1,
        code: 200
      },
      sqlQuery = 'SELECT * FROM meetups WHERE mentee = ?'

    try {
      let [rows] = await this.database.query(sqlQuery, [req.jwt.uid])
      if(!rows.length) throw { APIerr: true, errorCode: 404, errorMessage: 'No events found'}

      response.events = rows
    } catch (err) {
      response.ok = 0
      response.code = 400

      if(err.APIerr) {
        response.code = err.errorCode
        response.message = err.errorMessage
      }
    }

    res.status(response.code).json(response)
  }
}

module.exports = meetup