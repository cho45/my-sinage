import { Router, Request, Response } from 'express';
import { WeatherService } from '../weather/index.js';

interface WeatherResponseData {
  date: string;
  weather: string;
  weatherCode: string;
  emoji: string;
  precipitationProbability: string | null;
  reliability: string | null;
}

interface WeatherResponse {
  success: true;
  data: WeatherResponseData[];
  lastUpdated: string;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

const router = Router();
const weatherService = new WeatherService();

/**
 * GET /api/weather
 * 天気予報データを取得
 */
router.get('/', async (_req: Request, res: Response<WeatherResponse | ErrorResponse>) => {
  try {
    const weatherData = await weatherService.fetchWeather();
    
    const responseData: WeatherResponseData[] = weatherData.map(day => ({
      date: day.date,
      weather: day.weather,
      weatherCode: day.weatherCode,
      emoji: WeatherService.weatherCodeToEmoji(day.weatherCode).join(''),
      precipitationProbability: day.probabilityOfPrecipitation,
      reliability: day.reliabilityClass
    }));
    
    const response: WeatherResponse = {
      success: true,
      data: responseData,
      lastUpdated: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Weather API error:', error);
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'WEATHER_FETCH_ERROR',
        message: '天気予報データの取得に失敗しました'
      }
    };
    
    res.status(500).json(errorResponse);
  }
});

export default router;