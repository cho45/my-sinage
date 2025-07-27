<template>
  <div class="calendar-container">
    <div class="calendar-header">
      <h1>{{ currentMonthYear }}</h1>
      <div class="last-update" v-if="lastUpdate">
        最終更新: {{ formatLastUpdate }}
      </div>
    </div>

    <div v-if="loading" class="loading">
      <p>カレンダーを読み込み中...</p>
    </div>

    <div v-else-if="error" class="error">
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
          <div class="day-number">{{ day.day }}</div>
          <div class="events">
            <div 
              v-for="event in getEventsForDay(day.dateString)" 
              :key="event.id"
              class="event"
              :style="{ backgroundColor: event.color }"
            >
              <span v-if="!event.allDay" class="event-time">{{ formatTime(event.start) }}</span>
              <span class="event-title">{{ event.title }}</span>
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
import { computed, onMounted } from 'vue'
import { useCalendar } from '@/composables/useCalendar'
import { useAutoRefresh } from '@/composables/useAutoRefresh'

const { 
  loading, 
  error, 
  lastUpdate, 
  fetchEvents, 
  eventsByDate, 
  getWeekStructure, 
  formatTime 
} = useCalendar()

// 10分ごとに自動更新
useAutoRefresh(fetchEvents, 10 * 60 * 1000)

const weekDays = ['日', '月', '火', '水', '木', '金', '土']
const currentDate = new Date()

const weeks = computed(() => getWeekStructure(currentDate))

const today = new Date()
const todayString = computed(() => {
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const date = today.getDate()
  return `${year}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`
})

const currentMonthYear = computed(() => {
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const date = today.getDate()
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][today.getDay()]
  return `${year}年${month}月${date}日（${dayOfWeek}）`
})

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
  
  // Sort events: all-day events first, then by start time
  return events.sort((a, b) => {
    if (a.allDay && !b.allDay) return -1
    if (!a.allDay && b.allDay) return 1
    return new Date(a.start).getTime() - new Date(b.start).getTime()
  })
}

const retry = () => {
  fetchEvents()
}

onMounted(() => {
  fetchEvents()
})
</script>

<style scoped>
.calendar-container {
  width: 100vw;
  height: 100vh;
  max-width: 1920px;
  max-height: 1080px;
  padding: 40px;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* サイネージ表示用に固定サイズ */
@media screen and (min-width: 1920px) and (min-height: 1080px) {
  .calendar-container {
    width: 1920px;
    height: 1080px;
  }
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.calendar-header h1 {
  font-size: 48px;
  font-weight: 700;
  margin: 0;
  color: #333;
}

.last-update {
  font-size: 18px;
  color: #666;
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
  cursor: pointer;
  font-family: 'Noto Sans JP', sans-serif;
}

.retry-button:hover {
  background-color: #357AE8;
}

.calendar-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
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
  flex: 1;
}

.day {
  border-right: 1px solid #ddd;
  border-bottom: 1px solid #ddd;
  padding: 12px;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.day:nth-child(7n) {
  border-right: none;
}

.week:last-child .day {
  border-bottom: none;
}

.day.sunday .day-number {
  color: #cc0000;
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

.day.today.holiday {
  background-color: #fce4ec;
}

.day.today.sunday .day-number {
  color: #d32f2f;
}

.day-number {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #333;
}

.events {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.event {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 16px;
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  line-height: 1.4;
}

.event-time {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.event-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  cursor: text;
}
</style>