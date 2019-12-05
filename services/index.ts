import { Analytics } from './analytics'
import { Database } from './database'
import { OAuth } from './google'
import { Mail } from './mail'
import { logger } from '../utils'
import { AuthService as Auth } from './auth'
import { MeetupService as Meetup } from './meetup'
import { MentorService as Mentor } from './mentor'
import { SearchService as Search } from './search'
import { UrlService as Url } from './url'
import { UserService as User } from './user'
import { WebhooksService as Webhooks } from './webhooks'

const analytics = new Analytics()
const database = new Database()
const auth = new Auth()
const mail = new Mail()
const oauth = new OAuth()
const meetup = new Meetup()
const mentor = new Mentor()
const search = new Search()
const user = new User()
const url = new Url()
const webhooks = new Webhooks()

export {
  logger,
  analytics,
  database,
  mail,
  oauth,
  auth,
  meetup,
  mentor,
  search,
  user,
  url,
  webhooks,
}
