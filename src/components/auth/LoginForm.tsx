'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export default function LoginForm({ onLogin, isLoading = false, error }: LoginFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {};
    
    if (!email) {
      errors.email = t('Login.EmailRequired');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = t('Login.ValidEmail');
    }
    
    if (!password) {
      errors.password = t('Login.PasswordRequired');
    } else if (password.length < 6) {
      errors.password = t('Login.PasswordMinLength');
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await onLogin(email, password);
    } catch {
      // Error handling is managed by parent component
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900 p-4">
      <div className="max-w-lg w-full space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.png"
              alt="PrimeMarket Terminal Logo"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
          <h1 className="text-lg text-white mb-4">
            {t('Login.Welcome')}
          </h1>
          <h2 className="text-5xl font-bold mb-8">
            <span className="text-white">{t('Login.PrimeMarketTerminal').split(' ')[0]}</span>{' '}
            <span className="text-orange-500">{t('Login.PrimeMarketTerminal').split(' ')[1]}</span>
          </h2>
          <p className="text-neutral-400 text-lg">
            {t('Login.SignInToAccess')}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-neutral-800 rounded-lg p-8 border border-neutral-700 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Global Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-neutral-300">
                {t('Login.EmailAddress')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`block w-full pl-10 pr-3 py-3 border ${
                    formErrors.email ? 'border-red-500' : 'border-neutral-600'
                  } rounded-lg bg-neutral-900 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-200`}
                  placeholder={t('Login.EmailPlaceholder')}
                />
              </div>
              {formErrors.email && (
                <p className="text-red-400 text-sm">{formErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-neutral-300">
                {t('Login.Password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`block w-full pl-10 pr-12 py-3 border ${
                    formErrors.password ? 'border-red-500' : 'border-neutral-600'
                  } rounded-lg bg-neutral-900 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-200`}
                  placeholder={t('Login.PasswordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-neutral-400 hover:text-neutral-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-neutral-400 hover:text-neutral-300" />
                  )}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-red-400 text-sm">{formErrors.password}</p>
              )}
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-white focus:ring-white border-neutral-600 rounded bg-neutral-900"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-300">
                  {t('Login.RememberMe')}
                </label>
              </div>
              <button
                type="button"
                className="text-sm text-neutral-400 hover:text-white transition-colors duration-200"
              >
                {t('Login.ForgotPassword')}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('Login.SigningIn')}
                </div>
              ) : (
                t('Login.SignInToPlatform')
              )}
            </button>
          </form>

        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-neutral-400 text-sm">
            {t('Login.DontHaveAccount')}{' '}
            <button className="text-white hover:text-neutral-300 font-medium transition-colors duration-200">
              {t('Login.ContactAdministrator')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}