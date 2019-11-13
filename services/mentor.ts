import * as express from 'express'
import moment from 'moment'

import { database, mail, oauth, logger } from '.'
import { sql, format, calendar } from '../utils'

export class MentorService {
  constructor() {
    logger.verbose('Mentor service loaded')
  }

  /**
   * @description Fetches mentor info based on keycode
   * @param {express.Request} req
   * @param {express.Response} res
   */
  public async get(req: express.Request, res: express.Response) {
    let response: ApiResponse = {
      ok: 1,
      code: 200,
    }
    let error: APIerror

    try {
      let sqlQuery: string
      let params: string[] | string | date[]
      let result

        // fetch mentor general info
      ;[sqlQuery, params] = sql.createSQLqueryFromJSON('SELECT', 'users', {
        keycode: req.params.keycode,
        type: 'mentor',
      })

      const mentorInfo: Mentor = await database.query(sqlQuery, params)
      if (!Object.keys(mentorInfo).length) {
        error = {
          api: true,
          code: 404,
          message: 'Mentor not found',
          friendlyMessage: 'There is no mentor with the provided keycode',
        }

        throw error
      }
      response.mentor = mentorInfo

      // query profile pictures
      response.mentor.pictures = format.pictures(
        await database.query(
          ...sql.createSQLqueryFromJSON('SELECT', 'profilePictures', {
            uid: mentorInfo.uid,
          })
        )
      )

      // fetch mentor time slots
      sqlQuery = 'SELECT * FROM timeSlots WHERE mentorUID = ?'
      params = [response.mentor.uid]

      let mentorSlots = await database.query(sqlQuery, params)

      if (mentorSlots.sid) {
        response.mentor.slots = [mentorSlots]
      } else if (!Array.isArray(mentorSlots)) {
        response.mentor.slots = []
      } else {
        const verified: string[] = []

        // generate slots from today to 7 days from now
        mentorSlots = calendar.automaticGenerate(
          mentorSlots,
          moment()
            .utc()
            .toDate(),
          moment()
            .utc()
            .add(7, 'd')
            .toDate()
        )

        // filter available slots from all slots
        for (const slot of mentorSlots) {
          if (verified.includes(slot.sid)) continue

          // check if there any meetup refering to this slot and its space in time
          sqlQuery = `SELECT COUNT(*) FROM api.meetups WHERE sid = ? AND status = "confirmed"
            AND TIMESTAMP(start) BETWEEN TIMESTAMP(?) AND TIMESTAMP(?)`
          params = [
            slot.sid,
            moment.utc(slot.start).toISOString(),
            moment
              .utc(slot.start)
              .add(1, 'h')
              .toISOString(),
          ]
          result = await database.query(sqlQuery, params)
          if (result['COUNT(*)']) {
            // there is a confirmed meetup on that space in time
            // so let's filter all the slots and remove the slot starting
            // at that time
            mentorSlots = mentorSlots.filter(
              eachSlot =>
                moment(eachSlot.start).unix() !== moment(slot.start).unix()
            )
          }
        }

        // Filter slots that are taking place in the future
        mentorSlots = mentorSlots.filter(slot => {
          return new Date() < moment(slot.start).toDate()
        })

        // Sort the slots chronologically
        mentorSlots.sort((a, b) => {
          if (moment(a.start).toDate() < moment(b.start).toDate()) {
            return -1
          } else if (moment(a.start).toDate() > moment(b.start).toDate()) {
            return 1
          }

          return 0
        })

        response.mentor.slots = mentorSlots
      }
    } catch (err) {
      response = {
        ok: 0,
        code: 500,
      }

      if (err.api) {
        response.code = err.code
        response.message = err.message
        response.friendlyMessage = err.friendlyMessage
      }
    }

    res.status(response.code).json(response)
  }

