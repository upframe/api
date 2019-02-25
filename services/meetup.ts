import * as crypto from 'crypto'
import * as express from 'express'
import {google} from 'googleapis'

import {calendar_v3} from 'googleapis'

import moment from 'moment'
import * as fetch from 'node-fetch'

import { AccountTypes, APIerror, APIrequest, APIRequestBody, APIresponse, Meetup, Mentor, Slot, User } from '../types'
import { calendar, sql } from '../utils'

import { Service, StandaloneServices } from '../service'

export class MeetupService extends Service {
  constructor(app: express.Application, standaloneServices: StandaloneServices) {
    super(app, standaloneServices)

    if (this.logger) this.logger.verbose('Meetup service loaded')
  }

  /**
   * @description Returns all user's events (confirmed + pending)
   * @param {APIrequest} req
   * @param {express.Response} res
   */
  public async get(req: APIrequest, res: express.Response) {
    let response: APIresponse = {
        ok: 1,
        code: 200,
      }
    let error: APIerror

    try {
      const sqlQuery = 'SELECT * FROM meetups WHERE menteeUID = ?'
      let userMeetups: Meetup[] = []

      if (req.jwt && req.jwt.uid) {
        userMeetups = (await this.database.query(sqlQuery, [req.jwt.uid]))
        if (!Object.keys(userMeetups).length || !userMeetups.length) {
          error = {
            api: true,
            code: 404,
            message: 'Meetups not found',
            friendlyMessage: 'You have no confirmed/pending meetups.',
          }

          throw error
        }

        response.meetups = userMeetups
      }
    } catch (err) {
      response = {
        ok: 0,
        code: 500,
      }

      if (err.api) {
        response.code = err.code
        response.message = err.message
        response.friendlyMessage = err.friendlyMessage
      }
    }

    res.status(response.code).json(response)
  }

