import fetch from 'node-fetch';
import { DOMParser } from 'xmldom';
import xpath from 'xpath';

export interface WeatherData {
  date: string;
  weather: string;
  weatherCode: string;
  probabilityOfPrecipitation: string | null;
  reliabilityClass: string | null;
}

interface CachedWeatherData {
  data: WeatherData[];
  timestamp: number;
}

export class WeatherService {
  private static CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
  private static FEED_URL = 'https://www.data.jma.go.jp/developer/xml/feed/regular_l.xml';
  private static TARGET_AREA = '神奈川県府県週間天気予報';
  
  private cache: CachedWeatherData | null = null;

  /**
   * Fetch weather forecast data for Kanagawa Prefecture
   * Results are cached for 10 minutes
   */
  async fetchWeather(): Promise<WeatherData[]> {
    // Check cache first
    if (this.cache && Date.now() - this.cache.timestamp < WeatherService.CACHE_DURATION) {
      return this.cache.data;
    }

    try {
      // 1. Fetch feed XML
      const feedResponse = await fetch(WeatherService.FEED_URL);
      const feedText = await feedResponse.text();
      
      // Parse XML
      const parser = new DOMParser();
      const feedDoc = parser.parseFromString(feedText, 'text/xml');
      
      // 2. Find target weather forecast URL
      const select = xpath.useNamespaces({ atom: 'http://www.w3.org/2005/Atom' });
      const entries = select('//atom:entry', feedDoc);
      let targetUrl: string | null = null;
      
      if (Array.isArray(entries)) {
        for (const entry of entries) {
          const contentResult = select('atom:content/text()', entry);
          const content = Array.isArray(contentResult) ? contentResult[0] as Node : null;
          if (content && content.nodeValue?.includes(WeatherService.TARGET_AREA)) {
            const linkResult = select('atom:link/@href', entry);
            const link = Array.isArray(linkResult) ? linkResult[0] as Attr : null;
            if (link) {
              targetUrl = link.value;
              break;
            }
          }
        }
      }
      
      if (!targetUrl) {
        throw new Error(`${WeatherService.TARGET_AREA}が見つかりませんでした`);
      }
      
      // 3. Fetch weather forecast XML
      const weatherResponse = await fetch(targetUrl);
      const weatherText = await weatherResponse.text();
      const weatherDoc = parser.parseFromString(weatherText, 'text/xml');
      
      // 4. Extract data by date
      const weatherData: WeatherData[] = [];
      
      // Define namespaces
      const ns = {
        'jmx': 'http://xml.kishou.go.jp/jmaxml1/',
        'body': 'http://xml.kishou.go.jp/jmaxml1/body/meteorology1/',
        'jmx_eb': 'http://xml.kishou.go.jp/jmaxml1/elementBasis1/'
      };
      const weatherSelect = xpath.useNamespaces(ns);
      
      // Get MeteorologicalInfos[@type="区域予報"]
      const areaForecastResult = weatherSelect('//body:MeteorologicalInfos[@type="区域予報"]', weatherDoc);
      const areaForecast = Array.isArray(areaForecastResult) ? areaForecastResult[0] as Node : null;
      
      if (!areaForecast) {
        throw new Error('区域予報が見つかりませんでした');
      }
      
      // Get all TimeSeriesInfo
      const timeSeriesInfosResult = weatherSelect('body:TimeSeriesInfo', areaForecast);
      const timeSeriesInfos = Array.isArray(timeSeriesInfosResult) ? timeSeriesInfosResult as Node[] : [];
      
      // Get TimeDefines from first TimeSeriesInfo
      const timeDefinesResult = weatherSelect('body:TimeDefines/body:TimeDefine', timeSeriesInfos[0]);
      const timeDefines = Array.isArray(timeDefinesResult) ? timeDefinesResult as Element[] : [];
      
      for (const timeDefine of timeDefines) {
        const timeId = timeDefine.getAttribute('timeId');
        const dateTimeNodeResult = weatherSelect('body:DateTime/text()', timeDefine);
        const dateTimeNode = Array.isArray(dateTimeNodeResult) ? dateTimeNodeResult[0] as Node : null;
        
        if (!dateTimeNode || !timeId) continue;
        
        const dateTime = dateTimeNode.nodeValue;
        const date = dateTime!.split('T')[0];
        
        // Collect information from each TimeSeriesInfo
        let weather: string | null = null;
        let weatherCode: string | null = null;
        let probabilityOfPrecipitation: string | null = null;
        let reliabilityClass: string | null = null;
        
        for (const timeSeriesInfo of timeSeriesInfos) {
          // Weather
          const weatherNodeResult = weatherSelect(`.//jmx_eb:Weather[@refID='${timeId}']/text()`, timeSeriesInfo);
          const weatherNode = Array.isArray(weatherNodeResult) ? weatherNodeResult[0] as Node : null;
          if (weatherNode) weather = weatherNode.nodeValue;
          
          // WeatherCode
          const weatherCodeNodeResult = weatherSelect(`.//jmx_eb:WeatherCode[@refID='${timeId}']/text()`, timeSeriesInfo);
          const weatherCodeNode = Array.isArray(weatherCodeNodeResult) ? weatherCodeNodeResult[0] as Node : null;
          if (weatherCodeNode) weatherCode = weatherCodeNode.nodeValue;
          
          // ProbabilityOfPrecipitation
          const precipNodeResult = weatherSelect(`.//jmx_eb:ProbabilityOfPrecipitation[@refID='${timeId}']/text()`, timeSeriesInfo);
          const precipNode = Array.isArray(precipNodeResult) ? precipNodeResult[0] as Node : null;
          if (precipNode) probabilityOfPrecipitation = precipNode.nodeValue;
          
          // ReliabilityClass
          const reliabilityNodeResult = weatherSelect(`.//jmx_eb:ReliabilityClass[@refID='${timeId}']/text()`, timeSeriesInfo);
          const reliabilityNode = Array.isArray(reliabilityNodeResult) ? reliabilityNodeResult[0] as Node : null;
          if (reliabilityNode) reliabilityClass = reliabilityNode.nodeValue;
        }
        
        if (weather && weatherCode) {
          weatherData.push({
            date,
            weather,
            weatherCode,
            probabilityOfPrecipitation,
            reliabilityClass
          });
        }
      }
      
      // Update cache
      this.cache = {
        data: weatherData,
        timestamp: Date.now()
      };
      
      return weatherData;
      
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw error;
    }
  }

