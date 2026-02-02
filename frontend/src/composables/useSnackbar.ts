import { ref } from 'vue'

export interface SnackbarMessage {
  text: string
  color: 'success' | 'error' | 'warning' | 'info'
  timeout?: number
}

const visible = ref(false)
const message = ref('')
const color = ref<'success' | 'error' | 'warning' | 'info'>('success')
const timeout = ref(3000)

export function useSnackbar() {
  const show = (options: SnackbarMessage) => {
    message.value = options.text
    color.value = options.color
    timeout.value = options.timeout || 3000
    visible.value = true
  }

  const success = (text: string) => {
    show({ text, color: 'success' })
  }

  const error = (text: string) => {
    show({ text, color: 'error', timeout: 5000 })
  }

  const warning = (text: string) => {
    show({ text, color: 'warning' })
  }

  const info = (text: string) => {
    show({ text, color: 'info' })
  }

  const hide = () => {
    visible.value = false
  }

  return {
    visible,
    message,
    color,
    timeout,
    show,
    success,
    error,
    warning,
    info,
    hide,
  }
}