  /**
   * @description Creates a pending meetup which the mentor has to confirm by email
   * @param {APIrequest} req
   * @param {express.Response} res
   */
  public async create(req: APIrequest, res: express.Response) {
    let response: APIresponse = {
        ok: 1,
        code: 200,
      }
    let error: APIerror

    try {
      /*
      if (!req.jwt || !req.jwt.uid) throw 403

      const json: APIRequestBody = Object.assign({}, req.body)
      if (!json.sid || !json.location || !json.start) {
        error = {
          api: true,
          code: 400,
          message: 'There are fields missing to create a new meetup',
          friendlyMessage: 'There are 1 or more fields missing in the request',
        }

        throw error
      }
      */

      // MVP ONLY SECTION START
      const json = Object.assign({}, req.body)
      if (!json.email || !json.location || !json.name || !json.sid) {
        error = {
          api: true,
          code: 400,
          message: 'Insufficient fields to create meetup request',
          friendlyMessage: 'There are no sufficient fields to create meetup request',
        }

        throw error
      }

      const newUser: User = {
        uid: crypto.randomBytes(20).toString('hex'),
        type: AccountTypes.user,
        email: json.email,
        name: json.name,
        password: 'nologin',
      }
      // MVP ONLY SECTION END

      let sqlQuery: string = ''
      let params: string[] | string = []
      let result

      // MVP ONLY SECTION START
      sqlQuery = 'SELECT * FROM users WHERE email = ?'
      params = [newUser.email]
      result = await this.database.query(sqlQuery, params)
      if (!Object.keys(result).length) {
        // create new user
        sqlQuery = `INSERT INTO users (uid, email, name, password, type) VALUES(?, ?, ?, ?, ?)`
        params = [newUser.uid, newUser.email, newUser.name, newUser.password, 'user']
        result = await this.database.query(sqlQuery, params)

        if (!result.affectedRows) {
          error = {
            api: true,
            code: 500,
            message: 'Could not create user account',
            friendlyMessage: 'Could not create user account',
          }

          throw error
        }
      } else {
        // assign existing account UID
        newUser.uid = result.uid
      }
      // MVP ONLY SECTION END

      // get slot info using Slot ID
      sqlQuery = 'SELECT * FROM timeSlots WHERE sid = ?'
      const slot: Slot = await this.database.query(sqlQuery, [json.sid])
      // verify if stot exists
      if (!Object.keys(slot).length) {
        error = {
          api: true,
          code: 404,
          message: 'Slot not found',
          friendlyMessage: 'The slot was not found',
        }

        throw error
      }
      // verify who is creating meetup
      if (slot.mentorUID === newUser.uid) {
        error = {
          api: true,
          code: 400,
          message: 'Mentors cannot set a meetup with themselves',
          friendlyMessage: 'Mentors cannot set a meetup with themselves',
        }

        throw error
      }

      // create meetup object
      let randomMid
      if (json.location.includes('https://talky.io')) {
        randomMid = 't' + crypto.randomBytes(20).toString('hex')
      } else {
        randomMid = 'm' + crypto.randomBytes(20).toString('hex')
      }

      const meetup: Meetup = {
        sid: json.sid,
        mid: randomMid,
        mentorUID: slot.mentorUID,
        menteeUID: newUser.uid,
        location: json.location,
        start: slot.start,
        status: 'pending',
      }
      if (!meetup.mid) {
        error = {
          api: true,
          code: 500,
          message: 'Could not generate meetup ID',
          friendlyMessage: 'It was not possible to complete your request.',
        }

        throw error
      }

      // verify if the requested meetup location is valid (if the mentor has this location as a favorite place)
      sqlQuery = 'SELECT * FROM users WHERE uid = ?'
      const mentor: Mentor = (await this.database.query(sqlQuery, [meetup.mentorUID]))
      if ( mentor.favoritePlaces && !(JSON.parse(mentor.favoritePlaces).includes(meetup.location)) ) {
        error = {
          api: true,
          code: 400,
          message: 'Location is invalid',
          friendlyMessage: 'The location for the meetup you\'re requesting is invalid',
        }

        throw error
      }

      // verify if slot is already occupied
      const genSlots = calendar.automaticGenerate([slot], moment(meetup.start).add(1, 'd').toDate())
      for (const eachSlot of genSlots) {
        // find slot whose date matches the requested meetup date
        if (new Date(eachSlot.start).getTime() === new Date(meetup.start).getTime()) {

          // verify if slot is free (there is no meetup with status confirmed)
          sqlQuery = 'SELECT COUNT(*) FROM meetups WHERE sid = ? AND start = TIMESTAMP(?) AND status = "confirmed"'
          const confirmedSlots = await this.database.query(sqlQuery, [meetup.sid, meetup.start])
          if (confirmedSlots['COUNT(*)']) {
            error = {
              api: true,
              code: 409,
              message: 'This slot is not available.',
              friendlyMessage: 'This slot is not available or has already been booked.',
            }

            throw error
          } else {
            // verify if user has already made a meetup request to that space in time
            sqlQuery = `SELECT COUNT(*) FROM meetups WHERE sid = ? AND start = TIMESTAMP(?)
             AND status = "pending" AND menteeUID = ?`
            const userRequests = await this.database.query(sqlQuery, [meetup.sid, meetup.start, meetup.menteeUID])
            if (userRequests['COUNT(*)']) {
              error = {
                api: true,
                code: 400,
                message: 'Cannot set more than one meetup request',
                friendlyMessage: 'One user can only make one meetup request per slot.',
              }

              throw error
            }

            // finally, let's insert a new meetup request
            [sqlQuery, params] = sql.createSQLqueryFromJSON('INSERT', 'meetups', meetup)
            result = await this.database.query(sqlQuery, params)
            if (!result.affectedRows) {
              error = {
                api: true,
                code: 500,
                message: 'Could not create meetup request',
                friendlyMessage: 'It was not possible to create a meetup request',
              }

              throw error
            }

            // send email
            result = await this.mail.sendMeetupInvitation(meetup.mid)
            if (result.api) throw result
            else if (result) {
              error = {
                api: true,
                code: 500,
                message: 'Could not send meetup request email',
                friendlyMessage: 'Could not send meetup request email to mentor',
              }

              throw error
            }
          }
        }
      }

      /*
      // get slot info using Slot ID
      sqlQuery = 'SELECT * FROM timeSlots WHERE sid = ?'
      const slot: Slot = await this.database.query(sqlQuery, [json.sid])
      // verify if stot exists
      if (!slot) {
        error = {
          api: true,
          code: 404,
          message: 'Slot not found',
          friendlyMessage: 'The slot was not found',
        }

        throw error
      }
      // verify who is creating meetup
      if (slot.mentorUID === json.menteeUID) {
        error = {
          api: true,
          code: 400,
          message: 'Mentors cannot set a meetup with themselves',
          friendlyMessage: 'Mentors cannot set a meetup with themselves',
        }

        throw error
      }

      // create meetup object
      const meetup: Meetup = {
        sid: json.sid,
        mid: crypto.randomBytes(20).toString('hex'),
        mentorUID: slot.mentorUID,
        menteeUID: req.jwt.uid,
        location: json.location,
        start: json.start,
        status: 'pending',
      }
      if (!meetup.mid) {
        error = {
          api: true,
          code: 500,
          message: 'Could not generate meetup ID',
          friendlyMessage: 'It was not possible to complete your request.',
        }

        throw error
      }

      // verify if the requested meetup location is valid (if the mentor has this location as a favorite place)
      sqlQuery = 'SELECT * FROM users WHERE uid = ?'
      const mentor: Mentor = (await this.database.query(sqlQuery, [meetup.mentorUID]))
      if ( mentor.favoritePlaces !== meetup.location ) {
        error = {
          api: true,
          code: 400,
          message: 'Location is invalid',
          friendlyMessage: 'The location for the meetup you\'re requesting is invalid',
        }

        throw error
      }

      // verify if slot is already occupied
      const genSlots = calendar.automaticGenerate([slot], moment(meetup.start).add(1, 'd').toDate())
      for (const eachSlot of genSlots) {
        // find slot whose date matches the requested meetup date
        if (new Date(eachSlot.start).getTime() === new Date(meetup.start).getTime()) {

          // verify if slot is free (there is no meetup with status confirmed)
          sqlQuery = 'SELECT COUNT(*) FROM meetups WHERE sid = ? AND start = TIMESTAMP(?) AND status = "confirmed"'
          const confirmedSlots = await this.database.query(sqlQuery, [meetup.sid, meetup.start])
          if (confirmedSlots['COUNT(*)']) {
            error = {
              api: true,
              code: 409,
              message: 'This slot is not available.',
              friendlyMessage: 'This slot is not available or has already been booked.',
            }

            throw error
          } else {
            // verify if user has already made a meetup request to that space in time
            sqlQuery = `SELECT COUNT(*) FROM meetups WHERE sid = ? AND start = TIMESTAMP(?)
             AND status = "pending" AND menteeUID = ?`
            const userRequests = await this.database.query(sqlQuery, [meetup.sid, meetup.start, meetup.menteeUID])
            if (userRequests['COUNT(*)']) {
              error = {
                api: true,
                code: 400,
                message: 'Cannot set more than one meetup request',
                friendlyMessage: 'One user can only make one meetup request per slot.',
              }

              throw error
            }

            // finally, let's insert a new meetup request
            [sqlQuery, params] = await sql.createSQLqueryFromJSON('INSERT', 'meetups', meetup)
            result = await this.database.query(sqlQuery, params)
            if (!result.affectedRows) {
              error = {
                api: true,
                code: 500,
                message: 'Could not create meetup request',
                friendlyMessage: 'It was not possible to create a meetup request',
              }

              throw error
            }

            // send email
            result = await this.mail.sendMeetupInvitation(meetup.mid)
            if (result.api) throw result
            else if (result) {
              error = {
                api: true,
                code: 500,
                message: 'Could not send meetup request email',
                friendlyMessage: 'Could not send meetup request email to mentor',
              }

              throw error
            }
          }
        }
      }
      */
    } catch (err) {
      response = {
        ok: 0,
        code: 500,
      }

      if (err.api) {
        response.code = err.code
        response.message = err.message
        response.friendlyMessage = err.friendlyMessage
      }
    }

    res.status(response.code).json(response)
  }

