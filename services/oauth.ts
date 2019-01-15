import { OAuth2Client } from 'google-auth-library'

export class OAuth {
  public OAuthClient!: OAuth2Client

  constructor() {
    this.OAuthClient = new OAuth2Client(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL,
    )
  }

  public generateAuthUrl(config: object) {
    return this.OAuthClient.generateAuthUrl(config)
  }

  public async getToken(code: string) {
    return (await this.OAuthClient.getToken(code))
  }

  public setCredentials(credentials: object) {
    this.OAuthClient.setCredentials(credentials)
  }

  public async refreshAccessToken() {
    return (await this.OAuthClient.refreshAccessToken())
  }
}
