export interface APIresponse {
  code: number;
  ok: number;
  message?: string;
  token?: string;

  meetup?: meetup;
  mentor?: mentor;
  user?: user;
  slot?: slot;
}

export type date = string | Date;

export interface meetup {
  mid?: string;
  sid?: string;
  menteeUID?: string;
  mentorUID?: string;
  location?: string;
  status?: string;
  start?: string | Date;
}

export interface account {
  uid: string;
  name: string;
  email: string;
  password: string;

  googleAccessToken?: string;
  googleRefreshToken?: string;
}

export interface mentor extends account {
  keycode?: string;
  favoritePlaces?: string;
  type: string;
}

export interface user extends account {
  type: string;
}

export interface slot {
  sid: string;
  mentorUID: string;
  start: Date;
  end: Date;
  recurrency: string;
}