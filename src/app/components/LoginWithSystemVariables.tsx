// Example: Login component that sets system variables after authentication
'use client'

import { useState } from 'react'
import { setSystemVariablesAction } from '../actions/systemVariables'
import { api } from '../../lib/api'
import type { SystemVariables } from '../../types/systemVariables'

interface LoginFormData {
  email: string
  password: string
}

export default function LoginWithSystemVariables() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // 1. Authenticate user using centralized API
      const authData = await api.login(formData)

      if (!authData.token) {
        throw new Error('Authentication failed')
      }
      
      // 2. Fetch user's system variables using centralized API
      const systemVariables: SystemVariables = await api.getUserSystemVariables(authData.token)

      // 3. Set system variables in secure cookie using server action
      const formDataForAction = new FormData()
      
      // User Identity
      formDataForAction.append('LoggedInUserID', systemVariables.userIdentity.LoggedInUserID)
      formDataForAction.append('LoggedInName', systemVariables.userIdentity.LoggedInName)
      formDataForAction.append('LoggedInEmail', systemVariables.userIdentity.LoggedInEmail)
      formDataForAction.append('LoggedInProfilePicture', systemVariables.userIdentity.LoggedInProfilePicture)
      formDataForAction.append('LoggedInPasswordChangedOn', systemVariables.userIdentity.LoggedInPasswordChangedOn)
      
      // Subscription Plan
      formDataForAction.append('LoggedInExpiryDate', systemVariables.subscriptionPlan.LoggedInExpiryDate)
      formDataForAction.append('LoggedInExpiresIn', systemVariables.subscriptionPlan.LoggedInExpiresIn.toString())
      formDataForAction.append('LoggedInPlanID', systemVariables.subscriptionPlan.LoggedInPlanID)
      formDataForAction.append('LoggedInPlanName', systemVariables.subscriptionPlan.LoggedInPlanName)
      formDataForAction.append('LoggedInPlanUrl', systemVariables.subscriptionPlan.LoggedInPlanUrl)
      
      // Dashboard Layout
      formDataForAction.append('DashboardTrainer', systemVariables.dashboardLayout.DashboardTrainer.toString())
      formDataForAction.append('DetailTrainer', systemVariables.dashboardLayout.DetailTrainer.toString())
      formDataForAction.append('DashboardCustomNews', systemVariables.dashboardLayout.DashboardCustomNews.toString())
      formDataForAction.append('DashboardCustomNewsSentiment', systemVariables.dashboardLayout.DashboardCustomNewsSentiment.toString())
      formDataForAction.append('DetailTemplate', systemVariables.dashboardLayout.DetailTemplate)
      formDataForAction.append('DetailTab', systemVariables.dashboardLayout.DetailTab)
      formDataForAction.append('LastFiveSearch', JSON.stringify(systemVariables.dashboardLayout.LastFiveSearch))
      formDataForAction.append('NewWidgetLayout', systemVariables.dashboardLayout.NewWidgetLayout.toString())
      formDataForAction.append('FixedScrollOn', systemVariables.dashboardLayout.FixedScrollOn.toString())
      
      // Appearance Settings
      formDataForAction.append('DarkModeOn', systemVariables.appearanceSettings.DarkModeOn.toString())
      formDataForAction.append('Logo', systemVariables.appearanceSettings.Logo)
      formDataForAction.append('NavProfilePicture', systemVariables.appearanceSettings.NavProfilePicture)
      formDataForAction.append('NavProfilePictureShortName', systemVariables.appearanceSettings.NavProfilePictureShortName)
      formDataForAction.append('DarkBg', systemVariables.appearanceSettings.DarkBg)
      formDataForAction.append('DarkTx', systemVariables.appearanceSettings.DarkTx)
      formDataForAction.append('DarkLg', systemVariables.appearanceSettings.DarkLg)
      
      // Timezone Settings
      formDataForAction.append('LoggedInTimezoneID', systemVariables.timezoneSettings.LoggedInTimezoneID)
      formDataForAction.append('LoggedInTimezone', systemVariables.timezoneSettings.LoggedInTimezone)
      formDataForAction.append('LoggedInTVTimezone', systemVariables.timezoneSettings.LoggedInTVTimezone)
      formDataForAction.append('LoggedInTimeOffset', systemVariables.timezoneSettings.LoggedInTimeOffset)
      
      // Billing Payment
      formDataForAction.append('LoggedInIsExpired', systemVariables.billingPayment.LoggedInIsExpired.toString())
      formDataForAction.append('LoggedInIsRecurring', systemVariables.billingPayment.LoggedInIsRecurring.toString())
      formDataForAction.append('LoggedInAutoRenew', systemVariables.billingPayment.LoggedInAutoRenew.toString())
      formDataForAction.append('LoggedInPaymentMethod', systemVariables.billingPayment.LoggedInPaymentMethod)
      formDataForAction.append('LoggedInStripeCustomerID', systemVariables.billingPayment.LoggedInStripeCustomerID)
      formDataForAction.append('LoggedInPayPalBillingAgreementID', systemVariables.billingPayment.LoggedInPayPalBillingAgreementID)
      
      // Customization Settings
      formDataForAction.append('first_login', systemVariables.customizationSettings.first_login.toString())
      formDataForAction.append('Listview', systemVariables.customizationSettings.Listview.toString())
      formDataForAction.append('RecapsStyle', systemVariables.customizationSettings.RecapsStyle)
      formDataForAction.append('RFilesStyle', systemVariables.customizationSettings.RFilesStyle)
      formDataForAction.append('NumFormat', systemVariables.customizationSettings.NumFormat)
      formDataForAction.append('LoggedInSettings', systemVariables.customizationSettings.LoggedInSettings)
      formDataForAction.append('WCSettingsArray', JSON.stringify(systemVariables.customizationSettings.WCSettingsArray))
      
      // Notification Settings
      formDataForAction.append('NotificationsOn', systemVariables.notificationSettings.NotificationsOn.toString())
      formDataForAction.append('NotificationSoundID', systemVariables.notificationSettings.NotificationSoundID)
      formDataForAction.append('AdminEnabledNotifications', systemVariables.notificationSettings.AdminEnabledNotifications.toString())
      formDataForAction.append('LoggedInSocketToken', systemVariables.notificationSettings.LoggedInSocketToken)

      const result = await setSystemVariablesAction(formDataForAction)
      
      if (result.success) {
        // Redirect to dashboard or refresh page
        window.location.href = '/dashboard'
      } else {
        throw new Error(result.error || 'Failed to set system variables')
      }
      
    } catch (error) {
      console.error('Login error:', error)
      setError(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      
      <div className="mb-6">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          type="password"
          id="password"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}
