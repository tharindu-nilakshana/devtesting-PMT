'use client';

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { 
  User, 
  Lock, 
  CreditCard, 
  Gift, 
  Settings as SettingsIcon,
  Crown,
  Clock,
  MapPin,
  Copy,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { usePreferences } from "@/hooks/usePreferences";
import { UserPreferences } from "@/types/preferences";
import { handle401Response } from "@/utils/auth-redirect";

// Timezone options mapping
const TIMEZONE_OPTIONS = [
  { id: 4, name: "Pacific/Honolulu" },
  { id: 5, name: "America/Juneau" },
  { id: 6, name: "America/Los_Angeles" },
  { id: 7, name: "America/Phoenix" },
  { id: 9, name: "America/El_Salvador" },
  { id: 11, name: "US/Mountain" },
  { id: 13, name: "America/Chicago" },
  { id: 15, name: "America/Mexico_City" },
  { id: 18, name: "America/Bogota" },
  { id: 19, name: "America/New_York" },
  { id: 21, name: "America/Lima" },
  { id: 22, name: "America/Toronto" },
  { id: 24, name: "America/Caracas" },
  { id: 26, name: "America/Santiago" },
  { id: 28, name: "America/Sao_Paulo" },
  { id: 29, name: "America/Argentina/Buenos_Aires" },
  { id: 37, name: "Atlantic/Reykjavik" },
  { id: 38, name: "Etc/UTC" },
  { id: 39, name: "Europe/London" },
  { id: 41, name: "Europe/Berlin" },
  { id: 42, name: "Europe/Belgrade" },
  { id: 43, name: "Europe/Berlin" },
  { id: 44, name: "Africa/Lagos" },
  { id: 45, name: "Europe/Bratislava" },
  { id: 46, name: "Europe/Brussels" },
  { id: 47, name: "Europe/Budapest" },
  { id: 48, name: "Europe/Copenhagen" },
  { id: 49, name: "Europe/Luxembourg" },
  { id: 50, name: "Europe/Madrid" },
  { id: 51, name: "Europe/Paris" },
  { id: 52, name: "Europe/Madrid" },
  { id: 53, name: "Europe/Rome" },
  { id: 54, name: "Europe/Oslo" },
  { id: 55, name: "Europe/Rome" },
  { id: 56, name: "Europe/Stockholm" },
  { id: 57, name: "Europe/Zurich" },
  { id: 58, name: "Europe/Warsaw" },
  { id: 59, name: "Africa/Lagos" },
  { id: 61, name: "Europe/Athens" },
  { id: 62, name: "Europe/Bucharest" },
  { id: 63, name: "Africa/Cairo" },
  { id: 64, name: "Africa/Johannesburg" },
  { id: 65, name: "Europe/Helsinki" },
  { id: 66, name: "Europe/Istanbul" },
  { id: 67, name: "Asia/Jerusalem" },
  { id: 71, name: "Europe/Riga" },
  { id: 73, name: "Europe/Tallinn" },
  { id: 74, name: "Europe/Vilnius" },
  { id: 75, name: "Asia/Bahrain" },
  { id: 76, name: "Asia/Kuwait" },
  { id: 77, name: "Europe/Moscow" },
  { id: 78, name: "Asia/Qatar" },
  { id: 79, name: "Asia/Riyadh" },
  { id: 82, name: "Asia/Tehran" },
  { id: 83, name: "Asia/Dubai" },
  { id: 85, name: "Asia/Muscat" },
  { id: 91, name: "Asia/Karachi" },
  { id: 92, name: "Asia/Ashkhabad" },
  { id: 94, name: "Asia/Kolkata" },
  { id: 97, name: "Asia/Kathmandu" },
  { id: 98, name: "Asia/Almaty" },
  { id: 104, name: "Asia/Bangkok" },
  { id: 105, name: "Asia/Ho_Chi_Minh" },
  { id: 106, name: "Asia/Jakarta" },
  { id: 109, name: "Asia/Chongqing" },
  { id: 110, name: "Asia/Hong_Kong" },
  { id: 111, name: "Asia/Manila" },
  { id: 113, name: "Australia/Perth" },
  { id: 114, name: "Asia/Singapore" },
  { id: 115, name: "Asia/Taipei" },
  { id: 116, name: "Asia/Shanghai" },
  { id: 120, name: "Asia/Seoul" },
  { id: 121, name: "Asia/Tokyo" },
  { id: 123, name: "Australia/Adelaide" },
  { id: 125, name: "Australia/Brisbane" },
  { id: 126, name: "Australia/Sydney" },
  { id: 133, name: "Australia/ACT" },
  { id: 134, name: "Pacific/Norfolk" },
  { id: 136, name: "Pacific/Auckland" },
  { id: 141, name: "Pacific/Fakaofo" },
];

interface ProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
}

