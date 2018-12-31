// get local (folder) environment variables
// require('dotenv').config()
import '../env'

import * as crypto from 'crypto'
import * as express from 'express'
import * as fs from 'fs'
import mailgun from 'mailgun-js'

import * as winston from 'winston'
import { Email } from '../types'

export class Mail {
  public database: any
  public logger: winston.Logger
  public mailgun: mailgun.Mailgun | undefined

  constructor(app: express.Application) {
    this.database = app.get('db')
    this.logger = app.get('logger')

    try {
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
    let file = fs.readFileSync(`assets/${name}.html`, 'utf8')
    if (args) {
      for (const prop of Object.keys(args)) {
        file = file.replace(new RegExp(prop, 'g'), args[prop])
      }
    }

    return file
  }

  /**
   * @param {string} toAddress
   */
  public async sendPasswordReset(toAddress: string) {
    try {
      if (!this.mailgun) throw 1

      let rows = (await this.database.query('SELECT COUNT(*) FROM users WHERE email = ?', toAddress))[0][0]

      if (rows[0]['COUNT(*)']) {
        const data: Email = {
          from: 'noreply@upframe.io',
          to: toAddress,
          subject: 'Password reset',
        }
        const token = crypto.randomBytes(20).toString('hex')
        data.html = this.getTemplate('resetPassword', { RESETURL: token })

        rows = (await this.database.query('INSERT INTO passwordReset VALUES(?,?)', [toAddress, token]))[0][0]
        if (rows.affectedRows) {
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
      if (!this.mailgun) throw 1

      let rows = (await this.database.query('SELECT COUNT(*) FROM users WHERE email = ?', toAddress))[0][0]

      if (rows[0]['COUNT(*)']) {
        const data: Email = {
          from: 'noreply@upframe.io',
          to: toAddress,
          subject: 'Email change',
        }
        const token = crypto.randomBytes(20).toString('hex')
        data.html = this.getTemplate('emailChange', { RESETURL: token })

        rows = (await this.database.query('INSERT INTO emailChange VALUES(?,?)', [toAddress, token]))[0][0]
        if (rows.affectedRows) {
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
   */
  public async sendMeetupInvitation(meetupID: string) {
    try {
      if (!this.mailgun) throw 1

      // get meetup by id
      const [meetup] = await this.database.query('SELECT * FROM meetups WHERE mid = ?', meetupID)
      if (!meetup.length) throw { APIerr: true, errorCode: 404, errorMessage: 'Meetup not found' }

      // get mentee name
      const [mentee] = (await this.database.query('SELECT name FROM users WHERE uid = ?', meetup[0].menteeUID))[0]
      if (!Object.keys(mentee)) throw { APIerr: true, errorCode: 404, errorMessage: 'Mentee not found' }

      // get mentor email
      const [mentor] = (await this.database.query('SELECT email FROM users WHERE uid = ?', meetup[0].mentorUID))[0]
      if (!Object.keys(mentor)) throw { APIerr: true, errorCode: 404, errorMessage: 'Mentor not found' }

      const data: Email = {
          from: 'noreply@upframe.io',
          to: mentor.email,
          subject: `${mentee.name} invited you for a meetup`,
        }
      const placeholders = {
          USER: mentee.name,
          LOCATION: meetup[0].location,
          TIME: new Date(meetup[0].start).toLocaleString(),
          MID: meetupID,
        }

      data.html = this.getTemplate('meetupInvitation', placeholders)

      return this.mailgun.messages().send(data)
        .then((res) => {
          if ((res.message !== '') && (res.id !== '')) return 0
          else throw 1
        })
    } catch (err) {
      if (err.APIerr) return err
      else return 1
    }
  }

  /**
   * @description Sends meetup confirmation notification to mentee by email
   * @param {String} meetupID
   */
  public async sendMeetupConfirmation(meetupID: string) {
    try {
      if (!this.mailgun) throw 1

      // get meetup by id
      const [meetup] = await this.database.query('SELECT * FROM meetups WHERE mid = ?', [meetupID])
      if (!meetup.length) throw { APIerr: true, errorCode: 404, errorMessage: 'Meetup not found' }

      // get mentee email
      const [mentee] = (await this.database.query('SELECT email FROM users WHERE uid = ?', [meetup[0].menteeUID]))[0]
      if (!Object.keys(mentee)) throw { APIerr: true, errorCode: 404, errorMessage: 'Mentee not found' }

      // get mentor name
      const [mentor] = (await this.database.query('SELECT name FROM users WHERE uid = ?', [meetup[0].mentorUID]))[0]
      if (!Object.keys(mentor)) throw { APIerr: true, errorCode: 404, errorMessage: 'Mentor not found' }

      const data: Email = {
          from: 'noreply@upframe.io',
          to: mentee.email,
          subject: `${mentor.name} accepted to meetup with you`,
        }
      const placeholders = {
          MENTOR: mentor.name,
          LOCATION: meetup[0].location,
          TIME: new Date(meetup[0].start).toLocaleString(),
          MID: meetupID,
        }
      data.html = this.getTemplate('meetupConfirmation', placeholders)

      return this.mailgun.messages().send(data)
        .then((res) => {
          if (res.message !== '' && res.id !== '') return 0
          else throw 1
        })
    } catch (err) {
      if (err.APIerr) return err
      else return 1
    }
  }
}
