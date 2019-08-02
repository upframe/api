import {google, calendar_v3} from 'googleapis'

export class OAuth {
  public OAuthClient!: any

  constructor() {
    this.OAuthClient = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL,
    )
  }

  public generateAuthUrl(config: object) {
    return this.OAuthClient.generateAuthUrl(config)
  }

  public async getToken(code: string) {
    return await this.OAuthClient.getToken(code)
  }

  public setCredentials(credentials: object) {
    this.OAuthClient.setCredentials(credentials)
  }

  public async refreshAccessToken() {
    return await this.OAuthClient.refreshAccessToken()
  }

  public async getEventsList(instance: calendar_v3.Calendar, calendarID: string, minTime: Date | String, maxResults: Number): Array<Object> | Object {
    let res,
      err = false

    try {
      res = await instance.events.list({
        calendarId: calendarID,
        timeMin: minTime,
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      })
    } catch (err) {
      err = true
    }

    if (res && !err) {
      if(res.data.items) return res.data.items
      else []
    } else return []
  }
}
