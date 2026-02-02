import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private readonly URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'; // Adjust as needed

  connect(token: string) {
    if (this.socket) {
      if (this.socket.connected) return;
      this.socket.connect();
      return;
    }

    // Extract origin to ensure we don't include /api prefix in the socket URL
    // WebSockets are typically hosted at root, matching the gateway namespace
    const baseUrl = this.URL.replace(/\/api$/, '');
    
    this.socket = io(`${baseUrl}/notifications`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string) {
    if (this.socket) {
      this.socket.off(event);
    }
  }
}

export const socketService = new SocketService();
