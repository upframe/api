import * as crypto from 'crypto'
import moment from 'moment'
import { google, calendar_v3 } from 'googleapis'
import { database, analytics, oauth } from '../services'
import * as sql from './sql'

let googleCalendar: calendar_v3.Calendar

export function init() {
  googleCalendar = google.calendar({
    version: 'v3',
  })
  google.options({
    auth: oauth.OAuthClient,
  })
}

export async function addSlots(slots: Slot[], mentor: Mentor) {
  if (!slots || slots.length === 0) return
  if (
    slots
      .flatMap(({ start, end }) => [start, end])
      .some(date => new Date(date).toISOString() !== date)
  )
    throw Error('dates must be ISO strings')

  slots = slots.map(({ start, end, ...slot }) => ({
    sid: crypto.randomBytes(20).toString('hex'),
    start,
    end,
    mentorUID: mentor.uid,
    recurrency: slot.recurrency || 'UNIQUE',
  }))

  await Promise.all([
    database.query(...sql.createSQLqueryFromJSON('INSERT', 'timeSlots', slots)),
    ...(mentor.googleAccessToken
      ? [
          slots.map(slot =>
            googleCalendar.events.insert({
              calendarId: '',
              requestBody: {
                start: { dateTime: slot.start as string },
                end: { dateTime: slot.end as string },
                description: '',
                id: '',
              },
            })
          ),
        ]
      : []),
    ...slots.map(slot => analytics.mentorAddSlots(mentor, slot)),
  ])
}

export async function deleteSlots(slots: string[], mentor: Mentor) {
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

export async function getSlots(mentorUid: string, start: Date, end: Date) {
  const slots = await database.query(
    'SELECT * FROM timeSlots WHERE mentorUID = ?',
    [mentorUid]
  )
  return (!slots ? [] : Array.isArray(slots) ? slots : [slots]).filter(
    ({ start: sStart, end: sEnd }) =>
      new Date(sStart).getTime() >= start.getTime() &&
      new Date(sEnd).getTime() <= end.getTime()
  )
}

/**
 * @description returns date difference given the first, the last and the frequency of events/slots
 * @param {any} maxDate
 * @param {String} diffUnit - days, weeks, months, years, etc
 */
export function dateDiff(eventStart: date, maxDate: date, diffUnit: any) {
  let num = 0

  try {
    if (maxDate instanceof Date) {
      num = Math.abs(moment(maxDate).diff(moment(eventStart), diffUnit))
    } else if (typeof maxDate === 'number') {
      num = maxDate
    } else throw new Error('Invalid maximum date')
  } catch (err) {
    return err
  }

  return num
}

/**
 * @description Generates daily slots/events until the date specified or
 * the number specified of daily events
 * @param {Slot} slot
 * @param {Date} start minimum slot/event start time
 * @param {Date} end maximum slot/event end time
 */

export function genDaily(slot: Slot, start: date, end: date): Slot[] {
  const num = dateDiff(slot.start, new Date(end), 'days')
  let i = 0
  let arr: Slot[] = []

  while (i <= num) {
    const newSlot = Object.assign({}, slot)

    // increment day
    newSlot.start = moment(slot.start)
      .add(i, 'd')
      .toDate()
    newSlot.end = moment(slot.end)
      .add(i, 'd')
      .toDate()

    arr.push(newSlot)
    i++
  }

  arr = arr.filter((item: Slot) => {
    return new Date(item.start).getTime() >= new Date(start).getTime()
  })
  return arr
}

/**
 * @description Generates weekly slots/events until the date specified or
 * the number specified of weekly events
 * @param {Slot} slot
 * @param {Date} start minimum slot/event start time
 * @param {Date} end maximum slot/event end time
 */
export function genWeekly(slot: Slot, start: date, end: date): Slot[] {
  const num = dateDiff(slot.start, new Date(end), 'w')
  let i = 0
  const arr: Slot[] = []

  while (i <= num) {
    const newSlot = Object.assign({}, slot)
    newSlot.start = moment(slot.start)
      .add(i, 'w')
      .toDate()
    newSlot.end = moment(slot.end)
      .add(i, 'w')
      .toDate()

    arr.push(newSlot)
    i++
  }

  return arr.filter(item => {
    return new Date(item.start).getTime() >= new Date(start).getTime()
  })
}

/**
 * @description Generates monthly slots/events until the date specified or
 * the number specified of mothly events
 * @param {Slot} slot
 * @param {Date} start minimum slot/event start time
 * @param {Date} end maximum slot/event end time
 */
export function genMonthly(slot: Slot, start: date, end: date): Slot[] {
  const num = dateDiff(slot.start, new Date(end), 'M')
  let i = 0
  const arr: Slot[] = []

  while (i <= num) {
    const newSlot = Object.assign({}, slot)
    newSlot.start = moment(slot.start)
      .add(i, 'M')
      .toDate()
    newSlot.end = moment(slot.end)
      .add(i, 'M')
      .toDate()

    arr.push(newSlot)
    i++
  }

  return arr.filter(item => {
    return new Date(item.start).getTime() >= new Date(start).getTime()
  })
}

/**
 *
 * @param {Array<Slot>} slots slots array
 * @param {Date} startDate minimum slot/event start time
 * @param {Date} limitDate maximum slot/event end time
 */
export function automaticGenerate(
  slots: Slot[],
  startDate?: date | undefined,
  limitDate?: date
): Slot[] {
  let arr: Slot[] = []

  if (!startDate) {
    startDate = moment()
      .utc()
      .toDate()
  }

  if (!limitDate || moment().unix() > moment(limitDate).unix()) {
    limitDate = moment()
      .utc()
      .add('months', 1)
      .startOf('month')
      .toDate()
  }

  for (const slot of slots) {
    switch (slot.recurrency) {
      case 'Daily':
        arr = arr.concat(genDaily(slot, startDate, limitDate))
        break
      case 'Weekly':
        arr = arr.concat(genWeekly(slot, startDate, limitDate))
        break
      case 'Monthly':
        arr = arr.concat(genMonthly(slot, startDate, limitDate))
        break
      case 'Unique':
        arr = arr.concat(slot)
        break
    }
  }

  return arr
}
