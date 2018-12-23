export interface slot {
  sid: string;
  mentorUID: string;
  start: Date;
  end: Date;
  recurrency: string;
}

export type date = string | Date 