import * as express from 'express'

import { Service, StandaloneServices } from '../service'
import { APIerror, APIrequest, APIresponse, User } from '../types'

import { google } from 'googleapis'

export class WebhooksService extends Service {

  constructor(app: express.Application, standaloneServices: StandaloneServices) {
    super(app, standaloneServices)
    if (this.logger) this.logger.verbose('Webhook service loaded')
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
      const userInfoQuery = 'SELECT googleAccessToken, googleRefreshToken, upframeCalendarId FROM users WHERE uid = ?'
      const mentor = await this.database.query(userInfoQuery, mentorUid)

      this.oauth.setCredentials({
        access_token: mentor.googleAccessToken,
        refresh_token: mentor.googleRefreshToken,
      })

      const googleCalendar = google.calendar({
        version: 'v3',
      })

      google.options({
        auth: this.oauth.OAuthClient,
      })

      const res = await googleCalendar.events.list({
        calendarId: mentor.upframeCalendarId,
        timeMin: (new Date()).toISOString(),
        maxResults: 2400, // I believe the max is 2500
        singleEvents: true,
        orderBy: 'startTime',
      })

      const googleEvents = res.data.items ? res.data.items : [];
      
      if (googleEvents.length > 0) {
        const getAllTimeSlotsQuery = 'SELECT * FROM timeSlots WHERE mentorUID = ?'
        let dbSlots = await this.database.query(getAllTimeSlotsQuery, mentorUid)
        if (!dbSlots.length) {
          dbSlots = [dbSlots]
        }
        const finalDbSlotsToRemove = dbSlots.filter((slot) => {
          return !googleEvents.some((googleEvent) => googleEvent.id === slot.sid)
        })
        const deleteTimeSlotQuery = 'SELECT deleteSlot(?, ?)'
        for (const slot of finalDbSlotsToRemove) {
          this.database.query(deleteTimeSlotQuery, [slot.sid, mentorUid])
        }
      } else {
        const deleteAllTimeSlotsQuery = 'DELETE FROM timeSlots WHERE mentorUID = ?'
        this.database.query(deleteAllTimeSlotsQuery, mentorUid)
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
    return googleEvents.some((googleEvent) => googleEvent.id === slot.id)
  }
}
