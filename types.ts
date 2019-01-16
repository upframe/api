import { Request } from 'express'

/* API types */
export interface APIrequest extends Request {
  busboy?: any
  body: APIRequestBody
  jwt?: JWTpayload
}

export interface APIRequestBody {
  /* IDs */
  mid?: string
  sid?: string
  uid?: string

  email?: string
  keycode?: string
  password?: string
  name?: string

  start?: date
  end?: date

  menteeUID?: string
  mentorUID?: string
  location?: string

  token?: string

  deleted: string[]
  updated: Slot[]

  code?: string
}

export interface JWTpayload {
  aud?: string
  email?: string
  uid?: string
}

export interface APIresponse {
  code: number
  ok: number
  message?: string
  friendlyMessage?: string

  token?: string
  updateOK?: number
  deleteOK?: number

  meetup?: Meetup
  meetups?: Meetup[]
  mentor?: Mentor
  mentors?: Mentor[]
  user?: User
  slot?: Slot
  slots?: Slot[]

  search?: {
    companies?: any[],
    expertise?: any[],
    people?: any[],
  }

  url?: string

  refreshToken?: string
}

export interface APIerror {
  api: boolean
  code: number
  message: string
  friendlyMessage?: string
}

export type date = string | Date

/* Generic types */
export interface Meetup {
  mid: string
  sid: string
  menteeUID: string
  mentorUID: string
  location: string
  status: string
  start: string | Date
}

export interface Account {
  uid: string
  name: string
  email: string
  password: string

  googleAccessToken?: string
  googleRefreshToken?: string
}

export enum AccountTypes {
  'user',
  'mentor',
}

export interface Mentor extends Account {
  favoritePlaces?: string
  keycode?: string
  slots?: Slot[]
  type: string
}

export interface User extends Account {
  type: AccountTypes
}

export interface Slot {
  sid: string
  mentorUID: string
  start: Date
  end: Date
  recurrency: string
}

/* Mailer */
export interface Email {
  from: string
  to: string
  subject: string
  html?: string
}