  /**
   * @description Returns all mentors on the platform
   * @param {express.Request} req Express request
   * @param {express.Response} res Express response
   */
  public async getAll(req: express.Request, res: express.Response) {
    let response: ApiResponse = {
      ok: 1,
      code: 200,
    }
    let error: APIerror

    try {
      let sqlQuery = `SELECT users.uid, name, role, company, bio, tags, keycode, profilePic, profilePictures.*
        FROM users
        LEFT JOIN profilePictures ON users.uid = profilePictures.uid
        WHERE type = 'mentor' AND newsfeed = 'Y'
        ORDER BY RAND()`

      const mentorList = await database.query(sqlQuery)
      if (!Object.keys(mentorList).length) {
        error = {
          api: true,
          code: 404,
          message: 'Mentors not found',
          friendlyMessage: 'Mentors not found',
        }

        throw error
      }

      if (req.query.slots) {
        for (const index in mentorList) {
          if (mentorList[index]) {
            // fetch mentor time slots
            sqlQuery = 'SELECT * FROM timeSlots WHERE mentorUID = ?'
            const params = [mentorList[index].uid]

            let mentorSlots = await database.query(sqlQuery, params)

            if (mentorSlots.sid) {
              mentorList[index].slots = [mentorSlots]
            } else if (!Array.isArray(mentorSlots)) {
              mentorList[index].slots = []
            } else {
              // Filter slots that are taking place in the future
              mentorSlots = mentorSlots.filter(slot => {
                return new Date() < moment(slot.start).toDate()
              })

              mentorList[index].slots = mentorSlots
            }
          }
        }
      }

      // format picture structure in response
      response.mentors = mentorList.map(format.mentor)
    } catch (err) {
      response = {
        ok: 0,
        code: 500,
      }

      if (err.api) {
        response.code = err.code
        response.message = err.message
        response.friendlyMessage = err.friendlyMessage
      }
    }

    res.status(response.code).json(response)
  }

  /**
   * @description Fetches random mentors (max: 5)
   * @param {express.Request} req Express request
   * @param {express.Response} res Express response
   */
  public async getRandom(req: express.Request, res: express.Response) {
    let response: ApiResponse = {
      ok: 1,
      code: 200,
    }
    let error: APIerror

    try {
      const sqlQuery =
        "SELECT name, role, company, bio, tags, keycode, profilePic FROM users WHERE type = 'mentor' ORDER BY RAND() LIMIT 5"

      const mentorList = await database.query(sqlQuery)
      if (!Object.keys(mentorList).length) {
        error = {
          api: true,
          code: 404,
          message: 'Mentors not found',
          friendlyMessage: 'Mentors not found',
        }

        throw error
      }

      response.mentors = shuffle(mentorList)
    } catch (err) {
      response = {
        ok: 0,
        code: 500,
      }

      if (err.api) {
        response.code = err.code
        response.message = err.message
        response.friendlyMessage = err.friendlyMessage
      }
    }

    res.status(response.code).json(response)
  }

  public async getTimeSlots({ jwt, query }: ApiRequest, res: express.Response) {
    if (!jwt || !jwt.uid)
      return res.status(403).json({ message: 'UNAUTHORIZED' })

    const makeDate = (date: string | number | Date, alternative: Date): Date =>
      !date ? alternative : date instanceof Date ? date : new Date(date)

    const now = new Date()
    let slots = []
    try {
      slots = await calendar.getSlots(
        jwt.uid,
        makeDate(query && query.start, now),
        makeDate(query && query.end, new Date(now.setMonth(now.getMonth() + 1)))
      )
      return res.json({ slots })
    } catch (err) {
      console.warn(err)
      return res.sendStatus(500)
    }
  }

