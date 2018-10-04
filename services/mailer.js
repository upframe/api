// get local (folder) environment variables
require('dotenv').config()

const mailgun = require('mailgun-js')
const fs = require('fs')

class Mailer {
  constructor(app) {
    this.logger = app.get('logger');
    this.mailgun = mailgun({apiKey: process.env.MG_APIKEY, domain: process.env.MG_DOMAIN})

    if(this.logger) this.logger.verbose('Mail service loaded')
  }

  getTemplate(name) {
    return fs.readFileSync(`assets/${name}.html`, 'utf8')
  }

  /**
   * @param {string} toAddress 
   */
  async sendPasswordReset(toAddress) {
    let data = {
      from: 'noreply@upframe.io',
      to: toAddress,
      subject: 'Password reset',
      html: this.getTemplate('resetPassword')
    }

    
    return this.mailgun.messages().send(data)
      .then(data => {
        if(data.message !== '' && data.id !== '') return 0
        else throw 1
      }).catch(() => {        
        return 1
      })
  }
}

module.exports = Mailer
