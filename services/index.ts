import * as express from 'express'

import { Database } from './database'
import { Mail } from './mail'

import { AuthService as Auth } from './auth'
import { MeetupService as Meetup } from './meetup'
import { MentorService as Mentor } from './mentor'
import { SearchService as Search } from './search'
import { UserService as User } from './user'

import { Services } from '../service'

export function init(app: express.Application): void {
  /*
   * Independent services that work alone
   */
  app.set('db', new Database(app))
  app.set('mail', new Mail(app))

  /*
   * Dependent services that need other
   * services to work
   **/
  const services: Services  = {
    auth: new Auth(app),
    meetup: new Meetup(app),
    mentor: new Mentor(app),
    search: new Search(app),
    user: new User(app),
  }

  app.set('services', services)
  app.get('logger').verbose('Services loaded')
}
