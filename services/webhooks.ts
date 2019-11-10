import * as express from 'express'

import { database, logger, oauth } from '.'

import { google } from 'googleapis'

export class WebhooksService {
  constructor() {
    logger.verbose('Webhooks service loaded')
  }

  /* Vamos receber em headers x-goog-resource-id o ID do mentor.
   * Nos queremos ir buscar os eventos do mentor no Google Calendar
   * e comparar com os da nossa base de dados.
   */
  public async parseGoogleWebhook(req: APIrequest, res: express.Response) {
    let response: APIresponse = {
      ok: 1,
      code: 200,
    }
    const mentorUid = req.headers['x-goog-resource-id']

    try {
      const userInfoQuery =
        'SELECT googleAccessToken, googleRefreshToken, upframeCalendarId FROM users WHERE uid = ?'
      const mentor = await database.query(userInfoQuery, mentorUid)

      oauth.setCredentials({
        access_token: mentor.googleAccessToken,
        refresh_token: mentor.googleRefreshToken,
      })

      const googleCalendar = google.calendar({
        version: 'v3',
      })

      google.options({
        auth: oauth.OAuthClient,
      })

      const googleResponse = await googleCalendar.events.list({
        calendarId: mentor.upframeCalendarId,
        timeMin: new Date().toISOString(),
        maxResults: 2400, // I believe the max is 2500
        singleEvents: true,
        orderBy: 'startTime',
      })

      const googleEvents = googleResponse.data.items
        ? googleResponse.data.items
        : []

      if (googleEvents.length > 0) {
        const getAllTimeSlotsQuery =
          'SELECT * FROM timeSlots WHERE mentorUID = ?'
        let dbSlots = await database.query(getAllTimeSlotsQuery, mentorUid)
        if (!dbSlots.length) {
          dbSlots = [dbSlots]
        }
        const finalDbSlotsToRemove = dbSlots.filter(slot => {
          return !googleEvents.some(googleEvent => googleEvent.id === slot.sid)
        })
        const deleteTimeSlotQuery = 'SELECT deleteSlot(?, ?)'
        for (const slot of finalDbSlotsToRemove) {
          database.query(deleteTimeSlotQuery, [slot.sid, mentorUid])
        }
      } else {
        const deleteAllTimeSlotsQuery =
          'DELETE FROM timeSlots WHERE mentorUID = ?'
        database.query(deleteAllTimeSlotsQuery, mentorUid)
      }
    } catch (error) {
      response = {
        ok: 0,
        code: 500,
      }
    }
    res.status(response.code).json(response)
  }

  public doesGoogleHaveSlot(googleEvents, slot): boolean {
    // We want to check for every google event if slots is there
    return googleEvents.some(googleEvent => googleEvent.id === slot.id)
  }
}
