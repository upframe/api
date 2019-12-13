type request = import('express').Request

/* API types */
interface ApiRequest extends request {
  busboy?: any
  body: ApiRequestBody
  jwt?: JWTpayload
}

interface ApiRequestBody {
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
  message?: string

  token?: string

  deleted: string[]
  updated: Slot[]

  code?: string

  googleAccessToken?: string
  googleRefreshToken?: string
  upframeCalendarId?: string

  developerPass?: string
  type?: string

  timeoffset?: number
}

interface JWTpayload {
  aud?: string
  email?: string
  uid?: string
}

interface ApiResponse {
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
    companies?: any[]
    expertise?: any[]
    people?: any[]
  }

  url?: string

  wau?: object[]

  refreshToken?: string
}

interface APIerror {
  api: boolean
  code: number
  message: string
  friendlyMessage?: string
}

type date = string | Date

/* Generic types */
interface Meetup {
  mid: string
  sid: string
  menteeUID: string
  mentorUID: string
  message?: string
  location: string
  status: string
  start: string | Date
}

interface Account {
  uid: string
  name: string
  email: string
  password: string
  pictures?: { [size: string]: { [type: string]: string } }

  googleAccessToken?: string
  googleRefreshToken?: string

  timeoffset?: number

  emailNotifications: boolean | Buffer
  availabilityReminder: 'monthly' | 'weekly' | 'off'
}

interface Mentor extends Account {
  favoritePlaces?: string
  upframeCalendarId?: string
  keycode?: string
  slots?: Slot[]
  newsfeed?: string
}

interface User extends Account {
  type: 'user' | 'mentor'
  upframeCalendarId?: string
}

interface Slot {
  sid: string
  mentorUID: string
  start: Date | string
  end: Date | string
  recurrency: string
}

/* Mailer */
interface Email {
  from: string
  to: string
  subject: string
  html?: string
}

/* Analytics */
interface AnalyticsEvent {
  uid: string
  time: Date | string
}

interface AnalyticsResponseRecord {
  // Day String
  day?: string

  // Weekly Active Users
  wau?: number | null

  // Weekly Active Mentors (Mentors who added slots)
  wam?: number | null

  // Array of users UIDs
  users?: string[]
}

interface AnalyticsResponse {
  ok?: number

  // Weekly Active Users
  wau: AnalyticsResponseRecord[]
}