  /**
   * @description Confirms meetup
   * @param {APIrequest} req
   * @param {express.Response} res
   */
  public async confirm(req: APIrequest, res: express.Response) {
    let response: APIresponse = {
      ok: 1,
      code: 200,
    }
    let error: APIerror

    try {
      if (!req.jwt || !req.jwt.uid) throw 403

      let sqlQuery: string
      let params: string[]

      // verify if meetup exists and its status
      [sqlQuery, params] = sql.createSQLqueryFromJSON('SELECT', 'meetups', {
        mid: req.query.meetup,
        mentorUID: req.jwt.uid,
        status: 'pending' })
      const meetup: Meetup = await this.database.query(sqlQuery, params)
      if (!Object.keys(meetup).length) {
        error = {
          api: false,
          code: 404,
          message: 'Meetup not found or has already been confirmed',
        }

        throw error
      }

      // change meetup status
      [sqlQuery, params] = sql.createSQLqueryFromJSON('UPDATE', 'meetups', {
        status: 'confirmed',
      }, {
        mid: req.query.meetup,
      })
      let result = await this.database.query(sqlQuery, params)
      result = await this.mail.sendMeetupConfirmation(req.query.meetup)
      if (result) {
        error = {
          api: true,
          code: 500,
          message: 'Error sending email confirmation',
          friendlyMessage: 'Error sending email confirmation',
        }

        throw error
      }

      // fetch mentor info
      [sqlQuery, params] = sql.createSQLqueryFromJSON('SELECT', 'users', {uid: req.jwt.uid})
      const mentor: Mentor = await this.database.query(sqlQuery, params)

      // fetch mentee info
      const [sqlQuery2, params2] = sql.createSQLqueryFromJSON('SELECT', 'users', {uid: meetup.menteeUID})
      const mentee: User = await this.database.query(sqlQuery2, params2)

      if (mentor.googleAccessToken || mentor.googleRefreshToken) {
        // refresh access token
        this.oauth.setCredentials({
          access_token: mentor.googleAccessToken,
          refresh_token: mentor.googleRefreshToken,
        })
        const tokens = await this.oauth.refreshAccessToken()

        if (!tokens.credentials.access_token) {
          error = {
            api: true,
            code: 500,
            message: 'Could not get updated access token',
            friendlyMessage: 'There was an error fetching the user\'s info',
          }
          throw error
        }

        // create Calendar instance
        const googleCalendar = google.calendar({
          version: 'v3',
        })
        // set google options
        google.options({
          auth: this.oauth.OAuthClient,
        })

        // delete slot
        await googleCalendar.events.delete({
          calendarId: mentor.upframeCalendarId,
          eventId: meetup.sid,
        })

        // create event
        await googleCalendar.events.insert({
          calendarId: mentor.upframeCalendarId,
          requestBody: {
            summary: `Upframe Meetup w/${mentee.name}`,
            description: `Meetup with ${mentee.name} at ${meetup.location}`,
            location: meetup.location,
            status: 'confirmed',
            id: meetup.mid,
            start: {
              dateTime: meetup.start,
              timeZone: 'UTC',
            },
            end: {
              dateTime: moment(meetup.start).add(1, 'hours').toISOString(),
              timeZone: 'UTC',
            },
            attendees: [
              {email: mentor.email},
              {email: mentee.email},
            ],
          },
        })
      }

    } catch (err) {
      response = {
        ok: 0,
        code: 500,
      }

      if (err.api) {
        response.code = err.code
        response.message = err.message
        response.friendlyMessage = err.friendlyMessage
      }
    }

    res.status(response.code).json(response)
  }