interface ReferralEarning {
  ID: number;
  ReferrerID: number;
  Referred_UserId: number;
  Subscription_PaymentID: number;
  Subscription_Amount: string;
  Reward_Percentage: string;
  Earned_Amount: string;
  status: string;
  CreatedOn: string;
  UpdatedOn: string;
  PaidOut: number;
  Deleted: number;
  Email: string;
  Name: string;
}

export function ProfileDialog({ isOpen, onClose, onLogout }: ProfileDialogProps) {
  const { user, updateUser } = useAuth();
  const { preferences, updatePreference, batchLoadPreferences } = usePreferences(user?.id); 
  const { changeTheme } = useTheme();
  
  // Debug logging for userId
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 ProfileDialog opened - user ID:', user?.id, 'user:', user);
    }
  }, [isOpen, user]);
  
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "subscription" | "referrals" | "settings">("profile");
  const [displayName, setDisplayName] = useState(user?.name || "PMT");
  const [email, setEmail] = useState(user?.email || "coaching@pmt.com");
  const [timezoneId, setTimezoneId] = useState<number>(109); // Default to Asia/Chongqing
  const [currentTime, setCurrentTime] = useState("");
  const [subscriptionTab, setSubscriptionTab] = useState<"payment" | "billing">("payment");
  
  // Password fields state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  // Referral state
  const [referralLink, setReferralLink] = useState<string>('');
  const [isLoadingReferralCode, setIsLoadingReferralCode] = useState(true);
  const [availableRewards, setAvailableRewards] = useState(0);
  const [rewardsCurrency, setRewardsCurrency] = useState('USD');
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(true);
  const [rewardsHistory, setRewardsHistory] = useState<ReferralEarning[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  
  const hasFetchedPreferences = useRef(false);
  const hasFetchedReferralCode = useRef(false);
  const hasFetchedEarnings = useRef(false);
  const hasFetchedHistory = useRef(false);
  const hasInitializedFormValues = useRef(false);

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "password" as const, label: "Password", icon: Lock },
    { id: "subscription" as const, label: "Subscription", icon: CreditCard },
    { id: "referrals" as const, label: "Referrals", icon: Gift },
    { id: "settings" as const, label: "Settings", icon: SettingsIcon },
  ];

  const handleLogout = () => {
    onLogout?.();
    onClose();
  };

  // Clear password fields when switching away from password tab for security
  const handleTabChange = (tabId: typeof activeTab) => {
    if (activeTab === "password" && tabId !== "password") {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setActiveTab(tabId);
  };

  useEffect(() => {
    // Only initialize form values once when dialog first opens
    // This prevents timezone from resetting when user object updates after saving
    if (isOpen && user && !hasInitializedFormValues.current) {
      hasInitializedFormValues.current = true;
      setDisplayName(user.name || "PMT");
      setEmail(user.email || "coaching@pmt.com");
      // Try to find matching timezone ID from user's timezone string
      const tzString = user.timezone || user.tvTimezone;
      if (tzString) {
        const matchedTz = TIMEZONE_OPTIONS.find(tz => tzString.includes(tz.name));
        if (matchedTz) {
          setTimezoneId(matchedTz.id);
        }
      }
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) {
      hasFetchedPreferences.current = false;
      hasFetchedReferralCode.current = false;
      hasFetchedEarnings.current = false;
      hasFetchedHistory.current = false;
      hasInitializedFormValues.current = false;
      setIsLoadingReferralCode(true);
      setIsLoadingEarnings(true);
      setIsLoadingHistory(true);
      // Clear password fields when dialog is closed for security
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen]);

  // Update current time based on selected timezone
  useEffect(() => {
    const updateTime = () => {
      const selectedTimezone = TIMEZONE_OPTIONS.find(tz => tz.id === timezoneId);
      if (selectedTimezone) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', {
          timeZone: selectedTimezone.name,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        });
        setCurrentTime(timeStr);
      }
    };

    updateTime(); // Update immediately
    const interval = setInterval(updateTime, 1000); // Update every second

    return () => clearInterval(interval);
  }, [timezoneId]);

  // REMOVED: fetchPreferences on dialog open - causes theme flashing and overwrites current state
  // The preferences are already loaded and kept in sync by the usePreferences hook
  // Fetching again on dialog open was causing stale data to overwrite current preferences
  // If we need to fetch fresh data, we should do it when the user first logs in, not every time they open settings

  // Fetch referral code
  useEffect(() => {
    const fetchReferralCode = async () => {
      try {
        if (!isOpen || hasFetchedReferralCode.current) return;
        
        console.log('ProfileDialog: Fetching referral code from API');
        setIsLoadingReferralCode(true);
        hasFetchedReferralCode.current = true;
        
        const response = await fetch(`/api/user/getReferralCode`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
  
        if (!response.ok) {
          handle401Response(response);
          const json = await response.json().catch(() => ({}));
          console.warn('Failed to fetch referral code', json);
          setIsLoadingReferralCode(false);
          return;
        }
        
        const json = await response.json();
        
        console.log('ProfileDialog: Referral code response:', json);
        
        if (json.Status === 'Success' && json.ReferralCode) {
          setReferralLink(`https://primemarket-terminal.com/?ref=${json.ReferralCode}`);
        }
        
      } catch (err) {
        console.warn('Failed to fetch referral code', err);
        hasFetchedReferralCode.current = false;
      } finally {
        setIsLoadingReferralCode(false);
      }
    };
  
    fetchReferralCode();
  }, [isOpen]);

  // Fetch referral earnings
  useEffect(() => {
    const fetchReferralEarnings = async () => {
      try {
        if (!isOpen || hasFetchedEarnings.current) return;
        
        console.log('ProfileDialog: Fetching referral earnings from API');
        setIsLoadingEarnings(true);
        hasFetchedEarnings.current = true;
        
        const response = await fetch(`/api/user/getReferralEarnings`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
  
        if (!response.ok) {
          handle401Response(response);
          const json = await response.json().catch(() => ({}));
          console.warn('Failed to fetch referral earnings', json);
          setIsLoadingEarnings(false);
          return;
        }
        
        const json = await response.json();
        
        console.log('ProfileDialog: Referral earnings response:', json);
        
        if (json.Status === 'Success') {
          setAvailableRewards(json.TotalEarnings || 0);
          setRewardsCurrency(json.Currency || 'USD');
        }
        
      } catch (err) {
        console.warn('Failed to fetch referral earnings', err);
        hasFetchedEarnings.current = false;
      } finally {
        setIsLoadingEarnings(false);
      }
    };
  
    fetchReferralEarnings();
  }, [isOpen]);

  // Fetch referral earnings details (history)
  useEffect(() => {
    const fetchReferralHistory = async () => {
      try {
        if (!isOpen || hasFetchedHistory.current) return;
        
        console.log('ProfileDialog: Fetching referral earnings details from API');
        setIsLoadingHistory(true);
        hasFetchedHistory.current = true;
        
        const response = await fetch(`/api/user/getReferralEarningsDetails`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
  
        if (!response.ok) {
          handle401Response(response);
          const json = await response.json().catch(() => ({}));
          console.warn('Failed to fetch referral earnings details', json);
          setIsLoadingHistory(false);
          return;
        }
        
        const json = await response.json();
        
        console.log('ProfileDialog: Referral earnings details response:', json);
        
        if (json.Status === 'Success' && json.Earnings) {
          setRewardsHistory(json.Earnings);
        }
        
      } catch (err) {
        console.warn('Failed to fetch referral earnings details', err);
        hasFetchedHistory.current = false;
      } finally {
        setIsLoadingHistory(false);
      }
    };
  
    fetchReferralHistory();
  }, [isOpen]);

  // REMOVED: postPreferences function - no longer needed!
  // Now using ONLY the hook's updatePreference method

  // Simplified handler - just use the hook!
  const handlePreferenceChange = async (
    key: keyof Pick<UserPreferences, 'darkMode' | 'fixedScroll' | 'notificationsOn'>, 
    value: boolean
  ) => {
    console.log(`ProfileDialog: Toggling ${key} to ${value}`);
    
    // Apply theme change immediately if dark mode
    if (key === 'darkMode') {
      changeTheme(value ? 'dark' : 'light');
    }

    // Use ONLY the hook's method - it handles everything!
    try {
      await updatePreference(key, value);
      console.log(`ProfileDialog: ${key} updated successfully`);
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Failed to save preference');
      // Revert theme if it was dark mode
      if (key === 'darkMode') {
        changeTheme(!value ? 'dark' : 'light');
      }
    }
  };

  // Handler for updating profile information (name, email, timezoneId)
  const handleUpdateProfileData = async () => {
    if (!user?.id) {
      toast.error('User not found');
      return;
    }

    try {
      const response = await fetch('/api/user/update-preferences', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          name: displayName,
          email: email,
          timezoneId: timezoneId,
        }),
      });

      handle401Response(response);
      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Profile updated successfully');
        
        // Update the user context with the new values
        // Use the updated user data from response if available, otherwise use local values
        const selectedTimezone = TIMEZONE_OPTIONS.find(tz => tz.id === timezoneId);
        const updatedUserData = result.user || {
          name: displayName,
          email: email,
          timezone: selectedTimezone?.name || '',
        };
        
        updateUser(updatedUserData);
        
        // Broadcast timezone change to all widgets
        if (selectedTimezone) {
          window.dispatchEvent(new CustomEvent('timezoneChanged', {
            detail: {
              timezoneId: timezoneId,
              timezoneName: selectedTimezone.name
            }
          }));
        }
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  // Helper function to obscure email
  const obscureEmail = (email: string): string => {
    const [username, domain] = email.split('@');
    if (!username || !domain) return email;
    
    const obscuredUsername = username.substring(0, 3) + '*'.repeat(Math.max(username.length - 3, 13));
    const [domainName, tld] = domain.split('.');
    const obscuredDomain = domainName.substring(0, 1) + '*'.repeat(Math.max(domainName.length - 1, 4)) + '.' + tld;
    
    return `${obscuredUsername}@${obscuredDomain}`;
  };

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Handler for copying referral link
  const handleCopyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success('Referral link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy referral link:', error);
      toast.error('Failed to copy link');
    }
  };

  // Handler for resetting password
  const handleResetPassword = async () => {
    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    setIsResettingPassword(true);

    try {
      const response = await fetch('/api/user/reset-password', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: oldPassword,
          newPassword: newPassword,
          confirmPassword: confirmPassword,
        }),
      });

      handle401Response(response);
      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Password updated successfully');
        
        // Clear password fields
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(result.error || 'Failed to update password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to update password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full !max-w-[96vw] sm:!max-w-[92vw] md:!max-w-[80vw] lg:!max-w-[60vw] xl:!max-w-[50vw] 2xl:!max-w-[38vw] h-[82vh] sm:h-[78vh] md:h-[70vh] lg:h-[55vh] bg-background border-border p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-popover via-widget-body to-background opacity-50" />
          
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%" className="blur-[1px]">
              <path d="M 0 80 Q 100 60, 200 70 T 400 75 T 600 65 T 800 80 T 1000 70" 
                    stroke="#f97316" strokeWidth="2" fill="none" opacity="0.3" />
              <path d="M 0 90 Q 100 70, 200 85 T 400 80 T 600 75 T 800 90 T 1000 85" 
                    stroke="#f97316" strokeWidth="2" fill="none" opacity="0.2" />
            </svg>
          </div>

          <div className="relative px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 pt-4 sm:pt-5 md:pt-6 pb-3 sm:pb-4 max-w-full">
            <DialogTitle className="text-lg text-foreground mb-4">Profile Info</DialogTitle>
            <DialogDescription className="sr-only">
              Manage your profile settings, password, subscription, referrals, and account preferences.
            </DialogDescription>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center border-2 border-border">
                  {user?.avatar ? (
                    <Image
                      src={user.avatar}
                      alt="Profile"
                      width={64}
                      height={64}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-white" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                  <Crown className="w-4 h-4 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg text-foreground">{displayName}</span>
                  <span className="px-2 py-0.5 bg-primary text-white text-xs rounded">
                    {user?.role || "PMT-Employee"}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">{email}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 border-b border-border overflow-x-auto whitespace-nowrap -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors relative ${
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 pb-4 sm:pb-5 md:pb-6">
          {activeTab === "profile" && (
            <div className="space-y-6 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6">
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Display Name</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-sm text-foreground">Email Address</Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-input border-border text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Time Zone</Label>
                  <Select 
                    value={timezoneId.toString()} 
                    onValueChange={(value) => setTimezoneId(parseInt(value, 10))}
                  >
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz.id} value={tz.id.toString()}>
                          {tz.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Current Time</Label>
                  <div className="relative">
                    <Input
                      value={currentTime}
                      readOnly
                      className="bg-input border-border text-foreground pr-10"
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-foreground">
                  Or, pick location from the map.{" "}
                  <button className="text-primary hover:underline inline-flex items-center gap-1">
                    Open Map
                    <MapPin className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-foreground">Upload image:</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center hover:border-primary/50 transition-colors cursor-pointer group">
                  <div className="w-16 h-16 mb-4 text-muted-foreground group-hover:text-primary transition-colors">
                    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
                      <rect x="8" y="16" width="48" height="36" rx="2" stroke="currentColor" strokeWidth="2" />
                      <circle cx="22" cy="28" r="4" stroke="currentColor" strokeWidth="2" />
                      <path d="M8 40 L20 28 L32 40 L44 28 L56 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="text-sm text-muted-foreground">Drag and drop image here</div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button onClick={handleUpdateProfileData} className="bg-primary hover:bg-primary/90 text-white">
                  Update Data
                </Button>
                <Button variant="secondary" onClick={onClose} className="bg-muted hover:bg-muted/80 text-foreground">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {activeTab === "password" && (
            <div className="space-y-6 w-full">
              <div className="space-y-2">
                <Label className="text-sm text-foreground">Old password</Label>
                <Input
                  type="password"
                  placeholder="Enter old password here"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-foreground">New password</Label>
                <Input
                  type="password"
                  placeholder="Enter new password here"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-foreground">Re-enter Password</Label>
                <Input
                  type="password"
                  placeholder="Re-enter password here"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button 
                  onClick={handleResetPassword} 
                  disabled={isResettingPassword}
                  className="bg-primary hover:bg-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResettingPassword ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="secondary" onClick={onClose} className="bg-muted hover:bg-muted/80 text-foreground">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {activeTab === "subscription" && (
            <div className="space-y-6 w-full">
              <div>
                <h3 className="text-sm text-foreground mb-3">Customize Subscription</h3>
                <div className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-lg p-4 flex items-center gap-2 max-w-md">
                  <Crown className="w-5 h-5 text-primary" />
                  <span className="text-sm text-primary">{user?.role || "PMT-Employee"}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-4 border-b border-border mb-6">
                  <button
                    onClick={() => setSubscriptionTab("payment")}
                    className={`px-4 py-2.5 text-sm relative transition-colors ${
                      subscriptionTab === "payment"
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Payment History
                    {subscriptionTab === "payment" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                  <button
                    onClick={() => setSubscriptionTab("billing")}
                    className={`px-4 py-2.5 text-sm relative transition-colors ${
                      subscriptionTab === "billing"
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Billing Information
                    {subscriptionTab === "billing" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                </div>

                {subscriptionTab === "payment" && (
                  <div className="space-y-6">
                    <div className="bg-card border border-border rounded-lg p-12 text-center">
                      <p className="text-sm text-foreground">No payment history available.</p>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 text-sm text-success">
                      <Clock className="w-4 h-4" />
                      <span>You have lifetime membership</span>
                    </div>
                  </div>
                )}

                {subscriptionTab === "billing" && (
                  <div className="bg-card border border-border rounded-lg p-12 text-center">
                    <p className="text-sm text-muted-foreground">No billing information available.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "referrals" && (
            <div className="space-y-6 w-full">
              {/* Header Section */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">
                  Earn 10% for every referral you bring in - recurring as long as the user stays and pays!
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  With our affiliate program, you&apos;ll earn cash for each new signup. Have an engaged audience? Start making money through your social media, blog, or website by simply sharing your unique link. Join us today and watch your earnings grow!
                </p>
              </div>

              {/* Referral Link Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Your Referral Link</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-input border border-border rounded-md px-4 py-2.5 text-sm text-foreground font-mono overflow-x-auto whitespace-nowrap">
                    {isLoadingReferralCode ? (
                      <span className="text-muted-foreground">Loading referral code...</span>
                    ) : referralLink ? (
                      referralLink
                    ) : (
                      <span className="text-muted-foreground">Failed to load referral code</span>
                    )}
                  </div>
                  <Button 
                    onClick={handleCopyReferralLink}
                    disabled={isLoadingReferralCode || !referralLink}
                    className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                </div>
                
                {/* Available Rewards */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <span className="text-sm text-muted-foreground">Available Rewards:</span>
                  {isLoadingEarnings ? (
                    <span className="text-xl text-muted-foreground">Loading...</span>
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {rewardsCurrency === 'USD' ? '$' : ''}{availableRewards.toFixed(2)}{rewardsCurrency !== 'USD' ? ` ${rewardsCurrency}` : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Rewards History Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Rewards History</Label>
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  {isLoadingHistory ? (
                    <div className="px-6 py-12 text-center">
                      <p className="text-sm text-muted-foreground">Loading rewards history...</p>
                    </div>
                  ) : rewardsHistory.length > 0 ? (
                    <div className="divide-y divide-border">
                      {rewardsHistory.map((reward) => (
                        <div 
                          key={reward.ID}
                          className="px-6 py-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-foreground mb-1">
                                <span className="font-medium">{reward.Name}</span>
                                <span className="text-muted-foreground"> ({obscureEmail(reward.Email)})</span>
                                <span className="text-muted-foreground"> joined Prime Market Terminal through your referral on </span>
                                <span className="font-medium">{formatDate(reward.CreatedOn)}</span>
                                <span className="text-muted-foreground">.</span>
                              </p>
                            </div>
                            <div className="shrink-0 ml-4">
                              <span className="text-sm text-muted-foreground">Earned: </span>
                              <span className="text-sm font-semibold text-foreground">${parseFloat(reward.Earned_Amount).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-6 py-12 text-center">
                      <Gift className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">No referrals yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Share your link to start earning rewards!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6 w-full">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm text-foreground mb-4">User Interface Customization</h3>
                  <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-foreground">Fixed Scroll mode</div>
                      <Switch
                        checked={!!preferences.fixedScroll}
                        onCheckedChange={(checked) => handlePreferenceChange("fixedScroll", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-foreground">Use New Widget Menu</div>
                      <Switch
                        checked={!!preferences.newWidgetLayout}
                        onCheckedChange={async (checked) => {
                          try {
                            await updatePreference('newWidgetLayout', checked);
                          } catch {
                            toast.error('Failed to save preference');
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-foreground">New Recaps Layout</div>
                      <Switch
                        checked={!!preferences.newRecapsLayout}
                        onCheckedChange={async (checked) => {
                          try {
                            await updatePreference('newRecapsLayout', checked);
                          } catch {
                            toast.error('Failed to save preference');
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-foreground">New Research Files Layout</div>
                      <Switch
                        checked={!!preferences.newResearchFilesLayout}
                        onCheckedChange={async (checked) => {
                          try {
                            await updatePreference('newResearchFilesLayout', checked);
                          } catch {
                            toast.error('Failed to save preference');
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-foreground">Enable Notifications</div>
                      <Switch
                        checked={!!preferences.notificationsOn}
                        onCheckedChange={(checked) => handlePreferenceChange("notificationsOn", checked)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm text-foreground mb-4">Number Format</h3>
                  <div className="bg-card border border-border rounded-lg p-6">
                    <Select 
                      value={preferences.numFormat} 
                      onValueChange={async (value) => {
                        try {
                          await updatePreference('numFormat', value);
                        } catch {
                          toast.error('Failed to save preference');
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Number Format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EU Format">EU Format</SelectItem>
                        <SelectItem value="US Format">US Format</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm text-foreground mb-4">Notification Sound</h3>
                  <div className="bg-card border border-border rounded-lg p-6">
                    <Select 
                      value={preferences.notificationSoundId} 
                      onValueChange={async (value) => {
                        try {
                          await updatePreference('notificationSoundId', value);
                        } catch {
                          toast.error('Failed to save preference');
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Notification Sound" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Silent">Silent</SelectItem>
                        <SelectItem value="Chime">Chime</SelectItem>
                        <SelectItem value="Ping">Ping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm text-foreground mb-4">Date Format</h3>
                  <div className="bg-card border border-border rounded-lg p-6">
                    <Select 
                      value={preferences.dateFormat} 
                      onValueChange={async (value) => {
                        try {
                          await updatePreference('dateFormat', value);
                        } catch {
                          toast.error('Failed to save preference');
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Date Format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm text-foreground mb-4">Account</h3>
                  <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm text-foreground mb-1">Sign Out</Label>
                        <p className="text-xs text-muted-foreground">Log out from your account</p>
                      </div>
                      <Button
                        onClick={handleLogout}
                        variant="destructive"
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      >
                        Logout
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}