export interface Calendar {
  id: string
  name: string
  color: string
  isHoliday?: boolean
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  calendarId: string
  color?: string
}

export interface DisplayConfig {
  weekStart: number
  language: string
  timezone: string
}

export interface Config {
  calendars: Calendar[]
  display: DisplayConfig
}