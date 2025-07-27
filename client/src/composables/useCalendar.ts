import { ref, computed } from 'vue'
import axios from 'axios'
import type { CalendarEvent } from '@/types'

export function useCalendar() {
  const events = ref<CalendarEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdate = ref<Date | null>(null)

  const fetchEvents = async (startDate?: Date) => {
    loading.value = true
    error.value = null

    try {
      const params = startDate ? { startDate: startDate.toISOString() } : {}
      const response = await axios.get('/api/calendar', { params })
      
      events.value = response.data.events
      lastUpdate.value = new Date()
    } catch (err: any) {
      console.error('Failed to fetch calendar events:', err)
      
      if (err.response?.status === 401) {
        // Redirect to setup if not authenticated
        window.location.href = '/setup'
      } else {
        error.value = 'カレンダーデータの取得に失敗しました'
      }
    } finally {
      loading.value = false
    }
  }

  // Group events by date
  const eventsByDate = computed(() => {
    const grouped: Record<string, CalendarEvent[]> = {}
    
    events.value.forEach(event => {
      const dateKey = event.start.split('T')[0] // Get YYYY-MM-DD part
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(event)
    })
    
    return grouped
  })

  // Get week structure for calendar display
  const getWeekStructure = (startDate: Date) => {
    const weeks = []
    const current = new Date(startDate)
    
    // Adjust to start of week (Sunday)
    current.setDate(current.getDate() - current.getDay())
    
    for (let week = 0; week < 4; week++) {
      const days = []
      for (let day = 0; day < 7; day++) {
        days.push({
          date: new Date(current),
          dateString: current.toISOString().split('T')[0],
          day: current.getDate(),
          month: current.getMonth() + 1,
          year: current.getFullYear(),
          isWeekend: day === 0 || day === 6,
          isSunday: day === 0,
          isSaturday: day === 6
        })
        current.setDate(current.getDate() + 1)
      }
      weeks.push(days)
    }
    
    return weeks
  }

  // Format time for display
  const formatTime = (dateString: string) => {
    if (!dateString.includes('T')) return '' // All-day event
    
    const date = new Date(dateString)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    
    return `${hours}:${minutes}`
  }

  return {
    events,
    loading,
    error,
    lastUpdate,
    fetchEvents,
    eventsByDate,
    getWeekStructure,
    formatTime
  }
}