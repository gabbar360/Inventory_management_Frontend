import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { verifyToken } from '@/slices/authSlice';
import { initializeSocket, disconnectSocket } from '@/services/socketService';

const TokenVerifier = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const socketInitializedRef = useRef(false);

  useEffect(() => {
    console.log('[TOKEN VERIFIER] Verifying token on mount');
    dispatch(verifyToken());
  }, [dispatch]);

  useEffect(() => {
    console.log('[TOKEN VERIFIER] Auth state changed:', {
      isAuthenticated,
      hasUser: !!user,
      userId: user?.id,
      socketInitialized: socketInitializedRef.current,
    });

    if (isAuthenticated && user && !socketInitializedRef.current) {
      const token = localStorage.getItem('accessToken');
      console.log('[TOKEN VERIFIER] Conditions met for socket init:', {
        hasToken: !!token,
        tokenLength: token?.length,
      });

      if (token) {
        console.log('[TOKEN VERIFIER] ✅ Initializing socket with token');
        socketInitializedRef.current = true;
        initializeSocket(token);
      } else {
        console.log('[TOKEN VERIFIER] ❌ No token found in localStorage');
      }
    } else if (!isAuthenticated && socketInitializedRef.current) {
      console.log('[TOKEN VERIFIER] User logged out, disconnecting socket');
      socketInitializedRef.current = false;
      disconnectSocket();
    }
  }, [isAuthenticated, user]);

  return null;
};

export default TokenVerifier;
