import { io, Socket } from 'socket.io-client'

class ChatSocketService {
  private socket: Socket | null = null
  private readonly URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  private pendingListeners: Array<{ event: string; callback: (...args: any[]) => void }> = []

  connect(token: string | null) {
    if (!token) return

    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.auth = { token }
        this.socket.connect()
      }
      return
    }

    const baseUrl = this.URL.replace(/\/api$/, '')
    
    this.socket = io(`${baseUrl}/chat`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    })

    this.socket.on('connect', () => {
      // Register any pending listeners on reconnect
      this.pendingListeners.forEach(({ event, callback }) => {
        this.socket?.on(event, callback)
      })
    })

    this.socket.on('connect_error', (err) => {
      console.error('Chat socket connection error:', err.message || err)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    // Store for reconnection
    this.pendingListeners.push({ event, callback })
    // Also register immediately if socket exists
    this.socket?.on(event, callback)
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (!this.socket) return
    // Remove from pending listeners
    if (callback) {
      this.pendingListeners = this.pendingListeners.filter(
        l => !(l.event === event && l.callback === callback)
      )
      this.socket.off(event, callback)
    } else {
      this.pendingListeners = this.pendingListeners.filter(l => l.event !== event)
      this.socket.off(event)
    }
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data)
  }

  emitTyping(threadId: string, isTyping: boolean) {
    this.socket?.emit('chat:typing', { threadId, isTyping })
  }

  joinThread(threadId: string) {
    this.socket?.emit('chat:joinThread', { threadId })
  }

  leaveThread(threadId: string) {
    this.socket?.emit('chat:leaveThread', { threadId })
  }

  markRead(threadId: string) {
    this.socket?.emit('chat:read', { threadId })
  }
}

export const chatSocketService = new ChatSocketService()

