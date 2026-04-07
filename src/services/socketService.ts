import io, { Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = (token: string) => {
  if (socket?.connected) {
    console.log('[SOCKET] Socket already connected');
    return socket;
  }

  const BASE_URL = import.meta.env.VITE_SOCKET_URL;
  const isProduction = import.meta.env.MODE === 'production';

  console.log('[SOCKET] Initializing socket connection to:', BASE_URL);

  try {
    socket = io(BASE_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
      // Production settings
      ...(isProduction && {
        secure: true,
        rejectUnauthorized: false,
        withCredentials: true,
      }),
    });

    socket.on('connect', () => {
      console.log('[SOCKET] Connected successfully, socketId:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
    });

    socket.on('connect_error', (error: any) => {
      console.log('[SOCKET] Connection error:', error.message);
    });

  } catch (error: any) {
    console.error('[SOCKET] Error creating socket:', error.message);
  }

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log('[SOCKET] Disconnecting socket');
    socket.disconnect();
    socket = null;
  }
};
