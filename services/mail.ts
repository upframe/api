// get local (folder) environment variables
require('dotenv').config()

import * as crypto from 'crypto'
import * as express from 'express'
import * as fs from 'fs'
import mailgun from 'mailgun-js'

import { Email } from '../types'
import * as winston from 'winston'

export class Mail {
  database: any;
  logger: winston.Logger;
  mailgun: mailgun.Mailgun | undefined;

  constructor(app: express.Application) {
    this.database = app.get('db')
    this.logger = app.get('logger')

    try {
      // init mailgun
      if(process.env.MG_APIKEY && process.env.MG_DOMAIN) {
        this.mailgun = mailgun({apiKey: process.env.MG_APIKEY, domain: process.env.MG_DOMAIN})
        app.get('logger').verbose('Mail  OK')
      }
      if(!this.mailgun) throw 500

      return this
    } catch(err) {
      app.get('logger').error('Mail NOT OK')
    }
  }

  getTemplate(name: string, args: any) {
    let file = fs.readFileSync(`assets/${name}.html`, 'utf8')
    if(args) {
      for(let prop in args) {
        file = file.replace(new RegExp(prop, 'g'), args[prop])
      }
    }
    
    return file
  }

  /**
   * @param {string} toAddress 
   */
  async sendPasswordReset(toAddress: string) {
    try {
      if(!this.mailgun) throw 1

      let [rows] = await this.database.query('SELECT COUNT(*) FROM users WHERE email = ?', toAddress)

      if (rows[0]['COUNT(*)']) {
        let data: Email = {
          from: 'noreply@upframe.io',
          to: toAddress,
          subject: 'Password reset'
        },
          token = crypto.randomBytes(20).toString('hex')
        data.html = this.getTemplate('resetPassword', { 'RESETURL': token })

        let [rows] = await this.database.query('INSERT INTO passwordReset VALUES(?,?)', [toAddress, token])
        if (rows.affectedRows) {
          return (await this.mailgun.messages().send(data)
            .then(data => {
              if (data.message !== '' && data.id !== '') return 0
              else return 1
            }))
        } else throw 1
      } else throw 1
    } catch(err) {
      return 1
    }
  }

  /**
   * 
   * @param {string} toAddress 
   */
  async sendEmailChange(toAddress: string) {
    try {
      if(!this.mailgun) throw 1

      let [rows] = await this.database.query('SELECT COUNT(*) FROM users WHERE email = ?', toAddress)

      if (rows[0]['COUNT(*)']) {
        let data: Email = {
          from: 'noreply@upframe.io',
          to: toAddress,
          subject: 'Email change'
        },
          token = crypto.randomBytes(20).toString('hex')
        data.html = this.getTemplate('emailChange', { 'RESETURL': token })

        let [rows] = await this.database.query('INSERT INTO emailChange VALUES(?,?)', [toAddress, token])
        if (rows.affectedRows) {
          return this.mailgun.messages().send(data)
            .then(data => {
              if (data.message !== '' && data.id !== '') return 0
              else throw 1
            })
        } else throw 1
      } else throw 1
    } catch(err) {
      return 1
    }
  }

  /**
   * @description Sends meetup invite notification to mentor by email 
   * @param {string} meetupID
   */
  async sendMeetupInvitation(meetupID: string) {
    try {
      if(!this.mailgun) throw 1

      // get meetup by id
      let [meetup] = await this.database.query('SELECT * FROM meetups WHERE mid = ?', meetupID)
      if(!meetup.length) throw { APIerr: true, errorCode: 404, errorMessage: 'Meetup not found' }
      
      // get mentee name
      let [mentee] = (await this.database.query('SELECT name FROM users WHERE uid = ?', meetup[0].menteeUID))[0]
      if(!Object.keys(mentee)) throw { APIerr: true, errorCode: 404, errorMessage: 'Mentee not found' }
      
      // get mentor email
      let [mentor] = (await this.database.query('SELECT email FROM users WHERE uid = ?', meetup[0].mentorUID))[0]
      if(!Object.keys(mentor)) throw { APIerr: true, errorCode: 404, errorMessage: 'Mentor not found' }

      let data: Email = {
          from: 'noreply@upframe.io',
          to: mentor.email,
          subject: `${mentee.name} invited you for a meetup`
        },
        placeholders = {
          'USER': mentee.name,
          'LOCATION': meetup[0].location,
          'TIME': new Date(meetup[0].start).toLocaleString(),
          'MID': meetupID,
        }

      data.html = this.getTemplate('meetupInvitation', placeholders)

      return this.mailgun.messages().send(data)
        .then(data => {
          if((data.message !== '') && (data.id !== '')) return 0
          else throw 1
        })
    } catch (err) {
      if(err.APIerr) return err
      else return 1
    }
  }

  /**
   * @description Sends meetup confirmation notification to mentee by email
   * @param {String} meetupID 
   */
  async sendMeetupConfirmation(meetupID: string) {
    try {
      if(!this.mailgun) throw 1

      // get meetup by id
      let [meetup] = await this.database.query('SELECT * FROM meetups WHERE mid = ?', [meetupID])
      if (!meetup.length) throw { APIerr: true, errorCode: 404, errorMessage: 'Meetup not found' }

      // get mentee email
      let [mentee] = (await this.database.query('SELECT email FROM users WHERE uid = ?', [meetup[0].menteeUID]))[0]
      if (!Object.keys(mentee)) throw { APIerr: true, errorCode: 404, errorMessage: 'Mentee not found' }

      // get mentor name
      let [mentor] = (await this.database.query('SELECT name FROM users WHERE uid = ?', [meetup[0].mentorUID]))[0]
      if (!Object.keys(mentor)) throw { APIerr: true, errorCode: 404, errorMessage: 'Mentor not found' }

      let data: Email = {
          from: 'noreply@upframe.io',
          to: mentee.email,
          subject: `${mentor.name} accepted to meetup with you`
        },
        placeholders = {
          'MENTOR': mentor.name,
          'LOCATION': meetup[0].location,
          'TIME': new Date(meetup[0].start).toLocaleString(),
          'MID': meetupID,
        }

      data.html = this.getTemplate('meetupConfirmation', placeholders)

      return this.mailgun.messages().send(data)
        .then(data => {
          if (data.message !== '' && data.id !== '') return 0
          else throw 1
        })
    } catch( err) {
      if(err.APIerr) return err
      else return 1
    }
  }
}