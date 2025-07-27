import { google, calendar_v3 } from 'googleapis';
import { OAuthManager } from '../auth/oauth.js';
import { loadConfig } from '../utils/config.js';
import { CalendarEvent } from '../types/index.js';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

export class CalendarService {
  private oauthManager: OAuthManager;
  private calendar: calendar_v3.Calendar | null = null;

  constructor() {
    this.oauthManager = new OAuthManager();
  }

  /**
   * Initialize Google Calendar client
   */
  private async initializeCalendarClient(): Promise<void> {
    if (!this.calendar) {
      const authClient = await this.oauthManager.getAuthenticatedClient();
      this.calendar = google.calendar({ version: 'v3', auth: authClient });
    }
  }

  /**
   * Get list of available calendars
   */
  async getCalendarList(): Promise<calendar_v3.Schema$CalendarListEntry[]> {
    try {
      await this.initializeCalendarClient();
      
      if (!this.calendar) {
        throw new Error('Calendar client not initialized');
      }

      const response = await this.calendar.calendarList.list();
      return response.data.items || [];
    } catch (error) {
      logger.error('Error fetching calendar list:', error);
      throw new Error('Failed to fetch calendar list');
    }
  }

  /**
   * Get events from multiple calendars for the next 4 weeks
   */
  async getEvents(): Promise<CalendarEvent[]> {
    try {
      await this.initializeCalendarClient();
      
      const config = await loadConfig();
      const now = new Date();
      const fourWeeksLater = new Date(now);
      fourWeeksLater.setDate(fourWeeksLater.getDate() + 28); // 4週間後

      const allEvents: CalendarEvent[] = [];

      // Fetch events from each calendar
      for (const cal of config.calendars) {
        try {
          const events = await this.getCalendarEvents(
            cal.id,
            now.toISOString(),
            fourWeeksLater.toISOString(),
            cal.color
          );
          
          allEvents.push(...events);
          logger.info(`Fetched ${events.length} events from calendar: ${cal.name}`);
        } catch (error) {
          logger.error(`Error fetching events from calendar ${cal.id}:`, error);
          // Continue with other calendars even if one fails
        }
      }

      // Sort events by start time
      allEvents.sort((a, b) => {
        const dateA = new Date(a.start);
        const dateB = new Date(b.start);
        return dateA.getTime() - dateB.getTime();
      });

      return allEvents;
    } catch (error) {
      logger.error('Error fetching calendar events:', error);
      throw new Error('Failed to fetch calendar events');
    }
  }

  /**
   * Get events from a specific calendar
   */
  private async getCalendarEvents(
    calendarId: string,
    timeMin: string,
    timeMax: string,
    color: string
  ): Promise<CalendarEvent[]> {
    if (!this.calendar) {
      throw new Error('Calendar client not initialized');
    }

    const response = await this.calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      timeZone: 'Asia/Tokyo'
    });

    const items = response.data.items || [];
    
    return items.map(event => ({
      id: event.id || '',
      title: event.summary || '(タイトルなし)',
      start: event.start?.dateTime || event.start?.date || '',
      end: event.end?.dateTime || event.end?.date || '',
      allDay: !event.start?.dateTime,
      calendarId,
      color
    }));
  }

  /**
   * Get events for a specific week range
   */
  async getWeekRangeEvents(startDate: Date): Promise<CalendarEvent[]> {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 28); // 4週間

    try {
      await this.initializeCalendarClient();
      
      const config = await loadConfig();
      const allEvents: CalendarEvent[] = [];

      for (const cal of config.calendars) {
        try {
          const events = await this.getCalendarEvents(
            cal.id,
            startDate.toISOString(),
            endDate.toISOString(),
            cal.color
          );
          
          allEvents.push(...events);
        } catch (error) {
          logger.error(`Error fetching events from calendar ${cal.id}:`, error);
        }
      }

      allEvents.sort((a, b) => {
        const dateA = new Date(a.start);
        const dateB = new Date(b.start);
        return dateA.getTime() - dateB.getTime();
      });

      return allEvents;
    } catch (error) {
      logger.error('Error fetching week range events:', error);
      throw new Error('Failed to fetch calendar events');
    }
  }
}