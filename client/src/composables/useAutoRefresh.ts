import { ref, onMounted, onUnmounted } from 'vue'

export function useAutoRefresh(callback: () => void | Promise<void>, intervalMs: number = 10 * 60 * 1000) {
  const intervalId = ref<number | null>(null)
  const isRunning = ref(false)

  const start = () => {
    if (isRunning.value) return
    
    isRunning.value = true
    intervalId.value = window.setInterval(async () => {
      await callback()
    }, intervalMs)
  }

  const stop = () => {
    if (intervalId.value !== null) {
      clearInterval(intervalId.value)
      intervalId.value = null
      isRunning.value = false
    }
  }

  const restart = () => {
    stop()
    start()
  }

  onMounted(() => {
    start()
  })

  onUnmounted(() => {
    stop()
  })

  return {
    isRunning,
    start,
    stop,
    restart
  }
}