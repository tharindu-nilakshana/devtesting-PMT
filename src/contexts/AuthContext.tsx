'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_CONFIG } from '../lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string; // e.g., plan name
  avatar?: string;
  timezone?: string;
  tvTimezone?: string;
  timeOffset?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
  serverUser?: User | null;
}

export function AuthProvider({ children, serverUser }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(serverUser || null);
  const [isLoading, setIsLoading] = useState(!serverUser);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount (skip if we have serverUser)
  useEffect(() => {
    if (!serverUser) {
      checkAuthStatus();
    }
  }, [serverUser]);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      
      // Try server-side authentication check first
      try {
        const serverResponse = await fetch('/api/auth/verify', {
          method: 'GET',
          credentials: 'include', // Include cookies
        });

        if (serverResponse.ok) {
          const serverData = await serverResponse.json();
          if (serverData.authenticated && serverData.user) {
            setUser(serverData.user);
            setIsLoading(false);
            return;
          }
        }
      } catch (serverError) {
        console.warn('Server-side auth check failed, falling back to client-side:', serverError);
      }
      
      // Fallback to client-side authentication check
      const token = localStorage.getItem('pmt_auth_token');
      
      // console.log('🔑 AUTH TOKEN FOR TESTING:', token);
      // console.log('📋 Copy this token for curl commands:');
      // console.log(`curl --location 'https://frontendapi.primemarket-terminal.com/getTemplatesByUserWeb' --header 'Content-Type: application/json' --header 'Authorization: Bearer ${token}' --data '{}'`);
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Validate token with your backend API
      const isValidToken = token ? await validateToken(token) : false;
      
      if (isValidToken && token) {
        // In a real app, you'd fetch user data from your API
        const userData = await fetchUserData();
        if (userData) {
          setUser(userData);
        }
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('pmt_auth_token');
        localStorage.removeItem('pmt_user_data');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('pmt_auth_token');
      localStorage.removeItem('pmt_user_data');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Try server-side authentication first
      try {
        const serverResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const serverData = await serverResponse.json();

        if (serverResponse.ok && serverData.success && serverData.user) {
          // Server-side authentication successful
          if (serverData.token) {
            // Store token in localStorage for client-side API calls
            localStorage.setItem('pmt_auth_token', serverData.token);
            localStorage.setItem('pmt_user_data', JSON.stringify(serverData.user));
            
            // Removed debug console.log for production
          }
          setUser(serverData.user);
          return;
        } else {
          throw new Error(serverData.error || 'Server authentication failed');
        }
      } catch (serverError) {
        console.warn('Server-side auth failed, falling back to client-side:', serverError);
        
        // Fallback to original client-side authentication
        const response = await authenticateUser(email, password);
        
        if (response.success && response.token && response.user) {
          const { token, user: userData } = response;
          
          // Store token and user data (for backward compatibility)
          localStorage.setItem('pmt_auth_token', token);
          localStorage.setItem('pmt_user_data', JSON.stringify(userData));
          
          // Removed debug console.log for production
          
          setUser(userData);
        } else {
          throw new Error(response.message || 'Authentication failed');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during login';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Try server-side logout first
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.warn('Server-side logout failed:', error);
    }
    
    // Clear client-side state and storage
    setUser(null);
    setError(null);
    localStorage.removeItem('pmt_auth_token');
    localStorage.removeItem('pmt_user_data');
    localStorage.removeItem('pmt_active_template_id'); // Clear active template ID
    
    // Clear templates and widgets cache
    // Note: Main grid positions are now fetched from API only (no localStorage caching)
    // Tab grid positions and template grid sizes are still stored in localStorage
    try {
      localStorage.removeItem('pmt_templates_cache');
      localStorage.removeItem('pmt_tab_widgets');
      localStorage.removeItem('pmt_symbols_cache'); // Clear symbols cache
      console.log('🗑️ Cleared templates cache on logout');
      
      // Clear all widget caches and tabbed widgets
      const WIDGETS_CACHE_PREFIX = 'pmt_widgets_cache_';
      const TABBED_WIDGET_PREFIX = 'pmt_tabbed_widget_';
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(WIDGETS_CACHE_PREFIX) || key.startsWith(TABBED_WIDGET_PREFIX))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      if (keysToRemove.length > 0) {
        console.log(`🗑️ Cleared ${keysToRemove.length} widget cache(s) on logout`);
      }
      
      console.log('✅ Logout complete - grid positions will be fetched from API on next login');
    } catch (error) {
      console.error('Error clearing templates/widgets cache on logout:', error);
    }
    
    // Redirect to login page
    window.location.href = '/login';
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    
    // Update localStorage as well
    localStorage.setItem('pmt_user_data', JSON.stringify(updatedUser));
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Real API authentication function
async function authenticateUser(email: string, password: string) {
  try {
    
      const response = await fetch(`${API_CONFIG.UPSTREAM_API}userLogin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.API_TOKEN}`
        },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    const data = await response.json();


    // Check if the API returned an error
    if (data.error) {
      return {
        success: false,
        message: data.error,
        token: undefined,
        user: undefined
      };
    }

    // Check for successful login - API returns loginToken and userEmail
    if (response.ok && data.loginToken && data.userEmail) {
      const ud = data.userData || {};
      const profilePicture = ud.LoggedInProfilePicture ? `${API_CONFIG.UPSTREAM_API}uploads/profile/${ud.LoggedInProfilePicture}` : undefined;
      const user: User = {
        id: String(ud.LoggedInUserID ?? btoa(data.userEmail).slice(0, 8)),
        email: data.userEmail,
        name: ud.LoggedInName || data.userEmail.split('@')[0],
        role: ud.LoggedInPlanName || 'Platform User',
        avatar: profilePicture,
        timezone: ud.LoggedInTimezone || ud.LoggedInTVTimezone,
        tvTimezone: ud.LoggedInTVTimezone,
        timeOffset: ud.LoggedInTimeOffset,
      };

      return {
        success: true,
        token: data.loginToken,
        user: user,
        message: undefined
      };
    } else {
      return {
        success: false,
        message: 'Authentication failed - invalid response format',
        token: undefined,
        user: undefined
      };
    }
  } catch (error) {
    console.error('Authentication API error:', error);
    return {
      success: false,
      message: 'Network error. Please check your connection and try again.',
      token: undefined,
      user: undefined
    };
  }
}

async function validateToken(token: string): Promise<boolean> {
  try {
    // The API returns loginToken in format: "xxx-xxx-xxx-xxx" (long hyphenated string)
    // For now, we'll validate based on the expected format and length
    return Boolean(token && token.length > 50 && token.includes('-'));
    
    // Uncomment and modify this if you have a token validation endpoint:
    /*
    const response = await fetch(`${API_CONFIG.UPSTREAM_API}validateToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.ok;
    */
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

async function fetchUserData(): Promise<User | null> {
  try {
    // Simulate fetching user data
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // In a real app, you'd fetch this from your backend using the token
    // For now, we'll return cached user data
    const userData = localStorage.getItem('pmt_user_data');
    if (userData) {
      return JSON.parse(userData);
    }
    
    // Return null if no user data found
    return null;
  } catch (err) {
    console.error('Failed to fetch user data:', err);
    return null;
  }
}
