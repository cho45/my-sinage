/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0.d.ts" />
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useCalendar } from '@/composables/useCalendar';
import { useAutoRefresh } from '@/composables/useAutoRefresh';
import { useWeather } from '@/composables/useWeather';
const { loading, error, lastUpdate, fetchEvents, eventsByDate, getWeekStructure, formatTime } = useCalendar();
const { weatherByDate, fetchWeather } = useWeather();
// 両方のデータを取得する関数
const fetchAllData = async () => {
    await Promise.all([
        fetchEvents(),
        fetchWeather()
    ]);
};
// 10分ごとに自動更新
useAutoRefresh(fetchAllData, 10 * 60 * 1000);
const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
const currentDate = new Date();
const weeks = computed(() => getWeekStructure(currentDate));
const today = new Date();
const todayString = computed(() => {
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    return `${year}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;
});
const currentMonthYear = computed(() => {
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][today.getDay()];
    // 和暦計算
    let era = '';
    let eraYear = 0;
    if (year >= 2019) {
        era = '令和';
        eraYear = year - 2018;
    }
    else if (year >= 1989) {
        era = '平成';
        eraYear = year - 1988;
    }
    else if (year >= 1926) {
        era = '昭和';
        eraYear = year - 1925;
    }
    return { year, month, date, dayOfWeek, era, eraYear };
});
// 現在時刻の管理
const currentTime = ref('');
let timeInterval;
const updateCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    currentTime.value = `${hours}:${minutes}:${seconds}`;
};
const formatLastUpdate = computed(() => {
    if (!lastUpdate.value)
        return '';
    const date = lastUpdate.value;
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
});
const adminUrl = computed(() => {
    return `${window.location.origin}/admin`;
});
const getWeekdayClass = (day) => {
    return {
        'sunday': day === '日',
        'saturday': day === '土'
    };
};
const getDayClass = (day) => {
    const events = eventsByDate.value[day.dateString] || [];
    const hasHoliday = events.some(e => e.calendarId.includes('holiday'));
    const isToday = day.dateString === todayString.value;
    return {
        'sunday': day.isSunday || hasHoliday,
        'saturday': day.isSaturday,
        'holiday': hasHoliday,
        'today': isToday
    };
};
const getEventsForDay = (dateString) => {
    const events = eventsByDate.value[dateString] || [];
    // Check if this is the first day of the week (Sunday)
    const date = new Date(dateString);
    const isWeekStart = date.getDay() === 0;
    // Process events and add position info for multi-day events
    const processedEvents = events.map(event => {
        // Check if this event appears on multiple days
        const isMultiDay = (() => {
            // Count how many days this event appears
            let count = 0;
            for (const date in eventsByDate.value) {
                if (eventsByDate.value[date].some(e => e.id === event.id)) {
                    count++;
                    if (count > 1)
                        return true;
                }
            }
            return false;
        })();
        // Find the first and last occurrence of this event
        let isStart = false;
        let isEnd = false;
        if (isMultiDay) {
            // Find all dates where this event appears
            const eventDates = [];
            for (const date in eventsByDate.value) {
                if (eventsByDate.value[date].some(e => e.id === event.id)) {
                    eventDates.push(date);
                }
            }
            eventDates.sort();
            isStart = dateString === eventDates[0];
            isEnd = dateString === eventDates[eventDates.length - 1];
        }
        return {
            ...event,
            isMultiDay,
            isStart,
            isEnd,
            isWeekStart
        };
    });
    // Sort: multi-day events first, then all-day events, then timed events
    return processedEvents.sort((a, b) => {
        if (a.isMultiDay && !b.isMultiDay)
            return -1;
        if (!a.isMultiDay && b.isMultiDay)
            return 1;
        if (a.allDay && !b.allDay)
            return -1;
        if (!a.allDay && b.allDay)
            return 1;
        return new Date(a.start).getTime() - new Date(b.start).getTime();
    }).map((event, index) => ({
        ...event,
        order: index
    }));
};
const retry = () => {
    fetchAllData();
};
// SSE connection management
let eventSource = null;
const sseConnected = ref(false);
const connectSSE = () => {
    if (eventSource) {
        eventSource.close();
    }
    eventSource = new EventSource('/api/sse/events');
    eventSource.onopen = () => {
        console.log('SSE connection established');
        sseConnected.value = true;
    };
    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'reload') {
                console.log('Reload command received from server');
                // Reload the page
                window.location.reload();
            }
            else if (data.type === 'connected') {
                console.log('SSE connected successfully');
            }
        }
        catch (error) {
            console.error('Failed to parse SSE message:', error);
        }
    };
    eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        sseConnected.value = false;
        // Reconnect after 5 seconds
        setTimeout(() => {
            console.log('Attempting to reconnect SSE...');
            connectSSE();
        }, 5000);
    };
};
onMounted(() => {
    fetchAllData();
    connectSSE();
    // 現在時刻の更新を開始
    updateCurrentTime();
    timeInterval = setInterval(updateCurrentTime, 1000);
});
onUnmounted(() => {
    if (eventSource) {
        eventSource.close();
    }
    // 時刻更新のインターバルをクリア
    if (timeInterval) {
        clearInterval(timeInterval);
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_elements;
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['calendar-container']} */ ;
/** @type {__VLS_StyleScopedClasses['month-day']} */ ;
/** @type {__VLS_StyleScopedClasses['last-update']} */ ;
/** @type {__VLS_StyleScopedClasses['last-update']} */ ;
/** @type {__VLS_StyleScopedClasses['clickable']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['retry-button']} */ ;
/** @type {__VLS_StyleScopedClasses['weekday']} */ ;
/** @type {__VLS_StyleScopedClasses['weekday']} */ ;
/** @type {__VLS_StyleScopedClasses['day']} */ ;
/** @type {__VLS_StyleScopedClasses['day']} */ ;
/** @type {__VLS_StyleScopedClasses['day']} */ ;
/** @type {__VLS_StyleScopedClasses['week']} */ ;
/** @type {__VLS_StyleScopedClasses['day']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['day']} */ ;
/** @type {__VLS_StyleScopedClasses['sunday']} */ ;
/** @type {__VLS_StyleScopedClasses['day']} */ ;
/** @type {__VLS_StyleScopedClasses['sunday']} */ ;
/** @type {__VLS_StyleScopedClasses['day']} */ ;
/** @type {__VLS_StyleScopedClasses['saturday']} */ ;
/** @type {__VLS_StyleScopedClasses['day']} */ ;
/** @type {__VLS_StyleScopedClasses['saturday']} */ ;
/** @type {__VLS_StyleScopedClasses['day-number']} */ ;
/** @type {__VLS_StyleScopedClasses['day']} */ ;
/** @type {__VLS_StyleScopedClasses['day']} */ ;
/** @type {__VLS_StyleScopedClasses['day']} */ ;
/** @type {__VLS_StyleScopedClasses['today']} */ ;
/** @type {__VLS_StyleScopedClasses['day']} */ ;
/** @type {__VLS_StyleScopedClasses['today']} */ ;
/** @type {__VLS_StyleScopedClasses['day-number']} */ ;
/** @type {__VLS_StyleScopedClasses['day']} */ ;
/** @type {__VLS_StyleScopedClasses['today']} */ ;
/** @type {__VLS_StyleScopedClasses['holiday']} */ ;
/** @type {__VLS_StyleScopedClasses['day']} */ ;
/** @type {__VLS_StyleScopedClasses['today']} */ ;
/** @type {__VLS_StyleScopedClasses['sunday']} */ ;
/** @type {__VLS_StyleScopedClasses['day']} */ ;
/** @type {__VLS_StyleScopedClasses['today']} */ ;
/** @type {__VLS_StyleScopedClasses['saturday']} */ ;
/** @type {__VLS_StyleScopedClasses['day']} */ ;
/** @type {__VLS_StyleScopedClasses['today']} */ ;
/** @type {__VLS_StyleScopedClasses['sunday']} */ ;
/** @type {__VLS_StyleScopedClasses['day-number']} */ ;
/** @type {__VLS_StyleScopedClasses['day']} */ ;
/** @type {__VLS_StyleScopedClasses['today']} */ ;
/** @type {__VLS_StyleScopedClasses['saturday']} */ ;
/** @type {__VLS_StyleScopedClasses['day-number']} */ ;
/** @type {__VLS_StyleScopedClasses['day-number']} */ ;
/** @type {__VLS_StyleScopedClasses['event']} */ ;
/** @type {__VLS_StyleScopedClasses['event']} */ ;
/** @type {__VLS_StyleScopedClasses['event']} */ ;
/** @type {__VLS_StyleScopedClasses['event']} */ ;
/** @type {__VLS_StyleScopedClasses['event']} */ ;
/** @type {__VLS_StyleScopedClasses['multi-day-start']} */ ;
/** @type {__VLS_StyleScopedClasses['event']} */ ;
/** @type {__VLS_StyleScopedClasses['multi-day-start']} */ ;
/** @type {__VLS_StyleScopedClasses['event']} */ ;
/** @type {__VLS_StyleScopedClasses['multi-day-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['event']} */ ;
/** @type {__VLS_StyleScopedClasses['multi-day-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['event']} */ ;
/** @type {__VLS_StyleScopedClasses['multi-day-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['event']} */ ;
/** @type {__VLS_StyleScopedClasses['multi-day-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['event']} */ ;
/** @type {__VLS_StyleScopedClasses['multi-day-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['event']} */ ;
/** @type {__VLS_StyleScopedClasses['multi-day-end']} */ ;
/** @type {__VLS_StyleScopedClasses['event']} */ ;
/** @type {__VLS_StyleScopedClasses['multi-day-end']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ class: "calendar-container" },
});
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ class: "calendar-header" },
});
__VLS_asFunctionalElement(__VLS_elements.h1, __VLS_elements.h1)({
    ...{ class: "date-time-display" },
});
__VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({
    ...{ class: "date-part" },
});
__VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({
    ...{ class: "year-part" },
});
__VLS_asFunctionalElement(__VLS_elements.small, __VLS_elements.small)({});
(__VLS_ctx.currentMonthYear.year);
// @ts-ignore
[currentMonthYear,];
__VLS_asFunctionalElement(__VLS_elements.small, __VLS_elements.small)({
    ...{ class: "era" },
});
(__VLS_ctx.currentMonthYear.era);
(__VLS_ctx.currentMonthYear.eraYear);
// @ts-ignore
[currentMonthYear, currentMonthYear,];
__VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({
    ...{ class: "month-day" },
});
(__VLS_ctx.currentMonthYear.month);
__VLS_asFunctionalElement(__VLS_elements.small, __VLS_elements.small)({});
// @ts-ignore
[currentMonthYear,];
(__VLS_ctx.currentMonthYear.date);
// @ts-ignore
[currentMonthYear,];
__VLS_asFunctionalElement(__VLS_elements.small, __VLS_elements.small)({});
__VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({
    ...{ class: "day-of-week" },
});
(__VLS_ctx.currentMonthYear.dayOfWeek);
// @ts-ignore
[currentMonthYear,];
__VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({
    ...{ class: "time-part" },
});
(__VLS_ctx.currentTime);
// @ts-ignore
[currentTime,];
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ onClick: (() => __VLS_ctx.fetchAllData()) },
    ...{ class: "last-update" },
    ...{ class: ({ clickable: !__VLS_ctx.loading }) },
});
// @ts-ignore
[fetchAllData, loading,];
if (__VLS_ctx.loading) {
    // @ts-ignore
    [loading,];
    __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({});
}
else if (__VLS_ctx.lastUpdate) {
    // @ts-ignore
    [lastUpdate,];
    __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({});
    (__VLS_ctx.formatLastUpdate);
    // @ts-ignore
    [formatLastUpdate,];
}
if (__VLS_ctx.error) {
    // @ts-ignore
    [error,];
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
        ...{ class: "error" },
    });
    __VLS_asFunctionalElement(__VLS_elements.p, __VLS_elements.p)({});
    (__VLS_ctx.error);
    // @ts-ignore
    [error,];
    __VLS_asFunctionalElement(__VLS_elements.button, __VLS_elements.button)({
        ...{ onClick: (__VLS_ctx.retry) },
        ...{ class: "retry-button" },
    });
    // @ts-ignore
    [retry,];
}
else {
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
        ...{ class: "calendar-grid" },
    });
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
        ...{ class: "weekday-header" },
    });
    for (const [day] of __VLS_getVForSourceType((__VLS_ctx.weekDays))) {
        // @ts-ignore
        [weekDays,];
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
            key: (day),
            ...{ class: "weekday" },
            ...{ class: (__VLS_ctx.getWeekdayClass(day)) },
        });
        // @ts-ignore
        [getWeekdayClass,];
        (day);
    }
    for (const [week, weekIndex] of __VLS_getVForSourceType((__VLS_ctx.weeks))) {
        // @ts-ignore
        [weeks,];
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
            key: (weekIndex),
            ...{ class: "week" },
        });
        for (const [day] of __VLS_getVForSourceType((week))) {
            __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
                key: (day.dateString),
                ...{ class: "day" },
                ...{ class: (__VLS_ctx.getDayClass(day)) },
            });
            // @ts-ignore
            [getDayClass,];
            __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
                ...{ class: "day-header" },
            });
            __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
                ...{ class: "day-number" },
            });
            (day.day);
            if (__VLS_ctx.weatherByDate[day.dateString]) {
                // @ts-ignore
                [weatherByDate,];
                __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
                    ...{ class: "day-weather" },
                });
                (__VLS_ctx.weatherByDate[day.dateString].emoji);
                // @ts-ignore
                [weatherByDate,];
            }
            __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
                ...{ class: "day-events" },
            });
            for (const [event] of __VLS_getVForSourceType((__VLS_ctx.getEventsForDay(day.dateString)))) {
                // @ts-ignore
                [getEventsForDay,];
                __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
                    key: (event.id),
                    ...{ class: "event" },
                    ...{ class: ({
                            'multi-day': event.isMultiDay,
                            'multi-day-start': event.isMultiDay && event.isStart,
                            'multi-day-end': event.isMultiDay && event.isEnd,
                            'multi-day-middle': event.isMultiDay && !event.isStart && !event.isEnd
                        }) },
                    ...{ style: ({
                            backgroundColor: event.color,
                            order: event.isMultiDay ? event.id.charCodeAt(0) : 1000 + (event.order || 0)
                        }) },
                });
                if (!event.allDay && (!event.isMultiDay || event.isStart)) {
                    __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({
                        ...{ class: "event-time" },
                    });
                    (__VLS_ctx.formatTime(event.start));
                    // @ts-ignore
                    [formatTime,];
                }
                if (!event.isMultiDay || event.isStart || event.isWeekStart) {
                    __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({
                        ...{ class: "event-title" },
                    });
                    (event.title);
                }
            }
        }
    }
}
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ class: "admin-link" },
});
__VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({
    ...{ class: "admin-text" },
});
(__VLS_ctx.adminUrl);
// @ts-ignore
[adminUrl,];
/** @type {__VLS_StyleScopedClasses['calendar-container']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-header']} */ ;
/** @type {__VLS_StyleScopedClasses['date-time-display']} */ ;
/** @type {__VLS_StyleScopedClasses['date-part']} */ ;
/** @type {__VLS_StyleScopedClasses['year-part']} */ ;
/** @type {__VLS_StyleScopedClasses['era']} */ ;
/** @type {__VLS_StyleScopedClasses['month-day']} */ ;
/** @type {__VLS_StyleScopedClasses['day-of-week']} */ ;
/** @type {__VLS_StyleScopedClasses['time-part']} */ ;
/** @type {__VLS_StyleScopedClasses['last-update']} */ ;
/** @type {__VLS_StyleScopedClasses['clickable']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['retry-button']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['weekday-header']} */ ;
/** @type {__VLS_StyleScopedClasses['weekday']} */ ;
/** @type {__VLS_StyleScopedClasses['week']} */ ;
/** @type {__VLS_StyleScopedClasses['day']} */ ;
/** @type {__VLS_StyleScopedClasses['day-header']} */ ;
/** @type {__VLS_StyleScopedClasses['day-number']} */ ;
/** @type {__VLS_StyleScopedClasses['day-weather']} */ ;
/** @type {__VLS_StyleScopedClasses['day-events']} */ ;
/** @type {__VLS_StyleScopedClasses['event']} */ ;
/** @type {__VLS_StyleScopedClasses['multi-day']} */ ;
/** @type {__VLS_StyleScopedClasses['multi-day-start']} */ ;
/** @type {__VLS_StyleScopedClasses['multi-day-end']} */ ;
/** @type {__VLS_StyleScopedClasses['multi-day-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['event-time']} */ ;
/** @type {__VLS_StyleScopedClasses['event-title']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-link']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-text']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            error: error,
            lastUpdate: lastUpdate,
            formatTime: formatTime,
            weatherByDate: weatherByDate,
            fetchAllData: fetchAllData,
            weekDays: weekDays,
            weeks: weeks,
            currentMonthYear: currentMonthYear,
            currentTime: currentTime,
            formatLastUpdate: formatLastUpdate,
            adminUrl: adminUrl,
            getWeekdayClass: getWeekdayClass,
            getDayClass: getDayClass,
            getEventsForDay: getEventsForDay,
            retry: retry,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
    },
});
; /* PartiallyEnd: #4569/main.vue */
