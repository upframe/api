// get local (folder) environment variables
require('dotenv').config()

const mailgun = require('mailgun-js')

class Mailer {
  constructor(app) {
    this.logger = app.get('logger');
    this.mailgun = mailgun({apiKey: process.env.MG_APIKEY, domain: process.env.MG_DOMAIN})

    if(this.logger) this.logger.verbose('Mail service loaded')
  }

  /**
   * @param {string} toAddress 
   */
  sendPasswordReset(toAddress) {
    let data = {
      from: 'noreply@upframe.io',
      to: toAddress,
      subject: 'Password reset',
      html: 'Test email'
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
