// System Variables Utilities - Easy access to system-wide variables throughout the codebase
import { SystemVariablesCookieManager } from '../lib/systemVariables'
import type { SystemVariables } from '../types/systemVariables'

/**
 * Utility class for accessing system variables anywhere in the codebase
 */
export class SystemVariablesUtils {
  /**
   * Get all system variables
   */
  static async getAllVariables(): Promise<SystemVariables | null> {
    return await SystemVariablesCookieManager.getSystemVariables()
  }

  /**
   * Get user identity variables
   */
  static async getUserIdentity() {
    return await SystemVariablesCookieManager.getVariableGroup('userIdentity')
  }

  /**
   * Get subscription plan variables
   */
  static async getSubscriptionPlan() {
    return await SystemVariablesCookieManager.getVariableGroup('subscriptionPlan')
  }

  /**
   * Get dashboard layout variables
   */
  static async getDashboardLayout() {
    return await SystemVariablesCookieManager.getVariableGroup('dashboardLayout')
  }

  /**
   * Get appearance settings variables
   */
  static async getAppearanceSettings() {
    return await SystemVariablesCookieManager.getVariableGroup('appearanceSettings')
  }

  /**
   * Get timezone settings variables
   */
  static async getTimezoneSettings() {
    return await SystemVariablesCookieManager.getVariableGroup('timezoneSettings')
  }

  /**
   * Get billing payment variables
   */
  static async getBillingPayment() {
    return await SystemVariablesCookieManager.getVariableGroup('billingPayment')
  }

  /**
   * Get customization settings variables
   */
  static async getCustomizationSettings() {
    return await SystemVariablesCookieManager.getVariableGroup('customizationSettings')
  }

  /**
   * Get notification settings variables
   */
  static async getNotificationSettings() {
    return await SystemVariablesCookieManager.getVariableGroup('notificationSettings')
  }

  // Convenience methods for commonly used variables
  static async getUserId(): Promise<string | null> {
    return await SystemVariablesCookieManager.getVariable('LoggedInUserID') as string | null
  }

  static async getUserName(): Promise<string | null> {
    return await SystemVariablesCookieManager.getVariable('LoggedInName') as string | null
  }

  static async getUserEmail(): Promise<string | null> {
    return await SystemVariablesCookieManager.getVariable('LoggedInEmail') as string | null
  }

  static async getProfilePicture(): Promise<string | null> {
    return await SystemVariablesCookieManager.getVariable('LoggedInProfilePicture') as string | null
  }

  static async getDarkMode(): Promise<0 | 1 | null> {
    return await SystemVariablesCookieManager.getVariable('DarkModeOn') as 0 | 1 | null
  }

  static async getFixedScroll(): Promise<boolean | null> {
    return await SystemVariablesCookieManager.getVariable('FixedScrollOn') as boolean | null
  }

  static async getTimezone(): Promise<string | null> {
    return await SystemVariablesCookieManager.getVariable('LoggedInTimezone') as string | null
  }

  static async getTimezoneOffset(): Promise<string | null> {
    return await SystemVariablesCookieManager.getVariable('LoggedInTimeOffset') as string | null
  }

  static async getPlanName(): Promise<string | null> {
    return await SystemVariablesCookieManager.getVariable('LoggedInPlanName') as string | null
  }

  static async getExpiryDate(): Promise<string | null> {
    return await SystemVariablesCookieManager.getVariable('LoggedInExpiryDate') as string | null
  }

  static async getExpiresIn(): Promise<number | null> {
    return await SystemVariablesCookieManager.getVariable('LoggedInExpiresIn') as number | null
  }

  static async isExpired(): Promise<0 | 1 | null> {
    return await SystemVariablesCookieManager.getVariable('LoggedInIsExpired') as 0 | 1 | null
  }

  static async getSocketToken(): Promise<string | null> {
    return await SystemVariablesCookieManager.getVariable('LoggedInSocketToken') as string | null
  }

  static async getNotificationsOn(): Promise<0 | 1 | null> {
    return await SystemVariablesCookieManager.getVariable('NotificationsOn') as 0 | 1 | null
  }

  static async getFirstLogin(): Promise<boolean | null> {
    return await SystemVariablesCookieManager.getVariable('first_login') as boolean | null
  }

  static async getLastFiveSearch(): Promise<string[] | null> {
    return await SystemVariablesCookieManager.getVariable('LastFiveSearch') as string[] | null
  }

  static async getNewWidgetLayout(): Promise<0 | 1 | null> {
    return await SystemVariablesCookieManager.getVariable('NewWidgetLayout') as 0 | 1 | null
  }

  /**
   * Check if user has valid system variables
   */
  static async hasValidVariables(): Promise<boolean> {
    return await SystemVariablesCookieManager.hasValidSystemVariables()
  }

