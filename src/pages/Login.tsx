import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginUser } from '@/slices/authSlice';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await dispatch(loginUser(data)).unwrap();
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      const errorMessage = error?.message || error || 'Invalid email or password';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f3f4f6] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-6">
        {/* Logo/Icon Header */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded bg-primary-600 flex items-center justify-center shadow text-white mb-2.5">
            <span className="text-xl font-black italic">N</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">NovaStock</h2>
        </div>

        {/* Clean Login Sheet Card */}
        <div className="bg-white border border-gray-200 rounded shadow-md p-6 sm:p-8">
          <div className="text-center mb-6">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
              Log in
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="inventory@vegnar.com"
                    className={`block w-full px-3 py-1.5 border ${
                      errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                    } rounded-sm text-xs bg-gray-50/30 focus:outline-none focus:ring-1 outline-none transition-colors`}
                    {...register('email')}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-650 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`block w-full pl-3 pr-9 py-1.5 border ${
                      errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                    } rounded-sm text-xs bg-gray-50/30 focus:outline-none focus:ring-1 outline-none transition-colors`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-650 mt-1">{errors.password.message}</p>}
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors"
              >
                Reset Password?
              </Link>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded bg-primary-600 hover:bg-primary-700 active:bg-primary-800 shadow-sm text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Log in'}
              </button>
            </div>
          </form>
        </div>
        <div className="text-center text-[10px] text-gray-400 font-medium">
          Powered by <a href="https://www.novastock.com" target="_blank" rel="noreferrer" className="text-primary-500 hover:underline">NovaStock</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
