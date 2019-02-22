import * as express from 'express'

import { Database } from './database'
import { OAuth } from './google'
import { Mail } from './mail'

import { AuthService as Auth } from './auth'
import { MeetupService as Meetup } from './meetup'
import { MentorService as Mentor } from './mentor'
import { SearchService as Search } from './search'
import { UrlService as Url } from './url'
import { UserService as User } from './user'

import { DatabaseService, MailService, OAuthService, Services, StandaloneServices } from '../service'

export function init(app: express.Application): void {
  /*
   * Independent services that work alone
   */
  const database: DatabaseService = new Database(app)
  const mailer: MailService = new Mail(app, database)
  const oauth: OAuthService = new OAuth()
  const standaloneServices: StandaloneServices = {
    db: database,
    mail: mailer,
    oAuth: oauth,
  }

  /*
   * Dependent services that need other
   * services to work
   **/
  const services: Services = {
    auth: new Auth(app, standaloneServices),
    meetup: new Meetup(app, standaloneServices),
    mentor: new Mentor(app, standaloneServices),
    search: new Search(app, standaloneServices),
    user: new User(app, standaloneServices),
    url: new Url(app, standaloneServices),
  }

  app.set('services', services)
  app.get('logger').verbose('Services loaded')
}
