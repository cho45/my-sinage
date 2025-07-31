<template>
  <div class="calendar-container">
    <div class="calendar-header">
      <h1 class="date-time-display">
        <span class="date-part">
          <span class="year-part">
            <small>{{ currentMonthYear.year }}年</small>
            <small class="era">{{ currentMonthYear.era }}{{ currentMonthYear.eraYear }}年</small>
          </span>
          <span class="month-day">{{ currentMonthYear.month }}<small>月</small> {{ currentMonthYear.date }}<small>日</small></span>
          <span class="day-of-week">{{ currentMonthYear.dayOfWeek }}</span>
        </span>
        <span class="time-part">{{ currentTime }}</span>
      </h1>
      <div class="last-update" @click="() => fetchAllData()" :class="{ clickable: !loading }">
        <span v-if="loading">読み込み中...</span>
        <span v-else-if="lastUpdate">最終更新: {{ formatLastUpdate }}</span>
      </div>
    </div>

    <div v-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="retry" class="retry-button">再試行</button>
    </div>

    <div v-else class="calendar-grid">
      <div class="weekday-header">
        <div v-for="day in weekDays" :key="day" class="weekday" :class="getWeekdayClass(day)">
          {{ day }}
        </div>
      </div>

      <div v-for="(week, weekIndex) in weeks" :key="weekIndex" class="week">
        <div 
          v-for="day in week" 
          :key="day.dateString" 
          class="day"
          :class="getDayClass(day)"
        >
          <div class="day-header">
            <div class="day-number">{{ day.day }}</div>
            <div v-if="weatherByDate[day.dateString]" class="day-weather emoji">
              {{ weatherByDate[day.dateString].emoji }}
            </div>
          </div>
          <div class="day-events">
            <div 
              v-for="event in getEventsForDay(day.dateString)" 
              :key="event.id"
              class="event"
              :class="{
                'multi-day': event.isMultiDay,
                'multi-day-start': event.isMultiDay && event.isStart,
                'multi-day-end': event.isMultiDay && event.isEnd,
                'multi-day-middle': event.isMultiDay && !event.isStart && !event.isEnd
              }"
              :style="{ 
                backgroundColor: event.color,
                order: event.isMultiDay ? event.id.charCodeAt(0) : 1000 + (event.order || 0)
              }"
            >
              <span v-if="!event.allDay && (!event.isMultiDay || event.isStart)" class="event-time">{{ formatTime(event.start) }}</span>
              <span v-if="!event.isMultiDay || event.isStart || event.isWeekStart" class="event-title">{{ event.title }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="admin-link">
      <span class="admin-text">管理: {{ adminUrl }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useCalendar } from '@/composables/useCalendar'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { useWeather } from '@/composables/useWeather'

const { 
  loading, 
  error, 
  lastUpdate, 
  fetchEvents, 
  eventsByDate, 
  getWeekStructure,
  formatTime 
} = useCalendar()

const {
  weatherByDate,
  fetchWeather
} = useWeather()

// 両方のデータを取得する関数
const fetchAllData = async () => {
  await Promise.all([
    fetchEvents(),
    fetchWeather()
  ])
}

// 10分ごとに自動更新
useAutoRefresh(fetchAllData, 10 * 60 * 1000)

const weekDays = ['日', '月', '火', '水', '木', '金', '土']
const now = ref(new Date())

const weeks = computed(() => getWeekStructure(now.value))

const todayString = computed(() => {
  const year = now.value.getFullYear()
  const month = now.value.getMonth() + 1
  const date = now.value.getDate()
  return `${year}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`
})

const currentMonthYear = computed(() => {
  const year = now.value.getFullYear()
  const month = now.value.getMonth() + 1
  const date = now.value.getDate()
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][now.value.getDay()]
  
  // 和暦計算
  let era = ''
  let eraYear = 0
  if (year >= 2019) {
    era = '令和'
    eraYear = year - 2018
  } else if (year >= 1989) {
    era = '平成'
    eraYear = year - 1988
  } else if (year >= 1926) {
    era = '昭和'
    eraYear = year - 1925
  }
  
  return { year, month, date, dayOfWeek, era, eraYear }
})

// 現在時刻の管理
const currentTime = ref('')
let timeInterval: ReturnType<typeof setInterval> | undefined

const updateCurrentTime = () => {
  const currentNow = new Date()
  now.value = currentNow
  const hours = currentNow.getHours().toString().padStart(2, '0')
  const minutes = currentNow.getMinutes().toString().padStart(2, '0')
  const seconds = currentNow.getSeconds().toString().padStart(2, '0')
  currentTime.value = `${hours}:${minutes}:${seconds}`
}