  /**
   * Convert weather code to emoji representation
   */
  static weatherCodeToEmoji(code: string): string[] {
    const weatherCodes: Record<string, string[]> = {
      "100": ["☀️"],
      "101": ["☀️", "☁️"],                    // 晴れ時々くもり（並べて表示）
      "102": ["☀️", "/", "🌧️"],              // 晴れ一時雨
      "103": ["☀️", "🌧️"],                    // 晴れ時々雨（並べて表示）
      "104": ["☀️", "/", "❄️"],               // 晴れ一時雪
      "105": ["☀️", "❄️"],                     // 晴れ時々雪（並べて表示）
      "106": ["☀️", "/", "🌧️❄️"],            // 晴れ一時雨か雪
      "107": ["☀️", "🌧️❄️"],                  // 晴れ時々雨か雪（並べて表示）
      "108": ["☀️", "/", "⛈️"],               // 晴れ一時雨か雷雨
      "110": ["☀️", "⇀", "☁️"],               // 晴れのち時々くもり
      "111": ["☀️", "⇀", "☁️"],               // 晴れのちくもり
      "112": ["☀️", "⇀", "🌧️"],              // 晴れのち一時雨
      "113": ["☀️", "⇀", "🌧️"],              // 晴れのち時々雨
      "114": ["☀️", "⇀", "🌧️"],              // 晴れのち雨
      "115": ["☀️", "⇀", "❄️"],               // 晴れのち一時雪
      "116": ["☀️", "⇀", "❄️"],               // 晴れのち時々雪
      "117": ["☀️", "⇀", "❄️"],               // 晴れのち雪
      "118": ["☀️", "⇀", "🌧️❄️"],            // 晴れのち雨か雪
      "119": ["☀️", "⇀", "⛈️"],               // 晴れのち雨か雷雨
      "120": ["☀️", "🌅", "/", "🌧️"],          // 晴れ朝夕一時雨
      "121": ["☀️", "🌅", "/", "🌧️"],          // 晴れ朝の内一時雨
      "122": ["☀️", "🌇", "/", "🌧️"],          // 晴れ夕方一時雨
      "123": ["☀️", "⛰️", "⛈️"],               // 晴れ山沿い雷雨
      "124": ["☀️", "⛰️", "❄️"],               // 晴れ山沿い雪
      "125": ["☀️", "⇀", "⛈️"],               // 晴れ午後は雷雨
      "126": ["☀️", "⇀", "🌧️"],              // 晴れ昼頃から雨
      "127": ["☀️", "⇀", "🌧️"],              // 晴れ夕方から雨
      "128": ["☀️", "🌙", "🌧️"],              // 晴れ夜は雨
      "129": ["☀️", "🌙", "🌧️"],              // 晴れ夜半から雨
      "130": ["🌫️", "⇀", "☀️"],               // 朝の内霧後晴れ
      "131": ["☀️", "🌅", "🌫️"],              // 晴れ明け方霧
      "132": ["☀️", "🌅🌇", "☁️"],             // 晴れ朝夕くもり
      "140": ["☀️", "⛈️"],                     // 晴れ時々雨で雷を伴う
      "160": ["☀️", "/", "❄️🌧️"],            // 晴れ一時雪か雨
      "170": ["☀️", "❄️🌧️"],                  // 晴れ時々雪か雨
      "181": ["☀️", "⇀", "❄️🌧️"],            // 晴れのち雪か雨
      "200": ["☁️"],                          // くもり
      "201": ["☁️", "☀️"],                    // くもり時々晴
      "202": ["☁️", "/", "🌧️"],              // くもり一時雨
      "203": ["☁️", "🌧️"],                    // くもり時々雨
      "204": ["☁️", "/", "❄️"],               // くもり一時雪
      "205": ["☁️", "❄️"],                     // くもり時々雪
      "206": ["☁️", "/", "🌧️❄️"],            // くもり一時雨か雪
      "207": ["☁️", "🌧️❄️"],                  // くもり時々雨か雪
      "208": ["☁️", "/", "⛈️"],               // くもり一時雨か雷雨
      "209": ["🌫️"],                          // 霧
      "210": ["☁️", "⇀", "☀️"],               // くもりのち時々晴れ
      "211": ["☁️", "⇀", "☀️"],               // くもりのち晴れ
      "212": ["☁️", "⇀", "/", "🌧️"],         // くもりのち一時雨
      "213": ["☁️", "⇀", "🌧️"],              // くもりのち時々雨
      "214": ["☁️", "⇀", "🌧️"],              // くもりのち雨
      "215": ["☁️", "⇀", "/", "❄️"],          // くもりのち一時雪
      "216": ["☁️", "⇀", "❄️"],               // くもりのち時々雪
      "217": ["☁️", "⇀", "❄️"],               // くもりのち雪
      "218": ["☁️", "⇀", "🌧️❄️"],            // くもりのち雨か雪
      "219": ["☁️", "⇀", "⛈️"],               // くもりのち雨か雷雨
      "220": ["☁️", "🌅🌇", "/", "🌧️"],       // くもり朝夕一時雨
      "221": ["☁️", "🌅", "/", "🌧️"],         // くもり朝の内一時雨
      "222": ["☁️", "🌇", "/", "🌧️"],         // くもり夕方一時雨
      "223": ["☁️", "☀️"],                     // くもり日中時々晴れ
      "224": ["☁️", "⇀", "🌧️"],              // くもり昼頃から雨
      "225": ["☁️", "⇀", "🌧️"],              // くもり夕方から雨
      "226": ["☁️", "🌙", "🌧️"],              // くもり夜は雨
      "227": ["☁️", "🌙", "🌧️"],              // くもり夜半から雨
      "228": ["☁️", "⇀", "❄️"],               // くもり昼頃から雪
      "229": ["☁️", "⇀", "❄️"],               // くもり夕方から雪
      "230": ["☁️", "🌙", "❄️"],               // くもり夜は雪
      "231": ["☁️", "🌊", "🌫️"],              // くもり海上海岸は霧か霧雨
      "240": ["☁️", "⛈️"],                     // くもり時々雨で雷を伴う
      "250": ["☁️", "⛈️❄️"],                   // くもり時々雪で雷を伴う
      "260": ["☁️", "/", "❄️🌧️"],            // くもり一時雪か雨
      "270": ["☁️", "❄️🌧️"],                  // くもり時々雪か雨
      "281": ["☁️", "⇀", "❄️🌧️"],            // くもりのち雪か雨
      "300": ["🌧️"],                          // 雨
      "301": ["🌧️", "☀️"],                    // 雨時々晴れ
      "302": ["🌧️", "☔"],                     // 雨時々止む
      "303": ["🌧️", "❄️"],                    // 雨時々雪
      "304": ["🌧️❄️"],                        // 雨か雪
      "306": ["⛈️"],                          // 大雨
      "307": ["⛈️", "💨"],                     // 風雨共に強い
      "308": ["🌧️", "🌀"],                     // 雨で暴風を伴う
      "309": ["🌧️", "/", "❄️"],               // 雨一時雪
      "311": ["🌧️", "⇀", "☀️"],               // 雨のち晴れ
      "313": ["🌧️", "⇀", "☁️"],               // 雨のちくもり
      "314": ["🌧️", "⇀", "❄️"],               // 雨のち時々雪
      "315": ["🌧️", "⇀", "❄️"],               // 雨のち雪
      "316": ["🌧️❄️", "⇀", "☀️"],             // 雨か雪のち晴れ
      "317": ["🌧️❄️", "⇀", "☁️"],             // 雨か雪のちくもり
      "320": ["🌧️", "🌅", "⇀", "☀️"],         // 朝の内雨のち晴れ
      "321": ["🌧️", "🌅", "⇀", "☁️"],         // 朝の内雨のちくもり
      "322": ["🌧️", "🌅🌇", "/", "❄️"],       // 雨朝晩一時雪
      "323": ["🌧️", "⇀", "☀️"],               // 雨昼頃から晴れ
      "324": ["🌧️", "⇀", "☀️"],               // 雨夕方から晴れ
      "325": ["🌧️", "🌙", "☀️"],              // 雨夜は晴
      "326": ["🌧️", "⇀", "❄️"],               // 雨夕方から雪
      "327": ["🌧️", "🌙", "❄️"],               // 雨夜は雪
      "328": ["🌧️", "⚡"],                     // 雨一時強く降る
      "329": ["🌧️", "/", "🌨️"],               // 雨一時みぞれ
      "340": ["❄️🌧️"],                        // 雪か雨
      "350": ["⛈️"],                          // 雨で雷を伴う
      "361": ["❄️🌧️", "⇀", "☀️"],             // 雪か雨のち晴れ
      "371": ["❄️🌧️", "⇀", "☁️"],             // 雪か雨のちくもり
      "400": ["❄️"],                          // 雪
      "401": ["❄️", "☀️"],                    // 雪時々晴れ
      "402": ["❄️", "☔"],                     // 雪時々止む
      "403": ["❄️", "🌧️"],                    // 雪時々雨
      "405": ["🌨️"],                          // 大雪
      "406": ["🌨️", "💨"],                     // 風雪強い
      "407": ["🌨️", "🌀"],                     // 暴風雪
      "409": ["❄️", "/", "🌧️"],               // 雪一時雨
      "411": ["❄️", "⇀", "☀️"],               // 雪のち晴れ
      "413": ["❄️", "⇀", "☁️"],               // 雪のちくもり
      "414": ["❄️", "⇀", "🌧️"],               // 雪のち雨
      "420": ["❄️", "🌅", "⇀", "☀️"],         // 朝の内雪のち晴れ
      "421": ["❄️", "🌅", "⇀", "☁️"],         // 朝の内雪のちくもり
      "422": ["❄️", "⇀", "🌧️"],               // 雪昼頃から雨
      "423": ["❄️", "⇀", "🌧️"],               // 雪夕方から雨
      "424": ["❄️", "🌙", "🌧️"],              // 雪夜半から雨
      "425": ["❄️", "⚡"],                     // 雪一時強く降る
      "426": ["❄️", "⇀", "🌨️"],               // 雪のちみぞれ
      "427": ["❄️", "/", "🌨️"],               // 雪一時みぞれ
      "450": ["⛈️❄️"]                          // 雪で雷を伴う
    };
    
    return weatherCodes[code] || ["❓"];
  }
}
