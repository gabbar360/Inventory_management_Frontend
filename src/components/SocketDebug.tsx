import { useEffect, useState } from 'react';
import { getSocket } from '@/services/socketService';

const SocketDebug = () => {
  const [status, setStatus] = useState('disconnected');
  const [socketId, setSocketId] = useState('');

  useEffect(() => {
    const checkSocket = setInterval(() => {
      const socket = getSocket();
      if (socket) {
        setStatus(socket.connected ? 'connected' : 'disconnected');
        setSocketId(socket.id || '');
      } else {
        setStatus('not initialized');
      }
    }, 1000);

    return () => clearInterval(checkSocket);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-3 rounded text-xs font-mono z-50">
      <div>Socket: {status}</div>
      <div>ID: {socketId || 'none'}</div>
    </div>
  );
};

export default SocketDebug;
