/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  User,
  MessageCircle,
  FileText,
  LogOut,
  Moon,
  Sun,
  Settings,
  Lock,
  CreditCard,
  HelpCircle,
  BookOpen,
  Shield,
  Gift,
  Eye,
  EyeOff,
  Save,
  Mail,
  ExternalLink,
  ChevronDown,
  Play,
  Clock,
  Copy
} from "lucide-react";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { usePreferences } from "@/hooks/usePreferences";
import { UserPreferences } from "@/types/preferences";
import { toast } from "sonner";
import Image from "next/image";

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

interface ProfilePanelProps {
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

export function ProfilePanel({
  isOpen,
  onClose,
  onLogout
}: ProfilePanelProps) {
  const { user, updateUser } = useAuth();
  const { theme } = useTheme();
  const { preferences, updatePreference, batchLoadPreferences } = usePreferences(user?.id);

  // Debug logging for userId
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 ProfilePanel opened - user ID:', user?.id, 'user:', user);
    }
  }, [isOpen, user]);

  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Reset expanded sections when panel opens
  useEffect(() => {
    if (isOpen) {
      setExpandedSections([]);
    }
  }, [isOpen]);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Profile form states
  const [displayName, setDisplayName] = useState(user?.name || "PMT");
  const [email, setEmail] = useState(user?.email || "coaching@pmt.com");
  const [timezoneId, setTimezoneId] = useState<number>(109);
  const [currentTime, setCurrentTime] = useState("");

  // Password fields
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

  // Handle slide animation and component mounting
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setTimeout(() => setIsAnimating(true), 10);
      // Notify other panels to close
      window.dispatchEvent(new CustomEvent('panel-opening', { detail: { panel: 'profile' } }));
    } else {
      setIsAnimating(false);
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [isOpen]);

  // Listen for other panels opening
  useEffect(() => {
    const handlePanelOpening = (event: Event) => {
      const customEvent = event as CustomEvent<{ panel: string }>;
      if (customEvent.detail.panel !== 'profile' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('panel-opening', handlePanelOpening);
    return () => window.removeEventListener('panel-opening', handlePanelOpening);
  }, [isOpen, onClose]);

  // Listen for other panels opening to close this panel
  useEffect(() => {
    const handlePanelOpening = (event: Event) => {
      const customEvent = event as CustomEvent<{ panel: string }>;
      if (customEvent.detail.panel !== 'profile' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('panel-opening', handlePanelOpening);
    return () => window.removeEventListener('panel-opening', handlePanelOpening);
  }, [isOpen, onClose]);

  // Initialize form values
  useEffect(() => {
    if (isOpen && user && !hasInitializedFormValues.current) {
      hasInitializedFormValues.current = true;
      setDisplayName(user.name || "PMT");
      setEmail(user.email || "coaching@pmt.com");
      const tzString = user.timezone || user.tvTimezone;
      if (tzString) {
        const matchedTz = TIMEZONE_OPTIONS.find(tz => tzString.includes(tz.name));
        if (matchedTz) {
          setTimezoneId(matchedTz.id);
        }
      }
    }
  }, [isOpen, user]);

  // Reset refs when dialog closes
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

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timezoneId]);

  // REMOVED: fetchPreferences on panel open - causes theme flashing and overwrites current state
  // The preferences are already loaded and kept in sync by the usePreferences hook
  // Fetching again on panel open was causing stale data to overwrite current preferences
  // If we need to fetch fresh data, we should do it when the user first logs in, not every time they open settings

  // Fetch referral code
  useEffect(() => {
    const fetchReferralCode = async () => {
      try {
        if (!isOpen || hasFetchedReferralCode.current) return;

        setIsLoadingReferralCode(true);
        hasFetchedReferralCode.current = true;

        const response = await fetch(`/api/user/getReferralCode`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const json = await response.json();
        if (!response.ok) {
          setIsLoadingReferralCode(false);
          return;
        }

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

        setIsLoadingEarnings(true);
        hasFetchedEarnings.current = true;

        const response = await fetch(`/api/user/getReferralEarnings`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const json = await response.json();
        if (!response.ok) {
          setIsLoadingEarnings(false);
          return;
        }

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

  // Fetch referral history
  useEffect(() => {
    const fetchReferralHistory = async () => {
      try {
        if (!isOpen || hasFetchedHistory.current) return;

        setIsLoadingHistory(true);
        hasFetchedHistory.current = true;

        const response = await fetch(`/api/user/getReferralEarningsDetails`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const json = await response.json();
        if (!response.ok) {
          setIsLoadingHistory(false);
          return;
        }

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

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleLogout = () => {
    onLogout?.();
    onClose();
  };

  const handlePreferenceChange = async (
    key: keyof Pick<UserPreferences, 'darkMode' | 'fixedScroll' | 'notificationsOn'>,
    value: boolean
  ) => {
    // No need to call changeTheme here - updatePreference in usePreferences hook handles it
    try {
      await updatePreference(key, value);
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Failed to save preference');
    }
  };

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

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Profile updated successfully');

        const selectedTimezone = TIMEZONE_OPTIONS.find(tz => tz.id === timezoneId);
        const updatedUserData = result.user || {
          name: displayName,
          email: email,
          timezone: selectedTimezone?.name || '',
        };

        updateUser(updatedUserData);

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

  const handleResetPassword = async () => {
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

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Password updated successfully');
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

  const handleCopyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success('Referral link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy referral link:', error);
      toast.error('Failed to copy link');
    }
  };

  const obscureEmail = (email: string): string => {
    const [username, domain] = email.split('@');
    if (!username || !domain) return email;

    const obscuredUsername = username.substring(0, 3) + '*'.repeat(Math.max(username.length - 3, 13));
    const [domainName, tld] = domain.split('.');
    const obscuredDomain = domainName.substring(0, 1) + '*'.repeat(Math.max(domainName.length - 1, 4)) + '.' + tld;

    return `${obscuredUsername}@${obscuredDomain}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <>
      {/* Slide-in Profile Panel */}
      {shouldRender && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-[42px] bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
            style={{ opacity: isAnimating ? 1 : 0 }}
            onClick={onClose}
          />

          {/* Profile Panel */}
          <div
            className="fixed top-[42px] right-0 bottom-0 w-[460px] bg-popover border-l border-border flex flex-col z-50 shadow-2xl transition-transform duration-300 ease-in-out"
            style={{
              transform: isAnimating ? 'translateX(0)' : 'translateX(100%)',
            }}
          >
            {/* Header */}
            <div className="p-4 border-b border-border bg-widget-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/30 relative">
                    {user?.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={user.name || "Profile"}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-widget-header"></span>
                  </div>
                  <div>
                    <div className="text-sm text-[#8a8a8a]">{user?.name || "User"}</div>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-xs px-1.5 py-0">
                      {user?.role || "Member"}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-[#8a8a8a] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Theme Switcher - Always visible */}
            <div className="px-4 py-3 border-b border-border bg-widget-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {theme === "dark" ? (
                      <Moon className="w-4 h-4 text-primary" />
                    ) : (
                      <Sun className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <span className="text-sm text-[#8a8a8a]">
                    {theme === "dark" ? "Dark Mode" : "Light Mode"}
                  </span>
                </div>
                <Switch
                  checked={theme === "light"}
                  onCheckedChange={(checked) => handlePreferenceChange("darkMode", !checked)}
                />
              </div>
            </div>

            {/* Scrollable Accordion Sections */}
            <div className="flex-1 overflow-y-auto">

              {/* Profile Section */}
              <div className="border-b border-border">
                <button
                  onClick={() => toggleSection("profile")}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-[#8a8a8a]">Profile</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${expandedSections.includes("profile") ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {expandedSections.includes("profile") && (
                  <div className="bg-widget-header p-4 space-y-6">
                    {/* Profile Picture */}
                    <div className="flex flex-col items-center gap-3 pb-6 border-b border-border">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/30 relative">
                        {user?.avatar ? (
                          <Image
                            src={user.avatar}
                            alt={user.name || "Profile"}
                            width={96}
                            height={96}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                            <User className="w-12 h-12 text-primary" />
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 w-5 h-5 bg-success rounded-full border-2 border-widget-header"></span>
                      </div>
                      <Button variant="outline" size="sm">
                        Change Photo
                      </Button>
                    </div>

                    {/* Personal Information */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="displayName" className="text-sm font-medium text-[#8a8a8a]">Display Name</Label>
                        <Input
                          id="displayName"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="bg-widget-body border-border"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-[#8a8a8a]">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-widget-body border-border pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="timezone" className="text-sm font-medium text-[#8a8a8a]">Time Zone</Label>
                        <Select
                          value={timezoneId.toString()}
                          onValueChange={(value) => setTimezoneId(parseInt(value, 10))}
                        >
                          <SelectTrigger className="bg-widget-body border-border">
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
                        <Label htmlFor="currentTime" className="text-sm font-medium text-[#8a8a8a]">Current Time</Label>
                        <div className="relative">
                          <Input
                            id="currentTime"
                            value={currentTime}
                            readOnly
                            className="bg-widget-body border-border pr-10"
                          />
                          <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    {/* Update Button */}
                    <div className="flex items-center gap-3 pt-4 border-t border-border">
                      <Button onClick={handleUpdateProfileData} className="bg-primary hover:bg-primary/90 text-white">
                        Update Data
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Password Section */}
              <div className="border-b border-border">
                <button
                  onClick={() => toggleSection("password")}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-[#8a8a8a]">Password & Security</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${expandedSections.includes("password") ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {expandedSections.includes("password") && (
                  <div className="bg-widget-header p-4 space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword" className="text-sm font-medium text-[#8a8a8a]">Current Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="currentPassword"
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Enter current password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="bg-widget-body border-border pl-10 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-sm font-medium text-[#8a8a8a]">New Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-widget-body border-border pl-10 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-[#8a8a8a]">Confirm New Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="bg-widget-body border-border pl-10 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="bg-widget-body border border-border rounded p-3">
                        <p className="text-xs text-muted-foreground mb-2">Password requirements:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• At least 8 characters</li>
                          <li>• Contains uppercase and lowercase letters</li>
                          <li>• Contains at least one number</li>
                          <li>• Contains at least one special character</li>
                        </ul>
                      </div>

                      <Button
                        onClick={handleResetPassword}
                        disabled={isResettingPassword}
                        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isResettingPassword ? 'Saving...' : 'Update Password'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Subscription Section */}
              <div className="border-b border-border">
                <button
                  onClick={() => toggleSection("subscription")}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-[#8a8a8a]">Subscription</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${expandedSections.includes("subscription") ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {expandedSections.includes("subscription") && (
                  <div className="bg-widget-header p-4 space-y-6">
                    {/* Current Plan */}
                    <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[#8a8a8a]">Pro Plan</h3>
                            <Badge className="bg-primary/20 text-primary border-primary/30">Active</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Billed monthly</p>
                        </div>
                        <div className="text-right">
                          <div className="text-[#8a8a8a]">$99.00</div>
                          <p className="text-xs text-muted-foreground">/month</p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Next billing date: January 21, 2026
                      </div>
                    </div>

                    {/* Plan Features */}
                    <div className="space-y-3">
                      <h4 className="text-base font-medium text-foreground">Your plan includes:</h4>
                      <div className="space-y-2">
                        {[
                          "Real-time market data",
                          "Advanced charting tools",
                          "Custom indicators & templates",
                          "Economic calendar access",
                          "Priority support",
                          "Market sentiment analysis"
                        ].map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 pt-4 border-t border-border">
                      <Button variant="outline" className="w-full">
                        Upgrade Plan
                      </Button>
                      <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                        Cancel Subscription
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Referrals Section */}
              <div className="border-b border-border">
                <button
                  onClick={() => toggleSection("referrals")}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                      <Gift className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-[#8a8a8a]">Referrals</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${expandedSections.includes("referrals") ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {expandedSections.includes("referrals") && (
                  <div className="bg-widget-header p-4 space-y-6">
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
                      <Label className="text-base font-medium text-foreground">Your Referral Link</Label>
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
                      <Label className="text-base font-medium text-foreground">Rewards History</Label>
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
              </div>

              {/* Settings Section */}
              <div className="border-b border-border">
                <button
                  onClick={() => toggleSection("settings")}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                      <Settings className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-[#8a8a8a]">Settings</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${expandedSections.includes("settings") ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {expandedSections.includes("settings") && (
                  <div className="bg-widget-header p-4 space-y-6">
                    {/* User Interface Customization */}
                    <div className="space-y-4">
                      <h4 className="text-base font-medium text-foreground">User Interface Customization</h4>
                      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
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

                    {/* Number Format */}
                    <div className="space-y-3">
                      <h4 className="text-base font-medium text-foreground">Number Format</h4>
                      <div className="bg-card border border-border rounded-lg p-4">
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

                    {/* Notification Sound */}
                    <div className="space-y-3">
                      <h4 className="text-base font-medium text-foreground">Notification Sound</h4>
                      <div className="bg-card border border-border rounded-lg p-4">
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

                    {/* Date Format */}
                    <div className="space-y-3">
                      <h4 className="text-base font-medium text-foreground">Date Format</h4>
                      <div className="bg-card border border-border rounded-lg p-4">
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

                    {/* Restart Tour Button */}
                    <div className="space-y-3">
                      <h4 className="text-base font-medium text-foreground">Onboarding</h4>
                      <button
                        onClick={() => {
                          if ((window as any).startOnboardingNow) {
                            (window as any).startOnboardingNow();
                            onClose();
                          }
                        }}
                        className="w-full flex items-center justify-between p-3 bg-widget-body border border-border rounded hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Play className="w-4 h-4 text-primary" />
                          <span className="text-sm text-foreground">Restart Platform Tour</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Support & Legal Section */}
              <div className="border-b border-border">
                <button
                  onClick={() => toggleSection("support")}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                      <HelpCircle className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-[#8a8a8a]">Support & Legal</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${expandedSections.includes("support") ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {expandedSections.includes("support") && (
                  <div className="bg-widget-header p-4 space-y-6">
                    <div className="space-y-2">
                      <a
                        href="https://wa.me/4915750007792"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between p-3 bg-widget-body border border-border rounded hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <MessageCircle className="w-4 h-4 text-primary" />
                          <span className="text-sm text-[#8a8a8a]">Contact Support</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                      <button className="w-full flex items-center justify-between p-3 bg-widget-body border border-border rounded hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <span className="text-sm text-[#8a8a8a]">Knowledge Base</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <a
                        href="https://primemarket-terminal.com/product/risk/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between p-3 bg-widget-body border border-border rounded hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Shield className="w-4 h-4 text-primary" />
                          <span className="text-sm text-[#8a8a8a]">Risk Disclaimer</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                      <button className="w-full flex items-center justify-between p-3 bg-widget-body border border-border rounded hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="text-sm text-[#8a8a8a]">Terms & Conditions</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Log out */}
            <div className="border-t border-border bg-widget-header">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 text-left hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-destructive/10 flex items-center justify-center">
                    <LogOut className="w-4 h-4 text-destructive" />
                  </div>
                  <span className="text-sm text-destructive">Log out</span>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