const formatLastUpdate = computed(() => {
  if (!lastUpdate.value) return ''
  const date = lastUpdate.value
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
})

const adminUrl = computed(() => {
  return `${window.location.origin}/admin`
})

const getWeekdayClass = (day: string) => {
  return {
    'sunday': day === '日',
    'saturday': day === '土'
  }
}

const getDayClass = (day: any) => {
  const events = eventsByDate.value[day.dateString] || []
  const hasHoliday = events.some(e => e.calendarId.includes('holiday'))
  const isToday = day.dateString === todayString.value
  
  return {
    'sunday': day.isSunday || hasHoliday,
    'saturday': day.isSaturday,
    'holiday': hasHoliday,
    'today': isToday
  }
}

const getEventsForDay = (dateString: string) => {
  const events = eventsByDate.value[dateString] || []
  
  // Check if this is the first day of the week (Sunday)
  const date = new Date(dateString)
  const isWeekStart = date.getDay() === 0
  
  // Process events and add position info for multi-day events
  const processedEvents = events.map(event => {
    // Check if this event appears on multiple days
    const isMultiDay = (() => {
      // Count how many days this event appears
      let count = 0
      for (const date in eventsByDate.value) {
        if (eventsByDate.value[date].some(e => e.id === event.id)) {
          count++
          if (count > 1) return true
        }
      }
      return false
    })()
    
    // Find the first and last occurrence of this event
    let isStart = false
    let isEnd = false
    
    if (isMultiDay) {
      // Find all dates where this event appears
      const eventDates: string[] = []
      for (const date in eventsByDate.value) {
        if (eventsByDate.value[date].some(e => e.id === event.id)) {
          eventDates.push(date)
        }
      }
      eventDates.sort()
      
      isStart = dateString === eventDates[0]
      isEnd = dateString === eventDates[eventDates.length - 1]
    }
    
    return {
      ...event,
      isMultiDay,
      isStart,
      isEnd,
      isWeekStart
    }
  })
  
  // Sort: multi-day events first, then all-day events, then timed events
  return processedEvents.sort((a, b) => {
    if (a.isMultiDay && !b.isMultiDay) return -1
    if (!a.isMultiDay && b.isMultiDay) return 1
    if (a.allDay && !b.allDay) return -1
    if (!a.allDay && b.allDay) return 1
    return new Date(a.start).getTime() - new Date(b.start).getTime()
  }).map((event, index) => ({
    ...event,
    order: index
  }))
}

const retry = () => {
  fetchAllData()
}

// SSE connection management
let eventSource: EventSource | null = null
const sseConnected = ref(false)

const connectSSE = () => {
  if (eventSource) {
    eventSource.close()
  }
  
  eventSource = new EventSource('/api/sse/events')
  
  eventSource.onopen = () => {
    console.log('SSE connection established')
    sseConnected.value = true
  }
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      
      if (data.type === 'reload') {
        console.log('Reload command received from server')
        // Reload the page
        window.location.reload()
      } else if (data.type === 'connected') {
        console.log('SSE connected successfully')
      }
    } catch (error) {
      console.error('Failed to parse SSE message:', error)
    }
  }
  
  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error)
    sseConnected.value = false
    
    // Reconnect after 5 seconds
    setTimeout(() => {
      console.log('Attempting to reconnect SSE...')
      connectSSE()
    }, 5000)
  }
}

onMounted(() => {
  fetchAllData()
  connectSSE()
  
  // 現在時刻の更新を開始
  updateCurrentTime()
  timeInterval = setInterval(updateCurrentTime, 1000)
})

