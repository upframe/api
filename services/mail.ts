import '../env'

import * as crypto from 'crypto'
import * as express from 'express'
import * as fs from 'fs'
import mailgun, { Mailgun } from 'mailgun-js'
import moment from 'moment'

import { DatabaseService } from '../service'
import { APIerror, Email, Meetup, Mentor, User } from '../types'

export class Mail {
  private database!: DatabaseService
  private mailgun!: Mailgun

  constructor(app: express.Application, db: DatabaseService) {
    try {
      // set dabase
      this.database = db

      // init mailgun
      if (process.env.MG_APIKEY && process.env.MG_DOMAIN) {
        this.mailgun = mailgun({apiKey: process.env.MG_APIKEY, domain: process.env.MG_DOMAIN})
        app.get('logger').verbose('Mail OK')
      }
      if (!this.mailgun) throw 500

      return this
    } catch (err) {
      app.get('logger').error('Mail NOT OK')
    }
  }

  public getTemplate(name: string, args: any) {
    let file = fs.readFileSync(`./assets/${name}.html`, 'utf8')
    try {
      if (!args) throw new Error('Undefined props')

      for (const prop of Object.keys(args)) {
        // undefined prop
        if (!args[prop]) throw new Error(`Undefined prop ${prop}`)

        file = file.replace(new RegExp(prop, 'g'), args[prop])
      }

      return file
    } catch (err) {
      throw err
    }
  }

  /**
   * @description Send password reset email
   * @param {string} toAddress
   */
  public async sendPasswordReset(toAddress: string) {
    try {
      const passwordResetRequest = await this.database.query('SELECT COUNT(*) FROM users WHERE email = ?',
        [toAddress])

      if (passwordResetRequest['COUNT(*)']) {
        const data: Email = {
          from: 'team@upframe.io',
          to: toAddress,
          subject: 'Password reset',
        }
        const token = crypto.randomBytes(20).toString('hex')
        data.html = this.getTemplate('resetPassword', { RESETURL: token })

        const result = await this.database.query('INSERT INTO passwordReset VALUES(?,?)', [toAddress, token])
        if (result.affectedRows) {
          return (await this.mailgun.messages().send(data)
            .then((res) => {
              if (res.message !== '' && res.id !== '') return 0
              else return 1
            }))
        } else throw 1
      } else throw 1
    } catch (err) {
      return 1
    }
  }

  /**
   *
   * @param {string} toAddress
   */
  public async sendEmailChange(toAddress: string) {
    try {
      const emailChangeRequest = await this.database.query('SELECT COUNT(*) FROM users WHERE email = ?',
        toAddress)

      if (emailChangeRequest['COUNT(*)']) {
        const data: Email = {
          from: 'team@upframe.io',
          to: toAddress,
          subject: 'Email change',
        }
        const token = crypto.randomBytes(20).toString('hex')
        data.html = this.getTemplate('emailChange', { RESETURL: token })

        const result = await this.database.query('INSERT INTO emailChange VALUES(?,?)', [toAddress, token])
        if (result.affectedRows) {
          return this.mailgun.messages().send(data)
            .then((res) => {
              if (res.message !== '' && res.id !== '') return 0
              else throw 1
            })
        } else throw 1
      } else throw 1
    } catch (err) {
      return 1
    }
  }

  /**
   * @description Sends meetup invite notification to mentor by email
   * @param {string} meetupID
   * @param {string} message
   */
  public async sendMeetupInvitation(meetupID: string, message: string | undefined): Promise<(APIerror | number)> {
    let error: APIerror

    try {
      // get meetup by id
      const meetup: Meetup = await this.database.query('SELECT * FROM meetups WHERE mid = ?', meetupID)
      if (!meetup || !Object.keys(meetup).length) {
        error = {
          api: true,
          code: 404,
          message: 'Meetup not found',
          friendlyMessage: 'The meetup was not found',
        }

        throw error
      }

      // get mentee name
      const mentee = await this.database.query('SELECT name, email FROM users WHERE uid = ?', meetup.menteeUID)
      if (!mentee || !Object.keys(mentee).length) {
        error = {
          api: true,
          code: 404,
          message: 'Mentee not found',
          friendlyMessage: 'The mentee was not found',
        }

        throw error
      }

      // get mentor name and email
      const mentor: Mentor = await this.database.query('SELECT name, email, timeoffset FROM users WHERE uid = ?', meetup.mentorUID)
      if (!mentor || !Object.keys(mentor).length) {
        error = {
          api: true,
          code: 404,
          message: 'Mentor not found',
          friendlyMessage: 'The mentor was not found',
        }

        throw error
      }
      const mentorFirstName = mentor.name.split(' ')[0]

      const data: Email = {
          from: 'team@upframe.io',
          to: mentor.email,
          subject: `${mentee.name} invited you for a meetup`,
        }

      const UTCdate = moment.utc(meetup.start).utcOffset((mentor.timeoffset ? mentor.timeoffset : 0))
      const beautifulDate = `${UTCdate.format('Do')} of ${UTCdate.format('MMMM(dddd)')}`
      const beautifulTime = `${UTCdate.format('h:mma')}`

      const placeholders: any = {
          MENTOR: mentorFirstName,
          USER: mentee.name,
          EMAIL: mentee.email,
          LOCATION: meetup.location,
          DATE: beautifulDate,
          TIME: beautifulTime,
          MID: meetupID,
          MEETUPTYPE: meetup.location.includes('talky.io') ? 'call' : 'coffee',
        }

      if (message) {
        placeholders.MESSAGE = message

        data.html = this.getTemplate('meetupInvitationMessage', placeholders)
      } else {
        data.html = this.getTemplate('meetupInvitation', placeholders)
      }

      return this.mailgun.messages().send(data)
        .then((res) => {
          if ((res.message !== '') && (res.id !== '')) return 0
          else throw 1
        })
    } catch (err) {
      if (err.api) return err
      else return 1
    }
  }

