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
          subject: 'Password reset'
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
}

module.exports = Mailer
