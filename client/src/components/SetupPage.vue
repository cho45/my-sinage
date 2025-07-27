<template>
  <div class="setup-container">
    <div class="setup-card">
      <h1>初回セットアップ</h1>
      
      <div v-if="loading" class="loading">
        <p>認証状態を確認中...</p>
      </div>
      
      <div v-else-if="!authenticated" class="auth-section">
        <p>Google Calendar と連携するために認証が必要です</p>
        <button 
          @click="startAuth" 
          class="auth-button"
          :disabled="authInProgress"
        >
          Google アカウントで認証する
        </button>
        <p class="auth-note">※ カレンダーの読み取り権限のみ要求します</p>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
      
      <div v-else class="success-section">
        <p class="success-message">✓ 認証完了しました</p>
        <button @click="goToHome" class="home-button">
          カレンダー画面へ
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'

const loading = ref(true)
const authenticated = ref(false)
const authInProgress = ref(false)
const error = ref('')

const checkAuthStatus = async () => {
  try {
    const response = await axios.get('/auth/status')
    authenticated.value = response.data.authenticated
  } catch (err) {
    console.error('Failed to check auth status:', err)
    error.value = '認証状態の確認に失敗しました'
  } finally {
    loading.value = false
  }
}

const startAuth = () => {
  authInProgress.value = true
  window.location.href = '/auth/login'
}

const goToHome = () => {
  window.location.href = '/'
}

onMounted(async () => {
  // Check for error in query params
  const urlParams = new URLSearchParams(window.location.search)
  const authError = urlParams.get('error')
  
  if (authError) {
    switch (authError) {
      case 'auth_denied':
        error.value = '認証がキャンセルされました'
        break
      case 'no_code':
        error.value = '認証コードが取得できませんでした'
        break
      case 'token_exchange_failed':
        error.value = 'トークンの取得に失敗しました'
        break
      default:
        error.value = '認証エラーが発生しました'
    }
  }
  
  await checkAuthStatus()
})
</script>

<style scoped>
.setup-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
}

.setup-card {
  background: white;
  border-radius: 8px;
  padding: 48px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
  text-align: center;
}

h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 32px;
  color: #333;
}

.loading {
  padding: 40px 0;
  color: #666;
}

.auth-section p {
  margin-bottom: 24px;
  color: #555;
  line-height: 1.6;
}

.auth-button {
  background-color: #4285F4;
  color: white;
  border: none;
  padding: 12px 32px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  font-family: 'Noto Sans JP', sans-serif;
}

.auth-button:hover:not(:disabled) {
  background-color: #357AE8;
}

.auth-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-note {
  font-size: 14px;
  color: #666;
  margin-top: 16px;
}

.error-message {
  margin-top: 24px;
  padding: 12px;
  background-color: #FEE;
  border: 1px solid #FCC;
  border-radius: 4px;
  color: #C00;
}

.success-section {
  padding: 40px 0;
}

.success-message {
  color: #0A0;
  font-size: 18px;
  margin-bottom: 24px;
}

.home-button {
  background-color: #0A0;
  color: white;
  border: none;
  padding: 12px 32px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  font-family: 'Noto Sans JP', sans-serif;
}

.home-button:hover {
  background-color: #080;
}
</style>