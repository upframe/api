import * as express from 'express'
import moment = require('moment')
import * as mysql from 'mysql2/promise'
import { Logger } from 'winston'

import { AccountTypes, Meetup, Mentor, Slot, User } from '../types'

export class Analytics {
  private logger: Logger
  private pool: any

  constructor(app: express.Application) {
    this.logger = app.get('logger')

    try {
      const pool: mysql.Pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_ANALYTICS,
      })

      if (pool) this.logger.verbose('Analytics OK')
      this.pool = pool

    } catch (err) {
      this.logger.error('Analytics NOT OK')
    }
  }

  public async addMeetup(mentee: string, data: string) {
    try {
      const result = await this.pool.query('INSERT INTO meetups VALUES(?,?)', [mentee, data])
      console.log(result)
    } catch (err) {
      throw err
    }
  }

  public async meetupRequest(meetup: Meetup, mentor: Mentor, user: User) {
    try {
      await this.pool.query('INSERT INTO events VALUES(?, ?, ?)',
        [user.uid, 'MeetupRequest', moment().utc().toISOString()])

      await this.pool.query(`INSERT INTO analytics.meetups
        (meetupID, mentorID, menteeID, date, duration, creationTime) VALUES(?, ?, ?, ?, ?, ?)`,
        [meetup.mid, mentor.uid, user.uid, moment.utc(meetup.start).toISOString(), 0, moment().utc().toISOString()])
    } catch (err) {
      this.logger.warn(`Couldn\'t log meetups' MeetupRequest event`)
      throw err
    }
  }

  public async meetupConfirm(meetup: Meetup, mentor: Mentor) {
    try {
      await this.pool.query('INSERT INTO events VALUES(?, ?, ?)',
        [mentor.uid, 'MeetupConfirm', moment().utc().toISOString()])

      await this.pool.query('UPDATE analytics.meetups SET statusChangeTime = ?, status = "confirmed" WHERE meetupID = ?',
        [moment().utc().toISOString(), meetup.mid])
    } catch (err) {

      this.logger.warn(`Couldn\'t log meetups' MeetupConfirm event`)
      throw err
    }
  }

  public async meetupRefuse(meetup: Meetup, mentor: Mentor) {
    try {
      await this.pool.query('INSERT INTO events VALUES(?, ?, ?)',
        [mentor.uid, 'MeetupRefuse', moment().utc().toISOString()])

      await this.pool.query('UPDATE analytics.meetups SET statusChangeTime = ?, status = "refused" WHERE meetupID = ?',
        [moment().utc().toISOString(), meetup.mid])
    } catch (err) {

      this.logger.warn(`Couldn\'t log meetups' MeetupRefuse event`)
      throw err
    }
  }

  // Mentor Events
  public async mentorAddSlots(mentor: Mentor, slot: Slot) {
    try {
      await this.pool.query('INSERT INTO events VALUES(?, ?, ?)',
        [mentor.uid, 'AddSlots', moment().utc().toISOString()])

      await this.pool.query('INSERT INTO slotsAdded VALUES(?, ?, ?)',
        [slot.sid, mentor.uid, moment(slot.end).diff(slot.start, 'minutes'), moment().utc().toISOString()])
    } catch (err) {

      this.logger.warn(`Couldn\'t log mentor's AddSlots event`)
      throw err
    }
  }

  public async mentorRemoveSlots(mentor: Mentor) {
    try {
      const result = await this.pool.query('INSERT INTO events VALUES(?, ?, ?)',
        [mentor.uid, 'RemoveSlots', moment().utc().toISOString()])
    } catch (err) {

      this.logger.warn(`Couldn\'t log mentor's RemoveSlots event`)
      throw err
    }
  }

  // User events
  public async userLogin(user: User) {
    const eventName = user.type === AccountTypes.mentor ? 'MentorLogin' : 'UserLogin'

    try {
      await this.pool.query('INSERT INTO events VALUES(?, ?, ?)',
        [user.uid, eventName, moment().utc().toISOString()])
    } catch (err) {

      this.logger.warn(`Couldn\'t log user's ${eventName} event`)
      throw err
    }
  }
}