  /**
   * Get user ID from system variables
   */
  static async getUserIdFromVariables(): Promise<string | null> {
    return await SystemVariablesCookieManager.getUserIdFromSystemVariables()
  }
}

/**
 * React Hook for accessing system variables in client components
 */
export function useSystemVariables() {
  // This would be implemented as a client-side hook
  // For now, we'll provide the server-side utilities
  return {
    // Server-side utilities (to be called from server components or API routes)
    getAllVariables: SystemVariablesUtils.getAllVariables,
    getUserIdentity: SystemVariablesUtils.getUserIdentity,
    getSubscriptionPlan: SystemVariablesUtils.getSubscriptionPlan,
    getDashboardLayout: SystemVariablesUtils.getDashboardLayout,
    getAppearanceSettings: SystemVariablesUtils.getAppearanceSettings,
    getTimezoneSettings: SystemVariablesUtils.getTimezoneSettings,
    getBillingPayment: SystemVariablesUtils.getBillingPayment,
    getCustomizationSettings: SystemVariablesUtils.getCustomizationSettings,
    getNotificationSettings: SystemVariablesUtils.getNotificationSettings,
    
    // Convenience methods
    getUserId: SystemVariablesUtils.getUserId,
    getUserName: SystemVariablesUtils.getUserName,
    getUserEmail: SystemVariablesUtils.getUserEmail,
    getProfilePicture: SystemVariablesUtils.getProfilePicture,
    getDarkMode: SystemVariablesUtils.getDarkMode,
    getFixedScroll: SystemVariablesUtils.getFixedScroll,
    getTimezone: SystemVariablesUtils.getTimezone,
    getTimezoneOffset: SystemVariablesUtils.getTimezoneOffset,
    getPlanName: SystemVariablesUtils.getPlanName,
    getExpiryDate: SystemVariablesUtils.getExpiryDate,
    getExpiresIn: SystemVariablesUtils.getExpiresIn,
    isExpired: SystemVariablesUtils.isExpired,
    getSocketToken: SystemVariablesUtils.getSocketToken,
    getNotificationsOn: SystemVariablesUtils.getNotificationsOn,
    getFirstLogin: SystemVariablesUtils.getFirstLogin,
    getLastFiveSearch: SystemVariablesUtils.getLastFiveSearch,
    getNewWidgetLayout: SystemVariablesUtils.getNewWidgetLayout,
    
    // Utility methods
    hasValidVariables: SystemVariablesUtils.hasValidVariables,
    getUserIdFromVariables: SystemVariablesUtils.getUserIdFromVariables,
  }
}

/**
 * Server-side utility functions for use in API routes and server components
 */
export const SystemVars = {
  // Get all variables
  getAll: SystemVariablesUtils.getAllVariables,
  
  // User identity
  userId: SystemVariablesUtils.getUserId,
  userName: SystemVariablesUtils.getUserName,
  userEmail: SystemVariablesUtils.getUserEmail,
  profilePicture: SystemVariablesUtils.getProfilePicture,
  
  // Appearance
  darkMode: SystemVariablesUtils.getDarkMode,
  fixedScroll: SystemVariablesUtils.getFixedScroll,
  
  // Subscription
  planName: SystemVariablesUtils.getPlanName,
  expiryDate: SystemVariablesUtils.getExpiryDate,
  expiresIn: SystemVariablesUtils.getExpiresIn,
  isExpired: SystemVariablesUtils.isExpired,
  
  // Timezone
  timezone: SystemVariablesUtils.getTimezone,
  timezoneOffset: SystemVariablesUtils.getTimezoneOffset,
  
  // Notifications
  notificationsOn: SystemVariablesUtils.getNotificationsOn,
  socketToken: SystemVariablesUtils.getSocketToken,
  
  // Dashboard
  firstLogin: SystemVariablesUtils.getFirstLogin,
  lastFiveSearch: SystemVariablesUtils.getLastFiveSearch,
  newWidgetLayout: SystemVariablesUtils.getNewWidgetLayout,
  
  // Utility
  hasValid: SystemVariablesUtils.hasValidVariables,
  getUserIdFromVars: SystemVariablesUtils.getUserIdFromVariables,
}

/**
 * Synchronous helper to get user timezone from cookie for React useState initialization.
 * Falls back to browser timezone if cookie is not available or parsing fails.
 * Should only be called on the client side.
 */
export function getUserTimezoneSync(): string {
  if (typeof window === 'undefined') {
    return 'UTC';
  }
  
  try {
    const userDataCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('pmt_user_data='));
    if (userDataCookie) {
      const userData = JSON.parse(decodeURIComponent(userDataCookie.split('=')[1]));
      if (userData.timezone) {
        return userData.timezone;
      }
    }
  } catch (e) {
    console.warn('Failed to parse user timezone from cookie:', e);
  }
  
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
