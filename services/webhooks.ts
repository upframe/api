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
      const tokens = await this.oauth.refreshAccessToken()
      //já temos refreshed tokens
      const googleCalendar = google.calendar({
        version: 'v3',
      })
      // set google options
      google.options({
        auth: this.oauth.OAuthClient,
      })

      

      googleCalendar.events.list({
        calendarId: mentor.upframeCalendarId,
        timeMin: (new Date()).toISOString(),
        maxResults: 2400, //I believe the max is 2500
        singleEvents: true,
        orderBy: 'startTime',
      }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err); //handle error

        const googleEvents = res.data.items;
        if (googleEvents.length) {
          //This means we have events to check
          //We need to take the slots from Google and put them in our DB
          
          //comparacao side by side
          //Eventos -> events

          const getAllTimeSlotsQuery = 'SELECT * FROM timeSlots WHERE mentorUID = ?'
          this.database.query(getAllTimeSlotsQuery, mentorUid).then((dbSlots) => {
            console.log('All slots')
            console.log(dbSlots)
            //Todos os ids da DB que nao tiverem na Google sao para apagar
            if (!dbSlots.length) {
              dbSlots = [dbSlots]
            }
            const finalDbSlotsToRemove = dbSlots.filter((slot) => { 
              return !googleEvents.some((googleEvent) => googleEvent.id === slot.sid);
            }) //Fazemos o contrario do some, para saber aqueles que foram excluidos
            // Agora apagamos nos free time slots esses mesmos
            console.log('To delete')
            console.log(finalDbSlotsToRemove)
            const deleteTimeSlotQuery = 'SELECT deleteSlot(?, ?)'
            for (const slot of finalDbSlotsToRemove) {
              this.database.query(deleteTimeSlotQuery, [slot.sid, mentorUid])
            }
          })
          // const userInfoQuery = 'SELECT * FROM timeSlots WHERE mentorUID = ?'
          // const mentor = await this.database.query(userInfoQuery, mentorUid)
          // console.log('Upcoming 10 events:');
          // googleEvents.map((event, i) => {
          //   const start = event.start.dateTime || event.start.date;
          //   console.log(`${start} - ${event.summary}`);
          // });
        } else {
          //This means we have no events. Time to clear them from the DB
          const deleteAllTimeSlotsQuery = 'DELETE FROM timeSlots WHERE mentorUID = ?'
          this.database.query(deleteAllTimeSlotsQuery, mentorUid)
          //We delete all the slots from the mentor

          console.log('No upcoming events found.');
        }
      });

      console.log(mentor)
    } catch (error) {
      console.log(error)
    }

    // let err: APIerror
    // try {
    //   const sqlQuery = 'SELECT * FROM users WHERE keycode = ?'
    //   const user = await this.database.query(sqlQuery, req.query.short)
    //   if (Object.keys(user).length === 0) {
    //     err = {
    //       code: 404,
    //       api: true,
    //       message: 'No mentors found',
    //       friendlyMessage: 'There are no mentors with that keycode',
    //     }
    //     throw err
    //   }
    // } catch (error) {
    //   if (error.api) {
    //     response = {
    //       ok: 0,
    //       code: error.code,
    //       friendlyMessage: error.friendlyMessage,
    //       message: error.message,
    //     }
    //   } else {
    //     response = {
    //       ok: 0,
    //       code: 500,
    //     }
    //   }
    // }
    res.status(response.code).json(response)
  }

  public doesGoogleHaveSlot(googleEvents, slot): Boolean {
    //We want to check for every google event if slots is there
    return googleEvents.some((googleEvent) => googleEvent.id === slot.id);
  }
}
