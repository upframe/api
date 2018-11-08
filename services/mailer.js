// get local (folder) environment variables
require('dotenv').config()

const mailgun = require('mailgun-js')
const fs = require('fs')
const crypto = require('crypto')

class Mailer {
  constructor(app) {
    this.database = app.get('db').getPool()
    this.logger = app.get('logger');
    this.mailgun = mailgun({apiKey: process.env.MG_APIKEY, domain: process.env.MG_DOMAIN})

    if(this.logger) this.logger.verbose('Mail service loaded')
  }

  getTemplate(name, args) {
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
  async sendPasswordReset(toAddress) {
    let [rows] = await this.database.query('SELECT COUNT(*) FROM users WHERE email = ?', toAddress)

    if(rows[0]['COUNT(*)']) {
      let data = {
          from: 'noreply@upframe.io',
          to: toAddress,
          subject: 'Password reset'
        },
        token = crypto.randomBytes(20).toString('hex')
      data.html = this.getTemplate('resetPassword', { 'RESETURL': token })
      
      let [rows] = await this.database.query('INSERT INTO resetPassword VALUES(?,?)', [toAddress, token])
      if (rows.affectedRows) {
        return this.mailgun.messages().send(data)
          .then(data => {
            if (data.message !== '' && data.id !== '') return 0
            else throw 1
          }).catch(() => {
            return 1
          }) 
      }
    } else return 1
  }

  /**
   * 
   * @param {string} toAddress 
   */
  async sendEmailChange(toAddress) {
    let [rows] = await this.database.query('SELECT COUNT(*) FROM users WHERE email = ?', toAddress)

    if(rows[0]['COUNT(*)']) {
      let data = {
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
          }).catch(() => {
            return 1
          }) 
      }
    } else return 1
  }

  /**
   * @description Sends meetup invite notification by email
   * @param {string} meetupID
   */
  async sendMeetupInvitation(meetupID) {
    try {
      // get meetup by id
      let [meetup] = await this.database.query('SELECT * FROM meetups WHERE mid = ?', meetupID)
      if(!meetup.length) throw { APIerr: true, errorCode: 404, errorMessage: 'Meetup not found' }
      
      // get mentee name
      let [mentee] = (await this.database.query('SELECT name FROM users WHERE uid = ?', meetup[0].menteeUID))[0]
      if(!Object.keys(mentee)) throw { APIerr: true, errorCode: 404, errorMessage: 'Mentee not found' }
      
      // get mentor email
      let [mentor] = (await this.database.query('SELECT email FROM users WHERE uid = ?', meetup[0].mentorUID))[0]
      if(!Object.keys(mentor)) throw { APIerr: true, errorCode: 404, errorMessage: 'Mentor not found' }

      let data = {
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
          if(data.message !== '' & data.id !== '') return 0
          else throw 1
        })
        .catch(() => {
          return 1
        })
    } catch (err) {
      console.log(err)
      if(err.APIerr) return err
      else return 1
    }
  }
}

module.exports = Mailer
