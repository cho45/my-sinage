import { ref, computed } from 'vue'

interface WeatherData {
  date: string
  weather: string
  weatherCode: string
  emoji: string
  precipitationProbability: string | null
  reliability: string | null
}

interface WeatherResponse {
  success: boolean
  data?: WeatherData[]
  lastUpdated?: string
  error?: {
    code: string
    message: string
  }
}

export function useWeather() {
  const weatherData = ref<WeatherData[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdate = ref<Date | null>(null)

  // Create a map from date to weather data for easy lookup
  const weatherByDate = computed(() => {
    const map: Record<string, WeatherData> = {}
    weatherData.value.forEach(item => {
      map[item.date] = item
    })
    return map
  })

  const fetchWeather = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch('/api/weather')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: WeatherResponse = await response.json()
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch weather data')
      }

      weatherData.value = data.data || []
      lastUpdate.value = new Date()
    } catch (err) {
      console.error('Error fetching weather:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
    } finally {
      loading.value = false
    }
  }

  return {
    weatherData,
    weatherByDate,
    loading,
    error,
    lastUpdate,
    fetchWeather
  }
}