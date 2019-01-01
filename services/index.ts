import * as express from 'express'

import { Database } from './database'
import { Mail } from './mail'

import { AuthService as Auth } from './auth'
import { MeetupService as Meetup } from './meetup'
import { MentorService as Mentor } from './mentor'
import { SearchService as Search } from './search'
import { UserService as User } from './user'

import { Services, StandaloneServices } from '../service'

export function init(app: express.Application): void {
  /*
   * Independent services that work alone
   */
  const standaloneServices: StandaloneServices = {
    db: new Database(app),
    mail: new Mail(app),
  }

  /*
   * Dependent services that need other
   * services to work
   **/
  const services: Services  = {
    auth: new Auth(app, standaloneServices),
    meetup: new Meetup(app, standaloneServices),
    mentor: new Mentor(app, standaloneServices),
    search: new Search(app, standaloneServices),
    user: new User(app, standaloneServices),
  }

  app.set('services', services)
  app.get('logger').verbose('Services loaded')
}
