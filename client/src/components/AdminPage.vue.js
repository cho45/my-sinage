/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0.d.ts" />
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
const configJson = ref('');
const jsonError = ref('');
const saving = ref(false);
const resetting = ref(false);
const message = ref('');
const messageType = ref('success');
const systemStatus = ref('正常');
const lastUpdate = ref('-');
const calendarList = ref([]);
const loadingCalendars = ref(false);
const reloading = ref(false);
const statusClass = computed(() => ({
    'status-ok': systemStatus.value === '正常',
    'status-error': systemStatus.value !== '正常'
}));
const messageClass = computed(() => ({
    'success-message': messageType.value === 'success',
    'error-message': messageType.value === 'error'
}));
const validateJson = () => {
    try {
        if (configJson.value.trim()) {
            JSON.parse(configJson.value);
            jsonError.value = '';
        }
    }
    catch (err) {
        jsonError.value = 'JSONフォーマットが正しくありません';
    }
};
const loadCalendarList = async () => {
    loadingCalendars.value = true;
    try {
        const response = await axios.get('/api/calendars');
        calendarList.value = response.data.calendars;
        showMessage('カレンダーリストを取得しました', 'success');
    }
    catch (err) {
        showMessage('カレンダーリストの取得に失敗しました', 'error');
    }
    finally {
        loadingCalendars.value = false;
    }
};
const loadConfig = async () => {
    try {
        const response = await axios.get('/api/config', {
            auth: {
                username: 'admin',
                password: prompt('管理者パスワードを入力してください') || ''
            }
        });
        configJson.value = JSON.stringify(response.data, null, 2);
        updateLastUpdate();
    }
    catch (err) {
        if (err.response?.status === 401) {
            showMessage('認証に失敗しました', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        }
        else {
            showMessage('設定の読み込みに失敗しました', 'error');
        }
    }
};
const saveConfig = async () => {
    saving.value = true;
    try {
        const config = JSON.parse(configJson.value);
        await axios.post('/api/config', config);
        showMessage('設定を保存しました', 'success');
        updateLastUpdate();
    }
    catch (err) {
        showMessage('設定の保存に失敗しました', 'error');
    }
    finally {
        saving.value = false;
    }
};
const resetAuth = async () => {
    if (!confirm('Google認証情報をリセットしますか？\n再度認証が必要になります。')) {
        return;
    }
    resetting.value = true;
    try {
        await axios.post('/api/auth/reset');
        showMessage('認証情報をリセットしました', 'success');
        setTimeout(() => {
            window.location.href = '/setup';
        }, 2000);
    }
    catch (err) {
        showMessage('リセットに失敗しました', 'error');
    }
    finally {
        resetting.value = false;
    }
};
const logout = () => {
    // Clear session and redirect
    window.location.href = '/';
};
const showMessage = (text, type) => {
    message.value = text;
    messageType.value = type;
    setTimeout(() => {
        message.value = '';
    }, 5000);
};
const updateLastUpdate = () => {
    lastUpdate.value = new Date().toLocaleString('ja-JP');
};
const reloadAllClients = async () => {
    if (!confirm('すべてのクライアント画面をリロードしますか？')) {
        return;
    }
    reloading.value = true;
    try {
        const response = await axios.post('/api/admin/reload');
        showMessage(`${response.data.message} (接続数: ${response.data.totalClients})`, 'success');
    }
    catch (err) {
        showMessage('リロードコマンドの送信に失敗しました', 'error');
    }
    finally {
        reloading.value = false;
    }
};
onMounted(() => {
    loadConfig();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_elements;
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['admin-header']} */ ;
/** @type {__VLS_StyleScopedClasses['logout-button']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-list-section']} */ ;
/** @type {__VLS_StyleScopedClasses['refresh-button']} */ ;
/** @type {__VLS_StyleScopedClasses['refresh-button']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-list']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-list']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-list']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-list']} */ ;
/** @type {__VLS_StyleScopedClasses['config-section']} */ ;
/** @type {__VLS_StyleScopedClasses['json-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['json-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['save-button']} */ ;
/** @type {__VLS_StyleScopedClasses['save-button']} */ ;
/** @type {__VLS_StyleScopedClasses['reset-button']} */ ;
/** @type {__VLS_StyleScopedClasses['reset-button']} */ ;
/** @type {__VLS_StyleScopedClasses['remote-control-section']} */ ;
/** @type {__VLS_StyleScopedClasses['reload-all-button']} */ ;
/** @type {__VLS_StyleScopedClasses['reload-all-button']} */ ;
/** @type {__VLS_StyleScopedClasses['status-section']} */ ;
/** @type {__VLS_StyleScopedClasses['status-section']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ class: "admin-container" },
});
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ class: "admin-header" },
});
__VLS_asFunctionalElement(__VLS_elements.h1, __VLS_elements.h1)({});
__VLS_asFunctionalElement(__VLS_elements.button, __VLS_elements.button)({
    ...{ onClick: (__VLS_ctx.logout) },
    ...{ class: "logout-button" },
});
// @ts-ignore
[logout,];
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ class: "admin-content" },
});
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ class: "calendar-list-section" },
});
__VLS_asFunctionalElement(__VLS_elements.h2, __VLS_elements.h2)({});
__VLS_asFunctionalElement(__VLS_elements.button, __VLS_elements.button)({
    ...{ onClick: (__VLS_ctx.loadCalendarList) },
    ...{ class: "refresh-button" },
    disabled: (__VLS_ctx.loadingCalendars),
});
// @ts-ignore
[loadCalendarList, loadingCalendars,];
(__VLS_ctx.loadingCalendars ? '読み込み中...' : 'カレンダーリストを更新');
// @ts-ignore
[loadingCalendars,];
if (__VLS_ctx.calendarList.length > 0) {
    // @ts-ignore
    [calendarList,];
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
        ...{ class: "calendar-list" },
    });
    __VLS_asFunctionalElement(__VLS_elements.table, __VLS_elements.table)({});
    __VLS_asFunctionalElement(__VLS_elements.thead, __VLS_elements.thead)({});
    __VLS_asFunctionalElement(__VLS_elements.tr, __VLS_elements.tr)({});
    __VLS_asFunctionalElement(__VLS_elements.th, __VLS_elements.th)({});
    __VLS_asFunctionalElement(__VLS_elements.th, __VLS_elements.th)({});
    __VLS_asFunctionalElement(__VLS_elements.th, __VLS_elements.th)({});
    __VLS_asFunctionalElement(__VLS_elements.th, __VLS_elements.th)({});
    __VLS_asFunctionalElement(__VLS_elements.tbody, __VLS_elements.tbody)({});
    for (const [cal] of __VLS_getVForSourceType((__VLS_ctx.calendarList))) {
        // @ts-ignore
        [calendarList,];
        __VLS_asFunctionalElement(__VLS_elements.tr, __VLS_elements.tr)({
            key: (cal.id),
        });
        __VLS_asFunctionalElement(__VLS_elements.td, __VLS_elements.td)({});
        (cal.summary);
        __VLS_asFunctionalElement(__VLS_elements.td, __VLS_elements.td)({
            ...{ class: "calendar-id" },
        });
        (cal.id);
        __VLS_asFunctionalElement(__VLS_elements.td, __VLS_elements.td)({});
        __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({
            ...{ class: "color-sample" },
            ...{ style: ({ backgroundColor: cal.backgroundColor }) },
        });
        (cal.backgroundColor);
        __VLS_asFunctionalElement(__VLS_elements.td, __VLS_elements.td)({});
        (cal.accessRole);
    }
}
else if (!__VLS_ctx.loadingCalendars) {
    // @ts-ignore
    [loadingCalendars,];
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
        ...{ class: "no-calendars" },
    });
}
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ class: "config-section" },
});
__VLS_asFunctionalElement(__VLS_elements.h2, __VLS_elements.h2)({});
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ class: "config-editor" },
});
__VLS_asFunctionalElement(__VLS_elements.textarea, __VLS_elements.textarea)({
    ...{ onInput: (__VLS_ctx.validateJson) },
    value: (__VLS_ctx.configJson),
    ...{ class: "json-editor" },
    ...{ class: ({ 'error': __VLS_ctx.jsonError }) },
    spellcheck: "false",
});
// @ts-ignore
[validateJson, configJson, jsonError,];
if (__VLS_ctx.jsonError) {
    // @ts-ignore
    [jsonError,];
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
        ...{ class: "error-message" },
    });
    (__VLS_ctx.jsonError);
    // @ts-ignore
    [jsonError,];
}
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ class: "button-group" },
});
__VLS_asFunctionalElement(__VLS_elements.button, __VLS_elements.button)({
    ...{ onClick: (__VLS_ctx.saveConfig) },
    ...{ class: "save-button" },
    disabled: (!!__VLS_ctx.jsonError || __VLS_ctx.saving),
});
// @ts-ignore
[jsonError, saveConfig, saving,];
(__VLS_ctx.saving ? '保存中...' : '保存');
// @ts-ignore
[saving,];
__VLS_asFunctionalElement(__VLS_elements.button, __VLS_elements.button)({
    ...{ onClick: (__VLS_ctx.resetAuth) },
    ...{ class: "reset-button" },
    disabled: (__VLS_ctx.resetting),
});
// @ts-ignore
[resetAuth, resetting,];
(__VLS_ctx.resetting ? 'リセット中...' : 'Google認証をリセット');
// @ts-ignore
[resetting,];
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ class: "remote-control-section" },
});
__VLS_asFunctionalElement(__VLS_elements.h2, __VLS_elements.h2)({});
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ class: "control-buttons" },
});
__VLS_asFunctionalElement(__VLS_elements.button, __VLS_elements.button)({
    ...{ onClick: (__VLS_ctx.reloadAllClients) },
    ...{ class: "reload-all-button" },
    disabled: (__VLS_ctx.reloading),
});
// @ts-ignore
[reloadAllClients, reloading,];
if (!__VLS_ctx.reloading) {
    // @ts-ignore
    [reloading,];
    __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({});
}
else {
    __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({});
}
__VLS_asFunctionalElement(__VLS_elements.p, __VLS_elements.p)({
    ...{ class: "control-description" },
});
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ class: "status-section" },
});
__VLS_asFunctionalElement(__VLS_elements.h3, __VLS_elements.h3)({});
__VLS_asFunctionalElement(__VLS_elements.p, __VLS_elements.p)({});
__VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({
    ...{ class: (__VLS_ctx.statusClass) },
});
// @ts-ignore
[statusClass,];
(__VLS_ctx.systemStatus);
// @ts-ignore
[systemStatus,];
__VLS_asFunctionalElement(__VLS_elements.p, __VLS_elements.p)({});
(__VLS_ctx.lastUpdate);
// @ts-ignore
[lastUpdate,];
if (__VLS_ctx.message) {
    // @ts-ignore
    [message,];
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
        ...{ class: "message" },
        ...{ class: (__VLS_ctx.messageClass) },
    });
    // @ts-ignore
    [messageClass,];
    (__VLS_ctx.message);
    // @ts-ignore
    [message,];
}
/** @type {__VLS_StyleScopedClasses['admin-container']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-header']} */ ;
/** @type {__VLS_StyleScopedClasses['logout-button']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-content']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-list-section']} */ ;
/** @type {__VLS_StyleScopedClasses['refresh-button']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-list']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-id']} */ ;
/** @type {__VLS_StyleScopedClasses['color-sample']} */ ;
/** @type {__VLS_StyleScopedClasses['no-calendars']} */ ;
/** @type {__VLS_StyleScopedClasses['config-section']} */ ;
/** @type {__VLS_StyleScopedClasses['config-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['json-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['error-message']} */ ;
/** @type {__VLS_StyleScopedClasses['button-group']} */ ;
/** @type {__VLS_StyleScopedClasses['save-button']} */ ;
/** @type {__VLS_StyleScopedClasses['reset-button']} */ ;
/** @type {__VLS_StyleScopedClasses['remote-control-section']} */ ;
/** @type {__VLS_StyleScopedClasses['control-buttons']} */ ;
/** @type {__VLS_StyleScopedClasses['reload-all-button']} */ ;
/** @type {__VLS_StyleScopedClasses['control-description']} */ ;
/** @type {__VLS_StyleScopedClasses['status-section']} */ ;
/** @type {__VLS_StyleScopedClasses['message']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            configJson: configJson,
            jsonError: jsonError,
            saving: saving,
            resetting: resetting,
            message: message,
            systemStatus: systemStatus,
            lastUpdate: lastUpdate,
            calendarList: calendarList,
            loadingCalendars: loadingCalendars,
            reloading: reloading,
            statusClass: statusClass,
            messageClass: messageClass,
            validateJson: validateJson,
            loadCalendarList: loadCalendarList,
            saveConfig: saveConfig,
            resetAuth: resetAuth,
            logout: logout,
            reloadAllClients: reloadAllClients,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
    },
});
; /* PartiallyEnd: #4569/main.vue */
