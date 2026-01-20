// System-wide variable types for secure cookie management

// 1. User Identity Variables
export interface UserIdentity {
  LoggedInUserID: string
  LoggedInName: string
  LoggedInEmail: string
  LoggedInProfilePicture: string
  LoggedInPasswordChangedOn: string // timestamp
}

// 2. Subscription & Plan Variables
export interface SubscriptionPlan {
  LoggedInExpiryDate: string // dd.mm.yyyy format
  LoggedInExpiresIn: number // days left
  LoggedInPlanID: string
  LoggedInPlanName: string
  LoggedInPlanUrl: string
}

// 3. Dashboard & Layout Variables
export interface DashboardLayout {
  DashboardTrainer: boolean
  DetailTrainer: boolean
  DashboardCustomNews: boolean
  DashboardCustomNewsSentiment: boolean
  DetailTemplate: string
  DetailTab: string
  LastFiveSearch: string[] // array of last 5 searches
  NewWidgetLayout: 0 | 1
  FixedScrollOn: boolean
}

// 4. Appearance Variables
export interface AppearanceSettings {
  DarkModeOn: 0 | 1
  Logo: string // image path
  NavProfilePicture: string // inline CSS
  NavProfilePictureShortName: string // user initials
  DarkBg: string // background color
  DarkTx: string // text color
  DarkLg: string // line color
  LanguagePreference: string // language code (en, de, es, fr, it, ru)
}

// 5. Timezone & Date Variables
export interface TimezoneSettings {
  LoggedInTimezoneID: string
  LoggedInTimezone: string
  LoggedInTVTimezone: string
  LoggedInTimeOffset: string // +HH:MM or -HH:MM format
}

// 6. Billing & Payment Variables
export interface BillingPayment {
  LoggedInIsExpired: 0 | 1
  LoggedInIsRecurring: boolean
  LoggedInAutoRenew: boolean
  LoggedInPaymentMethod: string // Stripe/PayPal/etc
  LoggedInStripeCustomerID: string
  LoggedInPayPalBillingAgreementID: string
}

// 7. Customization Variables
export interface CustomizationSettings {
  first_login: boolean
  Listview: boolean
  RecapsStyle: string
  RFilesStyle: string
  NumFormat: string
  LoggedInSettings: string // JSON string
  WCSettingsArray: Record<string, unknown> // parsed settings
}

// 8. Notifications & Real-Time Variables
export interface NotificationSettings {
  NotificationsOn: 0 | 1
  NotificationSoundID: string
  AdminEnabledNotifications: boolean
  LoggedInSocketToken: string
}

// Combined system variables interface
export interface SystemVariables {
  [x: string]: unknown
  userIdentity: UserIdentity
  subscriptionPlan: SubscriptionPlan
  dashboardLayout: DashboardLayout
  appearanceSettings: AppearanceSettings
  timezoneSettings: TimezoneSettings
  billingPayment: BillingPayment
  customizationSettings: CustomizationSettings
  notificationSettings: NotificationSettings
}

// Cookie data structure
export interface SystemVariablesCookie {
  variables: SystemVariables
  userId: string
  sessionId: string
  expires: number
  version: number
}

// Server action types
export interface SetSystemVariablesAction {
  variables: Partial<SystemVariables>
  userId: string
  sessionId: string
}

export interface ClearSystemVariablesAction {
  userId: string
  reason: 'logout' | 'settings_change' | 'subscription_change' | 'manual'
}

// Utility types for accessing specific variable groups
export type SystemVariableGroup = keyof SystemVariables
export type SystemVariableKey = keyof UserIdentity | 
  keyof SubscriptionPlan | 
  keyof DashboardLayout | 
  keyof AppearanceSettings | 
  keyof TimezoneSettings | 
  keyof BillingPayment | 
  keyof CustomizationSettings | 
  keyof NotificationSettings

// Response types
export interface SystemVariablesResponse {
  success: boolean
  variables?: SystemVariables
  error?: string
}

// Cache invalidation types
export interface CacheInvalidationEvent {
  userId: string
  affectedGroups: SystemVariableGroup[]
  reason: string
  timestamp: number
}
