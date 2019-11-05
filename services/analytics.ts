import * as express from 'express'
import * as mysql from 'mysql2/promise'
import { Logger } from 'winston'

import moment = require('moment')

import {
  AccountTypes,
  AnalyticsEvent,
  AnalyticsResponseRecord,
  Meetup,
  Mentor,
  Slot,
  User,
} from '../types'

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
  public async getWeeklyActiveUsers() {
    const UTCstartOfMonth = moment().utc().startOf('month').utc().format('YYYY-MM-DD HH:mm:ss')
    const UTCnow = moment().utc().format('YYYY-MM-DD HH:mm:ss')

    const result = await this.pool.query(
      `SELECT uid, time FROM events WHERE time BETWEEN '${UTCstartOfMonth}' AND '${UTCnow}'`
    )
    // create an array with every single day of data
    const wau: AnalyticsResponseRecord[] = []
    let pointerDay = moment().startOf('month').utc()
    let pointerDayEvents: AnalyticsEvent[] = []
    let running: Boolean = true

    while (running) {
      // if the number of days from the current day pointer is negative,
      // it means the current day pointer has passed today
      if (moment(UTCstartOfMonth).add(1, 'months').diff(pointerDay, 'days') <= 0) {
        running = false
        continue
      }

      // new day
      const dayStr = pointerDay.format('YYYY-MM-DD')
      const dayObject: AnalyticsResponseRecord = {
        day: dayStr,
        wau: 0,
        users: [],
      }

      if (
        dayObject.users !== undefined &&
        dayObject.wau !== undefined &&
        dayObject.wau !== null
      ) {
        if (moment().utc().diff(pointerDay, 'days') >= 0) {
          // the next day is never really 24h from now, but less, which means that the diff from
          // 5th October 12:00AM to 4th October 5PM is less than 1 day, but 7 hours instead
          if (moment().utc().date() == moment(pointerDay).date() - 1)
            dayObject.wau = null

          // get all events on this day
          pointerDayEvents = result[0].filter(event => {
            if (
              moment(event.time).format('YYYY-MM-DD') ===
              pointerDay.format('YYYY-MM-DD')
            )
              return true
          })
          for (const event of pointerDayEvents) {
            if (event.uid) {
              if (!dayObject.users.includes(event.uid) && dayObject.wau !== null) {
                dayObject.users.push(event.uid)
                dayObject.wau += 1
              }
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

    return wau
  }

  public async getWeeklyEventsScheduled() {
    const UTCstartOfMonth = moment().utc().startOf('month').utc().format('YYYY-MM-DD HH:mm:ss')
    const UTCnow = moment().utc().format('YYYY-MM-DD HH:mm:ss')
    let pointerDay = moment().startOf('month').utc()

    const result = await this.pool.query(
      `SELECT * FROM analytics.events WHERE events.name = "MeetupConfirm"
      AND events.time BETWEEN '${UTCstartOfMonth}' AND '${UTCnow}'`
    )

    const events = result[0]
    const wes: any = []
    let running: Boolean = true

    while (running) {
      // if the number of days from the current day pointer is negative,
      // it means the current day pointer has passed today
      if (
        moment(UTCstartOfMonth).add(1, 'months').diff(pointerDay, 'days') <= 0
      ) {
        running = false
        continue
      }

      const eventsConfirmedToday = events.filter(
        ev => moment(ev.time).diff(pointerDay, 'days') == 0
      )

      let day = {
        day: pointerDay.format('YYYY-MM-DD'),
        wes: eventsConfirmedToday.length,
      }

      if (
        moment().utc().diff(pointerDay, 'days') < 0 ||
        moment().utc().date() == moment(pointerDay).date() - 1
      ) day.wes = null

      wes.push(day)

      pointerDay = pointerDay.add(1, 'day')
    }

    return wes
  }

  public async getWeeklyActiveMentors() {
    const UTCstartOfMonth = moment().utc().startOf('month').utc().format('YYYY-MM-DD HH:mm:ss')
    const UTCnow = moment().utc().format('YYYY-MM-DD HH:mm:ss')

    const result = await this.pool.query(
      `SELECT uid, time FROM events WHERE name = 'AddSlots' AND time BETWEEN '${UTCstartOfMonth}' AND '${UTCnow}'`
    )
    // create an array with every single day of data
    const wam: AnalyticsResponseRecord[] = []
    let pointerDay = moment().startOf('month').utc()
    let pointerDayEvents: AnalyticsEvent[] = []
    let running: Boolean = true

    while (running) {
      // if the number of days from the current day pointer is negative,
      // it means the current day pointer has passed today
      if (moment(UTCstartOfMonth).add(1, 'months').diff(pointerDay, 'days') <= 0) {
        running = false
        continue
      }

      // new day
      const dayStr = pointerDay.format('YYYY-MM-DD')
      const dayObject: AnalyticsResponseRecord = {
        day: dayStr,
        wam: 0,
        users: [],
      }

      if (
        dayObject.users !== undefined &&
        dayObject.wam !== undefined &&
        dayObject.wam !== null
      ) {
        if (moment().utc().diff(pointerDay, 'days') >= 0) {
          // the next day is never really 24h from now, but less, which means that the diff from
          // 5th October 12:00AM to 4th October 5PM is less than 1 day, but 7 hours instead
          if (moment().utc().date() == moment(pointerDay).date() - 1)
            dayObject.wam = null

          // get all events on this day
          pointerDayEvents = result[0].filter(event => {
            if (
              moment(event.time).format('YYYY-MM-DD') ===
              pointerDay.format('YYYY-MM-DD')
            )
              return true
          })

          for (const event of pointerDayEvents) {
            if (event.uid) {
              if (!dayObject.users.includes(event.uid) && dayObject.wam !== null) {
                dayObject.users.push(event.uid)
                dayObject.wam += 1
              }
            }
          }
        } else {
          dayObject.wau = null
        }
      } else throw 500
      wam.push(dayObject)
      // go one day further
      pointerDay = pointerDay.add(1, 'days')
    }

    return wam
  }

  // Add Records
  public async addMeetup(mentee: string, data: string) {
    const result = await this.pool.query('INSERT INTO meetups VALUES(?,?)', [
      mentee,
      data,
    ])
    console.log(result)
  }

  public async meetupRequest(meetup: Meetup, mentor: Mentor, user: User) {
    try {
      await this.pool.query('INSERT INTO events VALUES(?, ?, ?)', [
        user.uid,
        'MeetupRequest',
        moment().utc().toISOString(),
      ])

      await this.pool.query(
        `INSERT INTO analytics.meetups
        (meetupID, mentorID, menteeID, date, duration, creationTime) VALUES(?, ?, ?, ?, ?, ?)`,
        [
          meetup.mid,
          mentor.uid,
          user.uid,
          moment.utc(meetup.start).toISOString(),
          0,
          moment().utc().toISOString(),
        ]
      )
    } catch (err) {
      this.logger.warn(`Couldn't log meetups' MeetupRequest event`)
      throw err
    }
  }

  public async meetupConfirm(meetup: Meetup, mentor: Mentor) {
    try {
      await this.pool.query('INSERT INTO events VALUES(?, ?, ?)', [
        mentor.uid,
        'MeetupConfirm',
        moment().utc().toISOString(),
      ])

      await this.pool.query(
        'UPDATE analytics.meetups SET statusChangeTime = ?, status = "confirmed" WHERE meetupID = ?',
        [
          moment().utc().toISOString(),
          meetup.mid,
        ]
      )
    } catch (err) {
      this.logger.warn(`Couldn't log meetups' MeetupConfirm event`)
      throw err
    }
  }

  public async meetupRefuse(meetup: Meetup, mentor: Mentor) {
    try {
      await this.pool.query('INSERT INTO events VALUES(?, ?, ?)', [
        mentor.uid,
        'MeetupRefuse',
        moment().utc().toISOString(),
      ])

      await this.pool.query(
        'UPDATE analytics.meetups SET statusChangeTime = ?, status = "refused" WHERE meetupID = ?',
        [
          moment().utc().toISOString(),
          meetup.mid,
        ]
      )
    } catch (err) {
      this.logger.warn(`Couldn't log meetups' MeetupRefuse event`)
      throw err
    }
  }

  // Mentor Events
  public async mentorAddSlots(mentor: Mentor, slot: Slot) {
    try {
      await this.pool.query('INSERT INTO events VALUES(?, ?, ?)', [
        mentor.uid,
        'AddSlots',
        moment().utc().toISOString(),
      ])

      await this.pool.query('INSERT INTO slotsAdded VALUES(?, ?, ?)', [
        slot.sid,
        mentor.uid,
        moment(slot.end).diff(slot.start, 'minutes'),
        moment().utc().toISOString(),
      ])
    } catch (err) {
      this.logger.warn(`Couldn't log mentor's AddSlots event`)
      throw err
    }
  }

  public async mentorRemoveSlots(mentor: Mentor) {
    try {
      await this.pool.query('INSERT INTO events VALUES(?, ?, ?)', [
        mentor.uid,
        'RemoveSlots',
        moment().utc().toISOString(),
      ])
    } catch (err) {
      this.logger.warn(`Couldn't log mentor's RemoveSlots event`)
      throw err
    }
  }

  // User events
  public async userLogin(user: User) {
    const eventName =
      user.type === AccountTypes.mentor ? 'MentorLogin' : 'UserLogin'

    try {
      await this.pool.query('INSERT INTO events VALUES(?, ?, ?)', [
        user.uid,
        eventName,
        moment().utc().toISOString(),
      ])
    } catch (err) {
      this.logger.warn(`Couldn't log user's ${eventName} event`)
      throw err
    }
  }
}