  /**
   * @description Updates and creates mentor's time slots
   * @param {ApiRequest} req
   * @param {express.Response} res
   */
  public async updateTimeSlots(req: ApiRequest, res: express.Response) {
    let response: ApiResponse = {
      ok: 1,
      code: 200,
    }
    let error: APIerror

    try {
      if (!req.jwt || !req.jwt.uid) {
        error = {
          api: true,
          code: 403,
          message: 'Forbidden',
          friendlyMessage: 'There was a problem updating your timeslots',
        }

        throw error
      }

      const deletedSlots: string[] = req.body.deleted
      const updatedSlots: Slot[] = req.body.updated
      let sqlQuery: string
      let params: string | string[]

        // fetch mentor info
      ;[sqlQuery, params] = sql.createSQLqueryFromJSON('SELECT', 'users', {
        uid: req.jwt.uid,
      })
      const mentor: Mentor = await database.query(sqlQuery, params)

      // let's refresh google access token if the mentor has synced
      if (mentor.googleAccessToken || mentor.googleRefreshToken) {
        oauth.setCredentials({
          access_token: mentor.googleAccessToken,
          refresh_token: mentor.googleRefreshToken,
        })

        const tokens = await oauth.refreshAccessToken()
        if (!tokens.credentials.access_token) {
          error = {
            api: true,
            code: 500,
            message: 'Could not get updated access token',
            friendlyMessage: "There was an error fetching the user's info",
          }
          throw error
        }
      }

      // delete events
      if (deletedSlots.length) {
        response.deleteOK = 1
        try {
          calendar.deleteSlots(deletedSlots, mentor)
        } catch (err) {
          console.warn(err)
          response.ok = 0
          response.code = 500
          response.message = "One or more time slots couldn't be deleted"
          response.deleteOK = 0
        }
      }

      // try to update events
      if (updatedSlots.length) {
        response.updateOK = 1
        try {
          await calendar.addSlots(updatedSlots, mentor)
        } catch (err) {
          console.warn(err)
          response.ok = 0
          response.code = 500
          response.message = "One or more time slots couldn't be updated"
          response.updateOK = 0
        }
      }
    } catch (err) {
      response = {
        ok: 0,
        code: 500,
        deleteOK: 0,
        updateOK: 0,
      }

      if (err.api) {
        response.code = err.code
        response.message = err.message
        response.friendlyMessage = err.friendlyMessage
      }
    }

    res.status(response.code).json(response)
  }

  /**
   * @description Verify if
   * @param {express.Request} req
   * @param {express.Response} res
   */
  public async verify(req: express.Request, res: express.Response) {
    let response: ApiResponse = {
      ok: 1,
      code: 200,
    }
    let error: APIerror

    try {
      const check = req.query.keycode ? 'keycode' : 'uniqueid'
      const value = req.query.keycode
        ? `"${req.query.keycode}"`
        : req.query.uniqueid
      const sqlQuery = `SELECT * FROM onboarding WHERE ${check} = ${value}`

      const onboardingInvite = await database.query(sqlQuery)
      if (!Object.keys(onboardingInvite).length) {
        error = {
          api: true,
          code: 404,
          message: 'Onboarding invite not found',
          friendlyMessage: 'There is no onboarding invite with this unique ID',
        }

        throw error
      }
    } catch (err) {
      response = {
        ok: 0,
        code: 500,
      }

      if (err.api) {
        response.code = err.code
        response.message = err.message
        response.friendlyMessage = err.friendlyMessage
      }
    }

    res.status(response.code).json(response)
  }

  /**
   * @description Request time slots to the mentor
   * @param {express.Request} req
   * @param {express.Response} res
   */
  public async request(req: express.Request, res: express.Response) {
    let response: ApiResponse = {
      ok: 1,
      code: 200,
    }
    let error: APIerror

    try {
      const mentor = await database.query(
        'SELECT name, email FROM users WHERE keycode = ?',
        req.body.keycode
      )
      if (!mentor.email || !mentor.name) {
        error = {
          api: true,
          code: 404,
          message: 'Keycode returned no information',
          friendlyMessage: 'No information found for this mentor',
        }

        throw error
      }

      const result = await mail.sendTimeSlotRequest(
        mentor.email,
        mentor.name,
        req.body.name,
        req.body.email,
        req.body.message
      )

      if (result !== 0) {
        error = {
          api: true,
          code: 500,
          message: 'Error while sending email',
          friendlyMessage: 'Error while sending email',
        }
        throw error
      }
    } catch (err) {
      response = {
        ok: 0,
        code: 500,
      }

      if (err.api) {
        response.code = err.code
        response.message = err.message
        response.friendlyMessage = err.friendlyMessage
      }
    }

    res.status(response.code).json(response)
  }
}

function shuffle(a: any[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }

  return a.slice(0, 2)
}
