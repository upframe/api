import * as express from 'express'

import { Analytics } from './analytics'
import { Database } from './database'
import { OAuth } from './google'
import { Mail } from './mail'

import { AuthService as Auth } from './auth'
import { MeetupService as Meetup } from './meetup'
import { MentorService as Mentor } from './mentor'
import { SearchService as Search } from './search'
import { UrlService as Url } from './url'
import { UserService as User } from './user'
import { WebhooksService as Webhooks } from './webhooks'

import { Services, Service } from '../service'

export function init(app: express.Application): void {
  /*
   * Independent services that work alone
   */
  Service.logger = app.get('logger')
  Service.analytics = new Analytics()
  Service.database = new Database()
  Service.mail = new Mail()
  Service.oauth = new OAuth()

  /*
   * Dependent services that need other
   * services to work
   **/
  const services: Services = {
    auth: new Auth(),
    meetup: new Meetup(),
    mentor: new Mentor(),
    search: new Search(),
    user: new User(),
    url: new Url(),
    webhooks: new Webhooks(),
  }

  app.set('services', services)
  app.get('logger').verbose('Services loaded')
}
