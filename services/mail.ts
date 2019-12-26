import '../env'
require('string.prototype.matchall').shim()

import * as crypto from 'crypto'
import * as fs from 'fs'
import mailgun, { Mailgun } from 'mailgun-js'
import { database } from '.'
import { logger } from '../utils'

const timeZone = 'Europe/Berlin'

export class Mail {
  private mailgun!: Mailgun

  constructor() {
    try {
      // init mailgun
      if (process.env.MG_APIKEY && process.env.MG_DOMAIN) {
        this.mailgun = mailgun({
          apiKey: process.env.MG_APIKEY,
          domain: process.env.MG_DOMAIN,
        })
        logger.verbose('Mail OK')
      }
      if (!this.mailgun) throw 500

      return this
    } catch (err) {
      logger.error('Mail NOT OK')
    }
  }

  public getTemplate(
    name: string,
    args: { [k: string]: string | undefined } = {}
  ) {
    let file = fs.readFileSync(`./assets/${name}.html`, 'utf8')
    ;[...file.matchAll(/<!-- ([A-Z]+)-START -->/g)].forEach(
      ({
        0: { length: startLength },
        1: match,
        index: startIndex = Infinity,
      }) => {
        file = file.replace(
          file.substring(startIndex, startIndex + startLength),
          ''
        )
        const {
          0: { length: endLength },
          index: endIndex = Infinity,
        } = file.match(`<!-- ${match}-END -->`) as RegExpMatchArray
        file = file.replace(file.substring(endIndex, endIndex + endLength), '')
        if (!args[match])
          file = file.replace(file.substring(startIndex, endIndex), '')
      }
    )
    Object.entries(args)
      .filter(([, v]) => v)
      .forEach(([k, v]) => {
        file = file.replace(new RegExp(k, 'g'), v as string)
      })
    return file
  }

  /**
   * @description Send password reset email
   * @param {string} toAddress
   */
  public async sendPasswordReset(toAddress: string) {
    try {
      const passwordResetRequest = await database.query(
        'SELECT COUNT(*) FROM users WHERE email = ?',
        [toAddress]
      )

      if (passwordResetRequest['COUNT(*)']) {
        const data: Email = {
          from: 'team@upframe.io',
          to: toAddress,
          subject: 'Password reset',
        }
        const token = crypto.randomBytes(20).toString('hex')
        data.html = this.getTemplate('resetPassword', { RESETURL: token })

        const result = await database.query(
          'INSERT INTO passwordReset VALUES(?,?)',
          [toAddress, token]
        )
        if (result.affectedRows) {
          return await this.mailgun
            .messages()
            .send(data)
            .then(res => {
              if (res.message !== '' && res.id !== '') return 0
              else return 1
            })
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
      const emailChangeRequest = await database.query(
        'SELECT COUNT(*) FROM users WHERE email = ?',
        toAddress
      )

      if (emailChangeRequest['COUNT(*)']) {
        const data: Email = {
          from: 'team@upframe.io',
          to: toAddress,
          subject: 'Email change',
        }
        const token = crypto.randomBytes(20).toString('hex')
        data.html = this.getTemplate('emailChange', { RESETURL: token })

        const result = await database.query(
          'INSERT INTO emailChange VALUES(?,?)',
          [toAddress, token]
        )
        if (result.affectedRows) {
          return this.mailgun
            .messages()
            .send(data)
            .then(res => {
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
   * @param {string} meetupId
   */
  public async sendMeetupInvitation(meetupId: string) {
    await this.sendMeetupEmail(meetupId, 'request')
  }

  /**
   * @description Sends meetup confirmation notification to mentee by email
   * @param {String} meetupId
   */
  public async sendMeetupConfirmation(meetupId: string) {
    await this.sendMeetupEmail(meetupId, 'confirm')
  }

  private async sendMeetupEmail(meetupId: string, type: 'request' | 'confirm') {
    const meetup = await this.getMeetup(meetupId)
    const [mentee, mentor] = await Promise.all(
      [meetup.menteeUID, meetup.mentorUID].map(this.getUser)
    )

    const info = {
      request: {
        to: mentor.email,
        subject: `${mentee.name} invited you to a meetup`,
        template: 'mentorRequest',
        refMail: mentee.email,
      },
      confirm: {
        to: mentee.email,
        subject: `${mentor.name} accepted to meetup with you`,
        template: 'meetupConfirmation',
        refMail: mentor.email,
      },
    }

    await this.mailgun.messages().send({
      from: 'team@upframe.io',
      to: info[type].to,
      subject: info[type].subject,
      html: this.getTemplate(info[type].template, {
        USER: mentee.name,
        MENTOR: mentor.name,
        DATE: this.formatDate(meetup.start),
        TIME: this.formatTime(meetup.start),
        KEYCODE: mentor.keycode,
        MID: meetupId,
        EMAIL: info[type].refMail,
        MESSAGE: meetup.message,
        LOCATION: meetup.location,
      }),
    })
  }

  /**
   * @description Sends slot request email
   * @param {String} mentorEmail
   * @param {String} mentorName
   * @param {String} menteeName
   * @param {String} menteeMessage
   */
  public async sendTimeSlotRequest(
    mentorEmail: string,
    mentorName: string,
    menteeName: string,
    menteeEmail: string,
    menteeMessage: string
  ): Promise<APIerror | number> {
    try {
      const data: Email = {
        from: 'team@upframe.io',
        to: mentorEmail,
        subject: menteeMessage
          ? `${menteeName} sent you a message`
          : `${menteeName} requested some free time of yours`,
      }

      const placeholders: any = {
        MENTOR: mentorName.split(' ')[0],
        USER: menteeName,
        EMAIL: menteeEmail,
        MESSAGE: menteeMessage,
      }

      data.html = this.getTemplate('message', placeholders)

      return this.mailgun
        .messages()
        .send(data)
        .then(res => {
          if (res.message !== '' && res.id !== '') return 0
          else throw 1
        })
    } catch (err) {
      if (err.api) return err
      else return 1
    }
  }

  private async getUser(uid) {
    const user: Mentor = await database.query(
      'SELECT * FROM users WHERE uid = ?',
      uid
    )
    if (!user || !Object.keys(user).length)
      throw {
        api: true,
        code: 404,
        message: 'User not found',
        friendlyMessage: 'The user was not found',
      }

    return user
  }
  private async getMeetup(id) {
    const meetup: Meetup = await database.query(
      'SELECT * FROM meetups WHERE mid = ?',
      id
    )
    if (!meetup || !Object.keys(meetup).length)
      throw {
        api: true,
        code: 404,
        message: 'Meetup not found',
        friendlyMessage: 'The meetup was not found',
      }

    return meetup
  }

  private formatDate = (date: string | Date) =>
    new Date(date).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone,
    })
  private formatTime = (date: string | Date) =>
    new Date(date).toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
      timeZone,
    })
}
