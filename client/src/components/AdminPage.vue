<template>
  <div class="admin-container">
    <div class="admin-header">
      <h1>設定管理</h1>
      <button @click="logout" class="logout-button">ログアウト</button>
    </div>
    
    <div class="admin-content">
      <div class="calendar-list-section">
        <h2>利用可能なカレンダー</h2>
        <button @click="loadCalendarList" class="refresh-button" :disabled="loadingCalendars">
          {{ loadingCalendars ? '読み込み中...' : 'カレンダーリストを更新' }}
        </button>
        
        <div v-if="calendarList.length > 0" class="calendar-list">
          <table>
            <thead>
              <tr>
                <th>カレンダー名</th>
                <th>ID</th>
                <th>背景色</th>
                <th>アクセス権限</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cal in calendarList" :key="cal.id">
                <td>{{ cal.summary }}</td>
                <td class="calendar-id">{{ cal.id }}</td>
                <td>
                  <span 
                    class="color-sample" 
                    :style="{ backgroundColor: cal.backgroundColor }"
                  ></span>
                  {{ cal.backgroundColor }}
                </td>
                <td>{{ cal.accessRole }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div v-else-if="!loadingCalendars" class="no-calendars">
          カレンダーリストを取得するには「カレンダーリストを更新」ボタンをクリックしてください
        </div>
      </div>

      <div class="config-section">
        <h2>カレンダー設定</h2>
        <div class="config-editor">
          <textarea 
            v-model="configJson" 
            class="json-editor"
            :class="{ 'error': jsonError }"
            @input="validateJson"
            spellcheck="false"
          ></textarea>
          <div v-if="jsonError" class="error-message">
            {{ jsonError }}
          </div>
        </div>
        
        <div class="button-group">
          <button 
            @click="saveConfig" 
            class="save-button"
            :disabled="!!jsonError || saving"
          >
            {{ saving ? '保存中...' : '保存' }}
          </button>
          <button 
            @click="resetAuth" 
            class="reset-button"
            :disabled="resetting"
          >
            {{ resetting ? 'リセット中...' : 'Google認証をリセット' }}
          </button>
        </div>
      </div>
      
      <div class="remote-control-section">
        <h2>リモートコントロール</h2>
        <div class="control-buttons">
          <button 
            @click="reloadAllClients" 
            class="reload-all-button"
            :disabled="reloading"
          >
            <span v-if="!reloading">🔄 全画面をリロード</span>
            <span v-else>リロード中...</span>
          </button>
          <p class="control-description">
            接続中のすべてのクライアント画面をリロードします
          </p>
        </div>
      </div>
      
      <div class="status-section">
        <h3>システム状態</h3>
        <p>ステータス: <span :class="statusClass">{{ systemStatus }}</span></p>
        <p>最終更新: {{ lastUpdate }}</p>
      </div>
      
      <div v-if="message" class="message" :class="messageClass">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { Config } from '@/types'

const configJson = ref('')
const jsonError = ref('')
const saving = ref(false)
const resetting = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const systemStatus = ref('正常')
const lastUpdate = ref('-')
const calendarList = ref<any[]>([])
const loadingCalendars = ref(false)
const reloading = ref(false)

const statusClass = computed(() => ({
  'status-ok': systemStatus.value === '正常',
  'status-error': systemStatus.value !== '正常'
}))

const messageClass = computed(() => ({
  'success-message': messageType.value === 'success',
  'error-message': messageType.value === 'error'
}))

const validateJson = () => {
  try {
    if (configJson.value.trim()) {
      JSON.parse(configJson.value)
      jsonError.value = ''
    }
  } catch (err) {
    jsonError.value = 'JSONフォーマットが正しくありません'
  }
}

const loadCalendarList = async () => {
  loadingCalendars.value = true
  try {
    const response = await axios.get('/api/calendars')
    calendarList.value = response.data.calendars
    showMessage('カレンダーリストを取得しました', 'success')
  } catch (err) {
    showMessage('カレンダーリストの取得に失敗しました', 'error')
  } finally {
    loadingCalendars.value = false
  }
}

const loadConfig = async () => {
  try {
    const response = await axios.get('/api/config', {
      auth: {
        username: 'admin',
        password: prompt('管理者パスワードを入力してください') || ''
      }
    })
    
    configJson.value = JSON.stringify(response.data, null, 2)
    updateLastUpdate()
  } catch (err: any) {
    if (err.response?.status === 401) {
      showMessage('認証に失敗しました', 'error')
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    } else {
      showMessage('設定の読み込みに失敗しました', 'error')
    }
  }
}

const saveConfig = async () => {
  saving.value = true
  try {
    const config: Config = JSON.parse(configJson.value)
    await axios.post('/api/config', config)
    
    showMessage('設定を保存しました', 'success')
    updateLastUpdate()
  } catch (err) {
    showMessage('設定の保存に失敗しました', 'error')
  } finally {
    saving.value = false
  }
}

const resetAuth = async () => {
  if (!confirm('Google認証情報をリセットしますか？\n再度認証が必要になります。')) {
    return
  }
  
  resetting.value = true
  try {
    await axios.post('/api/auth/reset')
    showMessage('認証情報をリセットしました', 'success')
    
    setTimeout(() => {
      window.location.href = '/setup'
    }, 2000)
  } catch (err) {
    showMessage('リセットに失敗しました', 'error')
  } finally {
    resetting.value = false
  }
}

const logout = () => {
  // Clear session and redirect
  window.location.href = '/'
}

const showMessage = (text: string, type: 'success' | 'error') => {
  message.value = text
  messageType.value = type
  
  setTimeout(() => {
    message.value = ''
  }, 5000)
}

const updateLastUpdate = () => {
  lastUpdate.value = new Date().toLocaleString('ja-JP')
}

const reloadAllClients = async () => {
  if (!confirm('すべてのクライアント画面をリロードしますか？')) {
    return
  }
  
  reloading.value = true
  try {
    const response = await axios.post('/api/admin/reload')
    showMessage(
      `${response.data.message} (接続数: ${response.data.totalClients})`,
      'success'
    )
  } catch (err) {
    showMessage('リロードコマンドの送信に失敗しました', 'error')
  } finally {
    reloading.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.admin-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 24px;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.admin-header h1 {
  margin: 0;
  color: #333;
  font-size: 28px;
}

.logout-button {
  background-color: #666;
  color: white;
  border: none;
  padding: 8px 20px;
  font-size: 14px;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Noto Sans JP', sans-serif;
}

.logout-button:hover {
  background-color: #555;
}

.admin-content {
  max-width: 1200px;
  margin: 0 auto;
}

.calendar-list-section {
  background: white;
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.calendar-list-section h2 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #333;
}

.refresh-button {
  background-color: #4285F4;
  color: white;
  border: none;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Noto Sans JP', sans-serif;
  margin-bottom: 20px;
}

.refresh-button:hover:not(:disabled) {
  background-color: #357AE8;
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.calendar-list table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.calendar-list th,
.calendar-list td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.calendar-list th {
  background-color: #f5f5f5;
  font-weight: 600;
  color: #333;
}

.calendar-list tr:hover {
  background-color: #f9f9f9;
}

.calendar-id {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  background-color: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  word-break: break-all;
}

.color-sample {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  vertical-align: middle;
  margin-right: 8px;
  border: 1px solid #ddd;
}

.no-calendars {
  color: #666;
  font-style: italic;
  padding: 20px;
  text-align: center;
}

.config-section {
  background: white;
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.config-section h2 {
  margin-top: 0;
  margin-bottom: 24px;
  color: #333;
}

.config-editor {
  margin-bottom: 24px;
}

.json-editor {
  width: 100%;
  min-height: 400px;
  padding: 16px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  background-color: #f9f9f9;
}

.json-editor.error {
  border-color: #C00;
}

.json-editor:focus {
  outline: none;
  border-color: #4285F4;
  background-color: white;
}

.button-group {
  display: flex;
  gap: 16px;
}

.save-button {
  background-color: #4285F4;
  color: white;
  border: none;
  padding: 10px 24px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Noto Sans JP', sans-serif;
}

.save-button:hover:not(:disabled) {
  background-color: #357AE8;
}

.save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reset-button {
  background-color: #DB4437;
  color: white;
  border: none;
  padding: 10px 24px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Noto Sans JP', sans-serif;
}

.reset-button:hover:not(:disabled) {
  background-color: #C23321;
}

.reset-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.remote-control-section {
  background: white;
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.remote-control-section h2 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #333;
}

.control-buttons {
  margin-top: 16px;
}

.reload-all-button {
  background-color: #ff9800;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.reload-all-button:hover:not(:disabled) {
  background-color: #f57c00;
}

.reload-all-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.control-description {
  margin-top: 12px;
  color: #666;
  font-size: 14px;
}

.status-section {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.status-section h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #333;
}

.status-section p {
  margin: 8px 0;
  color: #666;
}

.status-ok {
  color: #0A0;
  font-weight: 500;
}

.status-error {
  color: #C00;
  font-weight: 500;
}

.message {
  padding: 16px;
  border-radius: 4px;
  text-align: center;
  font-weight: 500;
  margin-top: 24px;
}

.success-message {
  background-color: #DFD;
  border: 1px solid #0A0;
  color: #080;
}

.error-message {
  background-color: #FEE;
  border: 1px solid #FCC;
  color: #C00;
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 8px;
  font-size: 14px;
}
</style>