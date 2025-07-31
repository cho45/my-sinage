/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0.d.ts" />
import { ref, onMounted } from 'vue';
import axios from 'axios';
const loading = ref(true);
const authenticated = ref(false);
const authInProgress = ref(false);
const error = ref('');
const checkAuthStatus = async () => {
    try {
        const response = await axios.get('/auth/status');
        authenticated.value = response.data.authenticated;
    }
    catch (err) {
        console.error('Failed to check auth status:', err);
        error.value = '認証状態の確認に失敗しました';
    }
    finally {
        loading.value = false;
    }
};
const startAuth = () => {
    authInProgress.value = true;
    window.location.href = '/auth/login';
};
const goToHome = () => {
    window.location.href = '/';
};
onMounted(async () => {
    // Check for error in query params
    const urlParams = new URLSearchParams(window.location.search);
    const authError = urlParams.get('error');
    if (authError) {
        switch (authError) {
            case 'auth_denied':
                error.value = '認証がキャンセルされました';
                break;
            case 'no_code':
                error.value = '認証コードが取得できませんでした';
                break;
            case 'token_exchange_failed':
                error.value = 'トークンの取得に失敗しました';
                break;
            default:
                error.value = '認証エラーが発生しました';
        }
    }
    await checkAuthStatus();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_elements;
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['auth-button']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-button']} */ ;
/** @type {__VLS_StyleScopedClasses['home-button']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ class: "setup-container" },
});
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
    ...{ class: "setup-card" },
});
__VLS_asFunctionalElement(__VLS_elements.h1, __VLS_elements.h1)({});
if (__VLS_ctx.loading) {
    // @ts-ignore
    [loading,];
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
        ...{ class: "loading" },
    });
    __VLS_asFunctionalElement(__VLS_elements.p, __VLS_elements.p)({});
}
else if (!__VLS_ctx.authenticated) {
    // @ts-ignore
    [authenticated,];
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
        ...{ class: "auth-section" },
    });
    __VLS_asFunctionalElement(__VLS_elements.p, __VLS_elements.p)({});
    __VLS_asFunctionalElement(__VLS_elements.button, __VLS_elements.button)({
        ...{ onClick: (__VLS_ctx.startAuth) },
        ...{ class: "auth-button" },
        disabled: (__VLS_ctx.authInProgress),
    });
    // @ts-ignore
    [startAuth, authInProgress,];
    __VLS_asFunctionalElement(__VLS_elements.p, __VLS_elements.p)({
        ...{ class: "auth-note" },
    });
    if (__VLS_ctx.error) {
        // @ts-ignore
        [error,];
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
            ...{ class: "error-message" },
        });
        (__VLS_ctx.error);
        // @ts-ignore
        [error,];
    }
}
else {
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({
        ...{ class: "success-section" },
    });
    __VLS_asFunctionalElement(__VLS_elements.p, __VLS_elements.p)({
        ...{ class: "success-message" },
    });
    __VLS_asFunctionalElement(__VLS_elements.button, __VLS_elements.button)({
        ...{ onClick: (__VLS_ctx.goToHome) },
        ...{ class: "home-button" },
    });
    // @ts-ignore
    [goToHome,];
}
/** @type {__VLS_StyleScopedClasses['setup-container']} */ ;
/** @type {__VLS_StyleScopedClasses['setup-card']} */ ;
/** @type {__VLS_StyleScopedClasses['loading']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-section']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-button']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-note']} */ ;
/** @type {__VLS_StyleScopedClasses['error-message']} */ ;
/** @type {__VLS_StyleScopedClasses['success-section']} */ ;
/** @type {__VLS_StyleScopedClasses['success-message']} */ ;
/** @type {__VLS_StyleScopedClasses['home-button']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            authenticated: authenticated,
            authInProgress: authInProgress,
            error: error,
            startAuth: startAuth,
            goToHome: goToHome,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
    },
});
; /* PartiallyEnd: #4569/main.vue */
