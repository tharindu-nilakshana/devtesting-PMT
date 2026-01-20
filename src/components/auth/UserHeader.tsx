'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { User, ChevronDown, TrendingUp, BarChart3, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProfilePanel } from '@/components/auth/ProfilePanel';

export default function UserHeader() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const handleProfileClick = () => {
    setIsProfilePanelOpen(true);
  };

  if (!user) return null;

  return (
    <header className="bg-neutral-800 border-b border-neutral-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Platform Name */}
          <div className="flex items-center">
            <div className="bg-white p-2 rounded-lg mr-3">
              <TrendingUp className="h-6 w-6 text-neutral-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{t('UserHeader.PMTPlatform')}</h1>
              <p className="text-sm text-neutral-400">{t('UserHeader.PortfolioManagementTools')}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className="flex items-center space-x-2 text-neutral-300 hover:text-white transition-colors duration-200"
            >
              <Home className="h-4 w-4" />
              <span>{t('UserHeader.Dashboard')}</span>
            </Link>
            <Link 
              href="/seasonality" 
              className="flex items-center space-x-2 text-neutral-300 hover:text-white transition-colors duration-200"
            >
              <BarChart3 className="h-4 w-4" />
              <span>{t('UserHeader.Seasonality')}</span>
            </Link>
          </nav>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={handleProfileClick}
              className="flex items-center space-x-3 text-white hover:bg-neutral-700 rounded-lg px-3 py-2 transition-all duration-200"
            >
              {/* User Avatar */}
              <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4 text-neutral-900" />
                )}
              </div>

              {/* User Info */}
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-neutral-400">{user.role}</p>
              </div>

              {/* Dropdown Arrow */}
              <ChevronDown 
                className={`h-4 w-4 text-neutral-400 transition-transform duration-200`} 
              />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Panel */}
      <ProfilePanel
        isOpen={isProfilePanelOpen}
        onClose={() => setIsProfilePanelOpen(false)}
        onLogout={handleLogout}
      />
    </header>
  );
}