  /**
   * @description Sends meetup confirmation notification to mentee by email
   * @param {String} meetupID
   */
  public async sendMeetupConfirmation(meetupID: string): Promise<(APIerror | number)> {
    let error: APIerror

    try {
      // get meetup by id
      const meetup: Meetup = await this.database.query('SELECT * FROM meetups WHERE mid = ?', meetupID)
      if (!meetup || !Object.keys(meetup).length) {
        error = {
          api: true,
          code: 404,
          message: 'Meetup not found',
        }

        throw error
      }

      // get mentee email
      const mentee: User = await this.database.query('SELECT name, email, timeoffset FROM users WHERE uid = ?', meetup.menteeUID)
      if (!mentee || !Object.keys(mentee).length) {
        error = {
          api: true,
          code: 404,
          message: 'Mentee not found',
        }

        throw error
      }

      // get mentor name
      const mentor = await this.database.query('SELECT name, timeoffset FROM users WHERE uid = ?', meetup.mentorUID)
      if (!mentor || !Object.keys(mentor).length) {
        error = {
          api: true,
          code: 404,
          message: 'Mentor not found',
        }

        throw error
      }

      const data: Email = {
          from: 'team@upframe.io',
          to: mentee.email,
          subject: `${mentor.name} accepted to meetup with you`,
        }

      const UTCdate = moment.utc(meetup.start).utcOffset((mentee.timeoffset ? mentee.timeoffset : 0))

      const beautifulDate = `${UTCdate.format('Do')} of ${UTCdate.format('MMMM(dddd)')}`
      const beautifulTime = `${UTCdate.format('h:mma')}`

      const placeholders = {
          USER: mentee.name,
          MENTOR: mentor.name,
          LOCATION: meetup.location,
          DATE: beautifulDate,
          TIME: beautifulTime,
          MID: meetupID,
          MEETUPTYPE: meetup.location.includes('talky.io') ? 'call' : 'coffee',
        }
      data.html = this.getTemplate('meetupConfirmation', placeholders)

      return this.mailgun.messages().send(data)
        .then((res) => {
          if (res.message !== '' && res.id !== '') return 0
          else throw 1
        })
    } catch (err) {
      if (err.api) return err
      else return 1
    }
  }

  /**
   * @description Sends slot request email
   * @param {String} mentorEmail
   * @param {String} mentorName
   * @param {String} menteeName
   * @param {String} menteeMessage
   */
  public async sendTimeSlotRequest(mentorEmail: string, mentorName: string, menteeName: string, menteeEmail: string, menteeMessage: string): Promise<(APIerror | number)> {
    try {
      const data: Email = {
        from: 'team@upframe.io',
        to: mentorEmail,
        subject: (menteeMessage
          ? `${menteeName} sent you a message`
          : `${menteeName} requested some free time of yours`),
      }

      const placeholders: any = {
        MENTOR: mentorName.split(' ')[0],
        USER: menteeName,
        EMAIL: menteeEmail,
        MESSAGE: menteeMessage,
      }

      data.html = this.getTemplate('timeSlotRequest', placeholders)

      return this.mailgun.messages().send(data)
        .then((res) => {
          if ((res.message !== '') && (res.id !== '')) return 0
          else throw 1
        })
    } catch (err) {
      if (err.api) return err
      else return 1
    }
  }
}