onUnmounted(() => {
  if (eventSource) {
    eventSource.close()
  }
  
  // 時刻更新のインターバルをクリア
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
.calendar-container {
  width: 100vw;
  height: 100vh;
  max-width: 1920px;
  max-height: 1280px;
  padding: 10px;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: none;
}

/* サイネージ表示用に固定サイズ */
@media screen and (min-width: 1920px) and (min-height: 1280px) {
  .calendar-container {
    width: 1920px;
    height: 1280px;
  }
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.date-time-display {
  margin: 0;
  color: #333;
  display: flex;
  align-items: center;
  gap: 24px;
}

.date-part {
  display: flex;
  align-items: center;
  gap: 20px;
}

.month-day {
  font-size: 48px;
  font-weight: 900;
}

.month-day small {
  font-size: 24px;
  font-weight: 900;
  margin-left: 2px;
}

.day-of-week {
  font-size: 38px;
  font-weight: 900;
}

.year-part {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.2;
  font-size: 28px;
  color: #333;
}

.era {
  color: #555;
}

.time-part {
  font-size: 50px;
  font-weight: 900;
  letter-spacing: 0.05em;
  color: #333;
}

.last-update {
  font-size: 18px;
  color: #666;
}

.last-update.clickable {
  cursor: pointer !important;
  user-select: none;
}

.last-update.clickable:hover {
  color: #333;
  text-decoration: underline;
}

.loading, .error {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex: 1;
  font-size: 24px;
  color: #666;
}

.error {
  color: #c00;
}

.retry-button {
  margin-top: 16px;
  padding: 12px 24px;
  font-size: 18px;
  background-color: #4285F4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer !important;
  font-family: 'Noto Sans JP', sans-serif;
}

.retry-button:hover {
  background-color: #357AE8;
}

.calendar-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #ddd;
  border-top: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background-color: #f5f5f5;
  border-bottom: 2px solid #ddd;
}

.weekday {
  padding: 16px;
  text-align: center;
  font-weight: 700;
  font-size: 20px;
  color: #333;
}

.weekday.sunday {
  color: #cc0000;
}

.weekday.saturday {
  color: #0066cc;
}

.week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-columns: 1fr;
  flex: 1;
  position: relative;
}

.day {
  min-height: 160px;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  position: relative;
  overflow: visible;
  min-width: 0;
  width: 100%;
}

.day::before {
  content: '';
  position: absolute;
  top: 0;
  right: -1px;
  bottom: 0;
  width: 1px;
  background-color: #ddd;
  z-index: 1;
}

.day::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background-color: #ddd;
  z-index: 1;
}

.day-header {
  padding: 8px 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.day-events {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px 12px;
  overflow-y: auto;
  overflow-x: hidden;
  min-width: 0;
  width: 100%;
}

.day:nth-child(7n)::before {
  display: none;
}

.week:last-child .day::after {
  display: none;
}

/* Add right border to the grid */
.calendar-grid::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 1px;
  background-color: #ddd;
  z-index: 1;
  border-radius: 0 8px 8px 0;
}

/* Add bottom border to the grid */
.calendar-grid::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background-color: #ddd;
  z-index: 1;
  border-radius: 0 0 8px 8px;
}

.day.sunday {
  background-color: #fff5f5;
}

.day.sunday .day-number {
  color: #cc0000;
}

.day.saturday {
  background-color: #fff5f5;
}

.day.saturday .day-number {
  color: #0066cc;
}

.day.holiday {
  background-color: #fff5f5;
}

.day.today {
  background-color: #e3f2fd;
  position: relative;
}

.day.today::before {
  content: '';
  position: absolute;
  top: 4px;
  left: 4px;
  right: 4px;
  bottom: 4px;
  border: 2px solid #1976d2;
  border-radius: 4px;
  pointer-events: none;
}

.day.today .day-number {
  color: #1976d2;
  font-weight: 900;
}

.day.today.holiday,
.day.today.sunday,
.day.today.saturday {
  background-color: #fce4ec;
}

.day.today.sunday .day-number {
  color: #d32f2f;
}

.day.today.saturday .day-number {
  color: #1565c0;
}

.day-number {
  font-size: 24px;
  font-weight: 700;
  color: #333;
}

.day-weather {
  font-size: 20px;
  display: flex;
  align-items: center;
}


.event {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 16px;
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  min-height: 24px;
  line-height: 1.4;
  flex-shrink: 0;
  position: relative;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.event.multi-day {
  min-height: 24px;
  height: 24px;
  padding: 2px 8px;
  z-index: 10;
  line-height: 20px;
  align-items: center;
}

.event.multi-day-start,
.event.multi-day-middle,
.event.multi-day-end {
  height: 24px !important;
  min-height: 24px !important;
  max-height: 24px !important;
}

.event.multi-day-start {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  position: relative;
}

.event.multi-day-start::after {
  content: '';
  position: absolute;
  top: 0;
  right: -12px;
  bottom: 0;
  width: 12px;
  background-color: inherit;
  z-index: 11;
  height: 24px;
}

.event.multi-day-middle {
  border-radius: 0;
  position: relative;
}

.event.multi-day-middle::before,
.event.multi-day-middle::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 12px;
  background-color: inherit;
  z-index: 11;
  height: 24px;
}

.event.multi-day-middle::before {
  left: -12px;
}

.event.multi-day-middle::after {
  right: -12px;
}

.event.multi-day-end {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  position: relative;
}

.event.multi-day-end::before {
  content: '';
  position: absolute;
  top: 0;
  left: -12px;
  bottom: 0;
  width: 12px;
  background-color: inherit;
  z-index: 11;
  height: 24px;
}

.event-time {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.event-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.admin-link {
  position: fixed;
  bottom: 10px;
  right: 10px;
  font-size: 12px;
  color: #999;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.admin-text {
  user-select: all;
  cursor: text !important;
}
</style>