  /**
   *
   * @param {APIrequest} req
   * @param {express.Response} res
   */
  public async refuse(req: APIrequest, res: express.Response) {
    let response: APIresponse = {
      ok: 1,
      code: 200,
    }
    let error: APIerror

    try {
      if (!req.jwt || !req.jwt.uid) throw 403

      let sqlQuery: string
      let params: string | string[]
      let result: any

      [sqlQuery, params] = sql.createSQLqueryFromJSON('SELECT', 'meetups', {
        mid: req.query.meetup,
        mentorUID: req.jwt.uid,
        status: 'pending',
      })
      const meetup = await this.database.query(sqlQuery, params)
      if (!Object.keys(meetup).length) {
        error = {
          api: true,
          code: 404,
          message: 'Meetup not found',
          friendlyMessage: 'Meetup not found or has already been refused',
        }

        throw error
      }

      [sqlQuery, params] = sql.createSQLqueryFromJSON('UPDATE', 'meetups',
      {
        status: 'refused',
      },
      {
        mid: req.query.meetup,
      })
      result = await this.database.query(sqlQuery, params)
      if (!result.affectedRows) {
        error = {
          api: true,
          code: 500,
          message: 'It was not possible to update meetup state',
          friendlyMessage: 'It was not possible to update meetup state',
        }

        throw error
      }
    } catch (err) {
      response = {
        ok: 0,
        code: 500,
      }

      if (err.api) {
        response.code = err.code
        response.message = err.message
        response.friendlyMessage = err.friendlyMessage
      }
    }

    res.status(response.code).json(response)
  }
}
