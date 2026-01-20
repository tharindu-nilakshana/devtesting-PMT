export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: "top" | "bottom" | "left" | "right" | "center";
  template?: string;
  action?: () => void;
}

export const onboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to PMT",
    description: "Professional Market Terminal - Your all-in-one trading platform. Let's take a quick tour to get you started with the key features.",
    target: "body",
    position: "center" as const,
    template: "Default Layout",
  },
  {
    id: "templates",
    title: "Template System",
    description: "Click here to access your workspace templates. You can switch between different layouts, create custom templates, and save your favorite configurations for quick access.",
    target: '[data-tour="templates-button"]',
    position: "bottom" as const,
    template: "Default Layout",
  },
  {
    id: "widgets",
    title: "Widget Library",
    description: "Open the widget panel to add new widgets to your workspace. Choose from charts, order books, news feeds, and many more professional trading tools. Simply drag and drop widgets into your layout.",
    target: '[data-tour="widgets-button"]',
    position: "bottom" as const,
    template: "Default Layout",
  },
  {
    id: "tabs",
    title: "Multi-Tab Workspace",
    description: "Create multiple tabs to organize different trading setups. Each tab can have its own template and widgets. Perfect for managing multiple strategies or markets simultaneously.",
    target: '[data-tour="tabs-section"]',
    position: "bottom" as const,
    template: "Default Layout",
  },
  {
    id: "trading-chart",
    title: "Trading Chart",
    description: "This is your main trading chart with advanced technical analysis tools. You can add indicators, draw trend lines, and customize timeframes. The chart is fully interactive and linkable to other widgets.",
    target: '[data-tour="main-chart"]',
    position: "right" as const,
    template: "Day Trading",
  },
  {
    id: "watchlist",
    title: "Watchlist Widget",
    description: "Track your favorite instruments in real-time. Create multiple watchlists, sort by different columns, and quickly access market data. Click on any symbol to update linked widgets.",
    target: '[data-tour="watchlist"]',
    position: "left" as const,
    template: "Day Trading",
  },
  {
    id: "news-feed",
    title: "News & Market Updates",
    description: "Stay informed with real-time news feeds from major financial sources. Filter by categories, search for specific topics, and never miss important market-moving events.",
    target: '[data-tour="news-widget"]',
    position: "left" as const,
    template: "Swing Trading",
  },
  {
    id: "widget-settings",
    title: "Widget Customization",
    description: "Every widget has a settings icon (⚙️) in its header. Click it to customize the widget's appearance, data sources, and behavior. You can also link widgets together for synchronized updates.",
    target: '[data-tour="widget-header"]',
    position: "bottom" as const,
    template: "Swing Trading",
  },
  {
    id: "notifications",
    title: "Notification Center",
    description: "Access your alerts and notifications here. Set up price alerts, news alerts, and system notifications. Choose between silent mode (visual only) or loud mode (with sounds).",
    target: '[data-tour="notifications-button"]',
    position: "bottom" as const,
    template: "Default Layout",
  },
  {
    id: "profile",
    title: "Profile & Settings",
    description: "Access your profile, subscription details, account settings, and preferences. Manage your referrals, change your password, and customize your platform experience.",
    target: '[data-tour="profile-button"]',
    position: "bottom" as const,
    template: "Default Layout",
  },
  {
    id: "complete",
    title: "You're All Set! 🎉",
    description: "You've completed the tour! Start building your perfect trading workspace. Remember: You can always access templates, add widgets, and customize everything to match your trading style. Happy trading!",
    target: "body",
    position: "center" as const,
    template: "Default Layout",
  },
];
