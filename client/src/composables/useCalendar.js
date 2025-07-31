import { ref, computed } from 'vue';
import axios from 'axios';
export function useCalendar() {
    const events = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const lastUpdate = ref(null);
    const fetchEvents = async (startDate) => {
        loading.value = true;
        error.value = null;
        try {
            const params = startDate ? { startDate: startDate.toISOString() } : {};
            const response = await axios.get('/api/calendar', { params });
            events.value = response.data.events;
            lastUpdate.value = new Date();
        }
        catch (err) {
            console.error('Failed to fetch calendar events:', err);
            if (err.response?.status === 401) {
                // Redirect to setup if not authenticated
                window.location.href = '/setup';
            }
            else {
                error.value = 'カレンダーデータの取得に失敗しました';
            }
        }
        finally {
            loading.value = false;
        }
    };
    // Group events by date
    const eventsByDate = computed(() => {
        const grouped = {};
        events.value.forEach(event => {
            const startDateStr = event.start.split('T')[0];
            const endDateStr = event.end.split('T')[0];
            // Parse dates safely without timezone issues
            const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
            const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
            const startDate = new Date(startYear, startMonth - 1, startDay);
            let endDate = new Date(endYear, endMonth - 1, endDay);
            // For all-day events, the end date is exclusive (Google Calendar convention)
            // So we need to subtract one day from the end date
            if (event.allDay) {
                endDate.setDate(endDate.getDate() - 1);
            }
            // If it's a single-day event
            if (startDate.getTime() === endDate.getTime()) {
                const dateKey = startDateStr;
                if (!grouped[dateKey]) {
                    grouped[dateKey] = [];
                }
                grouped[dateKey].push(event);
            }
            else {
                // Multi-day event
                const currentDate = new Date(startDate);
                while (currentDate <= endDate) {
                    const year = currentDate.getFullYear();
                    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
                    const day = currentDate.getDate().toString().padStart(2, '0');
                    const dateKey = `${year}-${month}-${day}`;
                    if (!grouped[dateKey]) {
                        grouped[dateKey] = [];
                    }
                    grouped[dateKey].push(event);
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
        });
        return grouped;
    });
    // Check if an event spans multiple days
    const isMultiDayEvent = (event) => {
        const startDate = new Date(event.start.split('T')[0] + 'T00:00:00');
        let endDate = new Date(event.end.split('T')[0] + 'T00:00:00');
        if (event.allDay) {
            endDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        }
        return startDate.getTime() !== endDate.getTime();
    };
    // Get position info for multi-day event in a specific day
    const getMultiDayEventPosition = (event, dateString, weekDays) => {
        const startDate = new Date(event.start.split('T')[0] + 'T00:00:00');
        let endDate = new Date(event.end.split('T')[0] + 'T00:00:00');
        if (event.allDay) {
            endDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        }
        const currentDate = new Date(dateString + 'T00:00:00');
        const dayIndex = weekDays.indexOf(dateString);
        // Calculate start position and span for this week
        let weekStartDate = new Date(weekDays[0] + 'T00:00:00');
        let weekEndDate = new Date(weekDays[6] + 'T00:00:00');
        let displayStartDate = startDate < weekStartDate ? weekStartDate : startDate;
        let displayEndDate = endDate > weekEndDate ? weekEndDate : endDate;
        const displayStartYear = displayStartDate.getFullYear();
        const displayStartMonth = (displayStartDate.getMonth() + 1).toString().padStart(2, '0');
        const displayStartDay = displayStartDate.getDate().toString().padStart(2, '0');
        const displayStartDateStr = `${displayStartYear}-${displayStartMonth}-${displayStartDay}`;
        const displayEndYear = displayEndDate.getFullYear();
        const displayEndMonth = (displayEndDate.getMonth() + 1).toString().padStart(2, '0');
        const displayEndDay = displayEndDate.getDate().toString().padStart(2, '0');
        const displayEndDateStr = `${displayEndYear}-${displayEndMonth}-${displayEndDay}`;
        let startIndex = weekDays.indexOf(displayStartDateStr);
        let endIndex = weekDays.indexOf(displayEndDateStr);
        return {
            isStart: currentDate.getTime() === startDate.getTime(),
            isEnd: currentDate.getTime() === endDate.getTime(),
            startIndex: startIndex,
            span: endIndex - startIndex + 1,
            dayIndex: dayIndex
        };
    };
    // Get week structure for calendar display
    const getWeekStructure = (startDate) => {
        const weeks = [];
        const current = new Date(startDate);
        // Adjust to start of week (Sunday)
        current.setDate(current.getDate() - current.getDay());
        for (let week = 0; week < 4; week++) {
            const days = [];
            for (let day = 0; day < 7; day++) {
                const year = current.getFullYear();
                const month = (current.getMonth() + 1).toString().padStart(2, '0');
                const dayNum = current.getDate().toString().padStart(2, '0');
                days.push({
                    date: new Date(current),
                    dateString: `${year}-${month}-${dayNum}`,
                    day: current.getDate(),
                    month: current.getMonth() + 1,
                    year: current.getFullYear(),
                    isWeekend: day === 0 || day === 6,
                    isSunday: day === 0,
                    isSaturday: day === 6
                });
                current.setDate(current.getDate() + 1);
            }
            weeks.push(days);
        }
        return weeks;
    };
    // Format time for display
    const formatTime = (dateString) => {
        if (!dateString.includes('T'))
            return ''; // All-day event
        const date = new Date(dateString);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };
    return {
        events,
        loading,
        error,
        lastUpdate,
        fetchEvents,
        eventsByDate,
        getWeekStructure,
        isMultiDayEvent,
        getMultiDayEventPosition,
        formatTime
    };
}
