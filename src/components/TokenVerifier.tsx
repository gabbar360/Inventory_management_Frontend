import { useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { verifyToken } from '@/slices/authSlice';

const TokenVerifier = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    console.log('[TOKEN VERIFIER] Verifying token on mount');
    dispatch(verifyToken());
  }, [dispatch]);

  return null;
};

export default TokenVerifier;
