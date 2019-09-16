import * as express from 'express'
import * as mysql from 'mysql2/promise'
import { Logger } from 'winston'

import moment = require('moment')

import { AccountTypes, AnalyticsResponseRecord, Meetup, Mentor, Slot, User } from '../types'

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

  // Fetch Records

  public async getWeeklyActiveUsers(startTime: Date, endTime: Date) {
    try {
      const UTCstartOfMonth = moment().startOf('month').utc().format('YYYY-MM-DD HH:mm:ss')
      const UTCnow = moment().utc().format('YYYY-MM-DD HH:mm:ss')

      const result = await this.pool.query(`SELECT uid, time FROM events WHERE time BETWEEN '${UTCstartOfMonth}' AND '${UTCnow}'`)

      // create an array with every single day of data
      const wau: AnalyticsResponseRecord[] = []

      let pointerDay = moment().startOf('month').utc()
      let pointerDayEvents = []
      while (true) {
        // if the number of days from the current day pointer is negative,
        // it means the current day pointer has passed today
        if (moment(UTCstartOfMonth).add(1, 'months').diff(pointerDay, 'days') < 0) {
          break
        }

        // new day
        const dayStr = pointerDay.format('YYYY-MM-DD')
        const dayObject: AnalyticsResponseRecord = {
          day: dayStr,
          wau: 0,
          users: [],
        }

        if (dayObject.users !== undefined && dayObject.wau !== undefined) {
          if (moment().utc().diff(pointerDay, 'days') >= 0) {
            // get all events on this day
            pointerDayEvents = result[0].filter((event) => {
              if (moment(event.time).format('YYYY-MM-DD') === pointerDay.format('YYYY-MM-DD')) return true
            })

            for (const event of pointerDayEvents) {
              if (!dayObject.users.includes(event.uid)) {
                dayObject.users.push(event.uid)
                dayObject.wau += 1
              }
            }
          } else {
            dayObject.wau = null
          }
        } else throw 500

        wau.push(dayObject)

        // go one day further
        pointerDay = pointerDay.add(1, 'days')
      }

      // In the first hour(s) of the month, the UTC date will still be of the last month
      // so we should concatenate those events into the first day of the month events~
      if (wau[0].users && wau[1].users) {
        wau[1].users = wau[1].users.concat(wau[0].users)
        wau[1].wau = wau[1].users.length

        // remove first day data as it was merged with first day
        wau.shift()
      }

      return wau
    } catch (err) {
      throw err
    }
  }

  // Add Records
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
