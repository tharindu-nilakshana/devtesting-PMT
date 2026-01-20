'use server'

import { SystemVariablesCookieManager } from '../../lib/systemVariables'
import { requireAuth } from '../../lib/auth'
import type { SystemVariables, SystemVariableGroup } from '../../types/systemVariables'

/**
 * Server Action: Set system variables after login
 */
export async function setSystemVariablesAction(formData: FormData) {
  try {
    // Get authenticated user
    const session = await requireAuth()
    
    // Parse system variables from form data
    const variables: SystemVariables = {
      userIdentity: {
        LoggedInUserID: formData.get('LoggedInUserID') as string,
        LoggedInName: formData.get('LoggedInName') as string,
        LoggedInEmail: formData.get('LoggedInEmail') as string,
        LoggedInProfilePicture: formData.get('LoggedInProfilePicture') as string,
        LoggedInPasswordChangedOn: formData.get('LoggedInPasswordChangedOn') as string,
      },
      subscriptionPlan: {
        LoggedInExpiryDate: formData.get('LoggedInExpiryDate') as string,
        LoggedInExpiresIn: parseInt(formData.get('LoggedInExpiresIn') as string),
        LoggedInPlanID: formData.get('LoggedInPlanID') as string,
        LoggedInPlanName: formData.get('LoggedInPlanName') as string,
        LoggedInPlanUrl: formData.get('LoggedInPlanUrl') as string,
      },
      dashboardLayout: {
        DashboardTrainer: formData.get('DashboardTrainer') === 'true',
        DetailTrainer: formData.get('DetailTrainer') === 'true',
        DashboardCustomNews: formData.get('DashboardCustomNews') === 'true',
        DashboardCustomNewsSentiment: formData.get('DashboardCustomNewsSentiment') === 'true',
        DetailTemplate: formData.get('DetailTemplate') as string,
        DetailTab: formData.get('DetailTab') as string,
        LastFiveSearch: JSON.parse(formData.get('LastFiveSearch') as string || '[]'),
        NewWidgetLayout: parseInt(formData.get('NewWidgetLayout') as string) as 0 | 1,
        FixedScrollOn: formData.get('FixedScrollOn') === 'true',
      },
      appearanceSettings: {
        DarkModeOn: parseInt(formData.get('DarkModeOn') as string) as 0 | 1,
        Logo: formData.get('Logo') as string,
        NavProfilePicture: formData.get('NavProfilePicture') as string,
        NavProfilePictureShortName: formData.get('NavProfilePictureShortName') as string,
        DarkBg: formData.get('DarkBg') as string,
        DarkTx: formData.get('DarkTx') as string,
        DarkLg: formData.get('DarkLg') as string,
        LanguagePreference: formData.get('LanguagePreference') as string || 'en',
      },
      timezoneSettings: {
        LoggedInTimezoneID: formData.get('LoggedInTimezoneID') as string,
        LoggedInTimezone: formData.get('LoggedInTimezone') as string,
        LoggedInTVTimezone: formData.get('LoggedInTVTimezone') as string,
        LoggedInTimeOffset: formData.get('LoggedInTimeOffset') as string,
      },
      billingPayment: {
        LoggedInIsExpired: parseInt(formData.get('LoggedInIsExpired') as string) as 0 | 1,
        LoggedInIsRecurring: formData.get('LoggedInIsRecurring') === 'true',
        LoggedInAutoRenew: formData.get('LoggedInAutoRenew') === 'true',
        LoggedInPaymentMethod: formData.get('LoggedInPaymentMethod') as string,
        LoggedInStripeCustomerID: formData.get('LoggedInStripeCustomerID') as string,
        LoggedInPayPalBillingAgreementID: formData.get('LoggedInPayPalBillingAgreementID') as string,
      },
      customizationSettings: {
        first_login: formData.get('first_login') === 'true',
        Listview: formData.get('Listview') === 'true',
        RecapsStyle: formData.get('RecapsStyle') as string,
        RFilesStyle: formData.get('RFilesStyle') as string,
        NumFormat: formData.get('NumFormat') as string,
        LoggedInSettings: formData.get('LoggedInSettings') as string,
        WCSettingsArray: JSON.parse(formData.get('WCSettingsArray') as string || '{}'),
      },
      notificationSettings: {
        NotificationsOn: parseInt(formData.get('NotificationsOn') as string) as 0 | 1,
        NotificationSoundID: formData.get('NotificationSoundID') as string,
        AdminEnabledNotifications: formData.get('AdminEnabledNotifications') === 'true',
        LoggedInSocketToken: formData.get('LoggedInSocketToken') as string,
      }
    }

    // Set system variables in secure cookie
    await SystemVariablesCookieManager.setSystemVariables(
      variables, 
      session.userId, 
      session.userId // Using userId as sessionId for now
    )

    return { success: true, message: 'System variables set successfully' }
  } catch (error) {
    console.error('Error setting system variables:', error)
    return { success: false, error: 'Failed to set system variables' }
  }
}

/**
 * Server Action: Update specific variable groups
 */
export async function updateSystemVariablesAction(formData: FormData) {
  try {
    const session = await requireAuth()
    const group = formData.get('group') as SystemVariableGroup
    const updates = JSON.parse(formData.get('updates') as string)

    await SystemVariablesCookieManager.updateVariableGroups(
      { [group]: updates },
      session.userId,
      session.userId
    )

    return { success: true, message: 'System variables updated successfully' }
  } catch (error) {
    console.error('Error updating system variables:', error)
    return { success: false, error: 'Failed to update system variables' }
  }
}

/**
 * Server Action: Clear system variables (logout, settings change, etc.)
 */
export async function clearSystemVariablesAction(formData: FormData) {
  try {
    const reason = formData.get('reason') as string || 'manual'
    
    await SystemVariablesCookieManager.clearSystemVariables(reason)
    
    return { success: true, message: 'System variables cleared successfully' }
  } catch (error) {
    console.error('Error clearing system variables:', error)
    return { success: false, error: 'Failed to clear system variables' }
  }
}

/**
 * Server Action: Invalidate system variables when user makes changes
 */
export async function invalidateSystemVariablesAction(formData: FormData) {
  try {
    const session = await requireAuth()
    const affectedGroups = JSON.parse(formData.get('affectedGroups') as string) as SystemVariableGroup[]
    const reason = formData.get('reason') as string

    await SystemVariablesCookieManager.invalidateOnUserChange(
      session.userId,
      affectedGroups,
      reason
    )

    return { success: true, message: 'System variables invalidated successfully' }
  } catch (error) {
    console.error('Error invalidating system variables:', error)
    return { success: false, error: 'Failed to invalidate system variables' }
  }
}

/**
 * Server Action: Get current system variables (for debugging/admin)
 */
export async function getSystemVariablesAction() {
  try {
    const variables = await SystemVariablesCookieManager.getSystemVariables()
    
    if (!variables) {
      return { success: false, error: 'No system variables found' }
    }

    return { success: true, variables }
  } catch (error) {
    console.error('Error getting system variables:', error)
    return { success: false, error: 'Failed to get system variables' }
  }
}
