export interface Calendar {
  id: string;
  name: string;
  color: string;
  isHoliday?: boolean;
}

export interface DisplayConfig {
  weekStart: number;
  language: string;
  timezone: string;
}

export interface Config {
  calendars: Calendar[];
  display: DisplayConfig;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  calendarId: string;
  color?: string;
}

export interface AuthToken {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}