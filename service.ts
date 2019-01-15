import * as express from 'express'
import * as winston from 'winston'

import { OAuth2Client } from 'google-auth-library'
import { AccountTypes, APIerror, APIrequest, date, JWTpayload } from './types'

export class Service {
  public database: DatabaseService
  public logger: winston.Logger
  public mail: MailService
  public oauth: OAuthService

  constructor(app: express.Application, standaloneServices: StandaloneServices) {
    // inject independent services
    this.database = standaloneServices.db
    this.mail = standaloneServices.mail
    this.oauth = standaloneServices.oAuth

    // inject logger
    this.logger = app.get('logger')

    if (!process.env.CONNECT_PK) this.logger.warn('Env vars not set')
  }
}

export interface Services {
  auth: AuthService
  meetup: MeetupService
  mentor: MentorService
  search: SearchService
  user: UserService
  url: UrlService
}

export interface AuthService {
  verifyToken(req: APIrequest, res: express.Response, next: express.NextFunction): void
  isMentor(req: APIrequest, res: express.Response, next: express.NextFunction): void
  createToken(user: JWTpayload , accountType: AccountTypes): string
  login(req: express.Request, res: express.Response): void
  register(req: express.Request, res: express.Response): void
  resetPassword(req: express.Request, res: express.Response): void
  changeEmail(req: APIrequest, res: express.Response): void
  getGoogleUrl(req: APIrequest, res: express.Response): void
  receiveOauthCode(req: APIrequest, res: express.Response): void
}

export interface MeetupService {
  get(req: APIrequest, res: express.Response): void
  create(req: APIrequest, res: express.Response): void
  confirm(req: APIrequest, res: express.Response): void
  refuse(req: APIrequest, res: express.Response): void
}

export interface MentorService {
  get(req: express.Request , res: express.Response): void
  getRandom(req: express.Request , res: express.Response): void
  getTimeSlots(req: express.Request , res: express.Response): void
  updateTimeSlots(req: express.Request , res: express.Response): void
  verify(req: express.Request , res: express.Response): void
}

export interface SearchService {
  quick(req: express.Request, res: express.Response): void
  full(req: express.Request, res: express.Response): void
  tags(req: express.Request, res: express.Response): void
}

export interface UserService {
  get(req: express.Request, res: express.Response): void
  update(req: express.Request, res: express.Response): void
  image(url, userEmail, res): void
}

export interface UrlService {
  getRealUrl(req: express.Request, res: express.Response): void
}

export interface StandaloneServices {
  db: DatabaseService
  mail: MailService
  oAuth: OAuthService
}

export interface DatabaseService {
  query(sqlQuery: string, parameters?: string | date[]): Promise<any>
}

export interface MailService {
  getTemplate(name: string, args: any): string
  sendPasswordReset(toAddress: string): Promise<number>
  sendEmailChange(toAddress: string): Promise<number>
  sendMeetupInvitation(meetupID: string): Promise<APIerror | number>
  sendMeetupConfirmation(meetupID: string): Promise<(APIerror | number)>
}

export interface OAuthService {
  OAuthClient: OAuth2Client

  generateAuthUrl(config: object)
  getToken(code: string)
  setCredentials(credentials: object)
  refreshAccessToken()
}
