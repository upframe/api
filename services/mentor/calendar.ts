import * as crypto from 'crypto'
import { Slot, Mentor } from '../../types'
import moment from 'moment'
import { calendar_v3 } from 'googleapis'
import { DatabaseService, AnalyticsService } from '../../service'

export async function addSlots(
  slots: Slot[],
  mentor: Mentor,
  googleCalendar: calendar_v3.Calendar,
  database: DatabaseService,
  analytics: AnalyticsService
) {
  const sqlQuery = 'SELECT insertUpdateSlotv2(?, ?, ?, ?, ?)'

  for (const slot of slots) {
    // calculate how many hours are between slot end and slot start
    // and determine how many 2h slots and 1h slots fill this better
    const hourDiff: number = moment(slot.end).diff(slot.start, 'hours')
    let twoHourSlots: number = Math.floor(hourDiff / 2)
    let oneHourSlots: number = Math.floor(hourDiff - twoHourSlots * 2)

    // determine directly how many 30-min slots can fill
    let halfHourSlots: number =
      moment(slot.end)
        .subtract(hourDiff, 'hours')
        .diff(slot.start, 'minutes') / 30

    const it = moment(slot.start)
    const itStart = moment(slot.start)
    let mode: number = 2,
      running: Boolean = true

    while (running) {
      if (twoHourSlots) {
        it.add('2', 'hours')
        twoHourSlots--
      } else if (oneHourSlots) {
        it.add('1', 'hours')
        mode = 1
        oneHourSlots--
      } else if (halfHourSlots) {
        it.add('30', 'minutes')
        mode = 0
        halfHourSlots--
      } else {
        running = false
        break
      }

      const newSlot: Slot = {
        sid: crypto.randomBytes(20).toString('hex'),
        start: itStart.toISOString(),
        end: it.toISOString(),
        // mentorUID: req.jwt.uid,
        mentorUID: mentor.uid,
        recurrency: slot.recurrency,
      }

      // save event in mentor's Google Calendar
      await googleCalendar.events.insert({
        calendarId: mentor.upframeCalendarId,
        requestBody: {
          summary: 'Upframe Free Time Slot',
          start: {
            dateTime: moment(newSlot.start).toISOString(),
          },
          end: {
            dateTime: moment(newSlot.end).toISOString(),
          },
          description: 'Nice slot',
          id: newSlot.sid,
        },
      })

      // set next slot starting time
      if (mode === 2) itStart.add('2', 'hours')
      else if (mode === 1) itStart.add('1', 'hour')
      else if (mode === 0) itStart.add('30', 'minutes')

      // save slot to database
      await database.query(sqlQuery, [
        newSlot.sid,
        newSlot.mentorUID,
        newSlot.start,
        newSlot.end,
        newSlot.recurrency,
      ])

      analytics.mentorAddSlots(mentor, newSlot)
    }
  }
}

export async function deleteSlots(
  slots: string[],
  mentor: Mentor,
  googleCalendar: calendar_v3.Calendar,
  database: DatabaseService,
  analytics: AnalyticsService
) {
  const sqlQuery = 'SELECT deleteSlot(?, ?)'

  for (const slotId of slots) {
    googleCalendar.events.delete({
      calendarId: mentor.upframeCalendarId,
      eventId: slotId,
    })

    await database.query(sqlQuery, [slotId, mentor.uid])
  }

  analytics.mentorRemoveSlots(mentor)
}
