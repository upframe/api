import * as crypto from 'crypto'
import * as express from 'express'
import moment from 'moment'

import { service } from '../service'
import { APIerror, APIrequest, APIresponse, Mentor, Slot } from '../types'
import { calendar, sql } from '../utils'

export class MentorService extends service {
  constructor(app: express.Application) {
    super(app)

    if(this.logger) this.logger.verbose('Mentor service loaded')
  }

  async get(req: express.Request , res: express.Response) {
    let [sqlQuery, params] = sql.createSQLqueryFromJSON('SELECT', 'users', { keycode: req.params.keycode, type: 'mentor'}),
      response: APIresponse = {
        ok: 1,
        code: 200,
      },
      err: APIerror
    
    try {
      let [rows]: any[] = await this.database.query(sqlQuery, params)
      if(!rows.length) throw 404
      else response.mentor = rows[0]

      if(!response.mentor) {
        err = {
          code: 404,
          message: 'Mentor not found',
        }
        throw err 
      }
    
      let sqlQuery2 = 'SELECT * FROM timeSlots WHERE mentorUID = ?',
        slots: Slot[],
        verified: string[] = []
      
      // fetch slots
      slots = (await this.database.query(sqlQuery2, [response.mentor.uid]))[0]
      if(!slots.length) {
        err = {
          code: 404,
          message: 'Slots not found',
          friendlyMessage: 'This mentor has no time slots'
        }
        throw err
      }

      // generate slots from today to 7 days from now
      slots = calendar.automaticGenerate(slots, moment().toDate(), moment().add(7, 'd').toDate())
      
      // filter available slots from all slots
      for(let slot of slots) {
        if(verified.includes(slot.sid)) continue;
        
        // check if there any meetup refering to this slot and its space in time
        let sqlQuery = 'SELECT COUNT(*) FROM meetups WHERE sid = ? AND status = "confirmed" AND TIMESTAMP(start) BETWEEN TIMESTAMP(?) AND TIMESTAMP(?)'
        if((await this.database.query(sqlQuery, [slot.sid, moment(slot.start).toDate(), moment(slot.start).add(1, 'h').toDate()]))[0][0]['COUNT(*)']) {
          // there is a confirmed meetup on that space in time
          // so let's filter all the slots and remove the slot starting
          // at that time
          slots = slots.filter(eachSlot => eachSlot.start.getTime() != slot.start.getTime())
        }
      }

      response.mentor.slots = slots
    } catch (err) {
      response.ok = 0
      response.code = 400

      if(err.errorCode === 404) {
        response.code = err
        response.message = 'Mentor not found'
      }

    }

    res.status(response.code).json(response)
  }

  async getRandom(req: express.Request , res: express.Response) {
    let sql = 'SELECT name, role, company, bio, tags, keycode, profilePic FROM users ORDER BY RAND() LIMIT 5',
      response: APIresponse = {
        ok: 1,
        code: 200
      }

    try {
      let [rows] = await this.database.query(sql)
      if(!rows.length) throw 404

      response.mentors = shuffle(rows)
    } catch (err) {
      response.ok = 0
      response.code = 400

      if(err === 404) {
        response.code = err
      }
    }

    res.status(response.code).json(response)
  }

  /**
   * @description Returns mentor's time slots
   * @param {APIrequest} req 
   * @param {Response} res 
   */
  async getTimeSlots(req: APIrequest, res: express.Response) {
    let response: APIresponse = {
      ok: 1,
      code: 200
    }

    try {
      if(!req.jwt || !req.jwt.uid) throw 403

      let startDate = req.query.start,
        endDate = req.query.end,
        sqlQuery = 'SELECT * FROM timeSlots WHERE mentorUID = ?'

      let [slots] = await this.database.query(sqlQuery, [req.jwt.uid])
      let genSlots = calendar.automaticGenerate(slots).filter(slot => {
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
      response.ok = 0
      response.code = 400

      if(err.APIerr) {
        response.code = err.errorCode
        response.message = err.errorMessage
      }
    }
    
    res.status(response.code).json(response)
  }

  /**
   * @description Updates and creates mentor's time slots
   * @param {APIrequest} req 
   * @param {Response} res 
   */
  async updateTimeSlots(req: APIrequest, res: express.Response) {
    let deletedSlots: string[] = req.body.deleted,
      updatedSlots: Slot[] = req.body.updated,
      sqlQuery = '',
      response: APIresponse = {
        ok: 1,
        code: 200
      },
      err: APIerror

    try {
      if(!req.jwt || !req.jwt.uid) {
        err = {
          code: 403,
          message: 'Forbidden',
          friendlyMessage: 'There was a problem updating your timeslots'
        }

        throw err
      } 

      // delete events
      if (deletedSlots) {
        sqlQuery = 'SELECT deleteSlot(?, ?)'
        response.deleteOK = 1

        for (let slotID of deletedSlots) {
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

        for (let slot of updatedSlots) {
          try {
            if (!slot.sid) slot.sid = crypto.randomBytes(20).toString('hex')

            /** let's figure out if the slot is +1h
             *  so we can divide it into multiple slots
             */
            let timeDiff: number = new Date(slot.end).getTime() - new Date(slot.start).getTime()
            let hourDiff = Math.floor(Math.abs(timeDiff) / 3.6e6)
            
            // divide slots 
            if (hourDiff > 1) {
              // iterator
              let slotStart = new Date(slot.start)
              while (hourDiff--) {
                updatedSlots.push({
                  sid: crypto.randomBytes(20).toString('hex'),
                  mentorUID: req.jwt.uid,
                  start: slotStart,
                  end: new Date(new Date(slotStart).setHours(new Date(slotStart).getHours() + 1)),
                  recurrency: slot.recurrency
                })

                // next event starts at the end of the previous one
                slotStart = new Date(new Date(slotStart).setHours(new Date(slotStart).getHours() + 1))
              }
              continue;
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
    } catch(err) {

    }

    res.status(response.code).json(response)
  }

  async verify(req: express.Request , res: express.Response) {
    let check = req.query.keycode ? 'keycode' : 'uniqueid',
      value = req.query.keycode ? `"${req.query.keycode}"` : req.query.uniqueid,
      sql = `SELECT * FROM onboarding WHERE ${check} = ${value}`,
      response: APIresponse = {
        ok: 1,
        code: 200
      }

    try {
      let [rows] = await this.database.query(sql)
      if(!rows.length) throw 404
    } catch (err) {
      response.ok = 0
      response.code = 400
    }
    res.status(response.code).json(response)
  }

}

function shuffle(a: any[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a.slice(0, 2);
}