import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { verifyToken } from '@/slices/authSlice';

const TokenVerifier = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    console.log('[TOKEN VERIFIER] Verifying token on mount');
    dispatch(verifyToken());
  }, [dispatch]);

  return null;
};

export default TokenVerifier;
