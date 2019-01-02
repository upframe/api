import * as crypto from 'crypto'
import * as express from 'express'
import moment from 'moment'

import { Service, StandaloneServices } from '../service'
import { APIerror, APIrequest, APIresponse, Mentor, Slot } from '../types'
import { calendar, sql } from '../utils'

export class MentorService extends Service {
  constructor(app: express.Application, standaloneServices: StandaloneServices) {
    super(app, standaloneServices)

    if (this.logger) this.logger.verbose('Mentor service loaded')
  }

  /**
   * @description Fetches mentor info based on keycode
   * @param {express.Request} req
   * @param {express.Response} res
   */
  public async get(req: express.Request , res: express.Response) {
    let response: APIresponse = {
        ok: 1,
        code: 200,
      }
    let error: APIerror

    try {
      // fetch mentor general info
      let [sqlQuery, params] = sql.createSQLqueryFromJSON('SELECT', 'users',
        {
          keycode: req.params.keycode,
          type: 'mentor',
        })

      const mentorInfo: Mentor = await this.database.query(sqlQuery, params)
      if (!mentorInfo) {
        error = {
          api: true,
          code: 404,
          message: 'Mentor not found',
          friendlyMessage: 'There is no mentor with the provided keycode',
        }

        throw error
      }
      response.mentor = mentorInfo

      // fetch mentor time slots
      sqlQuery = 'SELECT * FROM timeSlots WHERE mentorUID = ?'
      params = [response.mentor.uid]

      let mentorSlots: Slot[] = await this.database.query(sqlQuery, params)
      if (!mentorSlots || !mentorSlots.length) response.mentor.slots = []
      else {
        const verified: string[] = []

        // generate slots from today to 7 days from now
        mentorSlots = calendar.automaticGenerate(mentorSlots, moment().toDate(), moment().add(7, 'd').toDate())

        // filter available slots from all slots
        for (const slot of mentorSlots) {
          if (verified.includes(slot.sid)) continue

          // check if there any meetup refering to this slot and its space in time
          sqlQuery = `SELECT COUNT(*) FROM meetups WHERE sid = ? AND status = "confirmed"
         AND TIMESTAMP(start) BETWEEN TIMESTAMP(?) AND TIMESTAMP(?)`
          if ( await this.database.query(sqlQuery,
            [slot.sid, moment(slot.start).toDate(), moment(slot.start).add(1, 'h').toDate()],
          )['COUNT(*)'] ) {
            // there is a confirmed meetup on that space in time
            // so let's filter all the slots and remove the slot starting
            // at that time
            mentorSlots = mentorSlots.filter((eachSlot) => eachSlot.start.getTime() !== slot.start.getTime())
          }
        }

        response.mentor.slots = mentorSlots
      }
    } catch (err) {
      response = {
        ok: 0,
        code: 400,
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
  public async getRandom(req: express.Request , res: express.Response) {
    let response: APIresponse = {
      ok: 1,
      code: 200,
    }
    let error: APIerror

    try {
      const sqlQuery = 'SELECT name, role, company, bio, tags, keycode, profilePic FROM users ORDER BY RAND() LIMIT 5'

      const mentorList = await this.database.query(sqlQuery)
      if (!mentorList) {
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
        code: 400,
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
   * @description Returns mentor's time slots
   * @param {APIrequest} req
   * @param {express.Response} res
   */
  public async getTimeSlots(req: APIrequest, res: express.Response) {
    let response: APIresponse = {
      ok: 1,
      code: 200,
    }
    let error: APIerror

    try {
      if (!req.jwt || !req.jwt.uid) {
        error = {
          api: true,
          code: 403,
          message: 'Insufficient permissions',
          friendlyMessage: 'There was a problem fetching your timeslots',
        }

        throw error
      }

      const sqlQuery = 'SELECT * FROM timeSlots WHERE mentorUID = ?'
      const startDate = req.query.start
      const endDate = req.query.end

      const slots: Slot[] = await this.database.query(sqlQuery, [req.jwt.uid])
      if (!slots || !slots.length) {
        error = {
          api: true,
          code: 404,
          message: 'Slots not found',
          friendlyMessage: 'This mentor has no slots',
        }

        throw error
      }

      const genSlots = calendar.automaticGenerate(slots).filter((slot) => {
        let ok = true
        // verify if slot start is after the defined minimum start Date
        if (new Date(startDate)) {
          if (new Date(startDate).getTime() > new Date(slot.start).getTime()) ok = false
        }
        // verify if slot end is before the defined maximum end Date
        if (new Date(endDate)) {
          if (new Date(endDate).getTime() < new Date(slot.end).getTime()) ok = false
        }
        return ok
      })

      response.slots = genSlots
    } catch (err) {
      response = {
        ok: 0,
        code: 400,
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
   * @description Updates and creates mentor's time slots
   * @param {APIrequest} req
   * @param {express.Response} res
   */
  public async updateTimeSlots(req: APIrequest, res: express.Response) {
    let response: APIresponse = {
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

      // delete events
      if (deletedSlots) {
        sqlQuery = 'SELECT deleteSlot(?, ?)'
        response.deleteOK = 1

        for (const slotID of deletedSlots) {
          try {
            await this.database.query(sqlQuery, [slotID, req.jwt.uid])

          } catch (err) {
            response.ok = 0
            response.code = 400
            response.message = 'One or more time slots couldn\'t be deleted'
            response.deleteOK = 0
          }
        }
      }

      // try to update events
      if (updatedSlots) {
        sqlQuery = 'SELECT insertUpdateSlot(?, ?, ?, ?, ?)'
        response.updateOK = 1

        for (const slot of updatedSlots) {
          try {
            if (!slot.sid) slot.sid = crypto.randomBytes(20).toString('hex')

            /** let's figure out if the slot is +1h
             *  so we can divide it into multiple slots
             */
            const timeDiff: number = new Date(slot.end).getTime() - new Date(slot.start).getTime()
            let hourDiff = Math.floor(Math.abs(timeDiff) / 3.6e6)

            // divide slots
            if (hourDiff > 1) {
              // iterator
              let slotStart = new Date(slot.start)
              while (hourDiff--) {
                updatedSlots.push({
                  end: new Date(new Date(slotStart).setHours(new Date(slotStart).getHours() + 1)),
                  mentorUID: req.jwt.uid,
                  recurrency: slot.recurrency,
                  sid: crypto.randomBytes(20).toString('hex'),
                  start: slotStart,
                })

                // next event starts at the end of the previous one
                slotStart = new Date(new Date(slotStart).setHours(new Date(slotStart).getHours() + 1))
              }
              continue
            } else {
              await this.database.query(sqlQuery, [slot.sid, req.jwt.uid, slot.start, slot.end, slot.recurrency])
            }
          } catch (err) {
            response.ok = 0
            response.code = 400
            response.message = 'One or more time slots couldn\'t be updated'
            response.updateOK = 0
          }
        }
      }
    } catch (err) {
      response = {
        ok: 0,
        code: 400,
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
  public async verify(req: express.Request , res: express.Response) {
    let response: APIresponse = {
        ok: 1,
        code: 200,
      }
    let error: APIerror

    try {
      const check = req.query.keycode ? 'keycode' : 'uniqueid'
      const value = req.query.keycode ? `"${req.query.keycode}"` : req.query.uniqueid
      const sqlQuery = `SELECT * FROM onboarding WHERE ${check} = ${value}`

      const onboardingInvite = await this.database.query(sqlQuery)
      if (!onboardingInvite) {
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
        code: 400,
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
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }

  return a.slice(0, 2)
}
