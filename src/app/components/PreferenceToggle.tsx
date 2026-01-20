"use client";

import { updatePrefs } from "../actions/updatePrefs";

interface PreferenceToggleProps {
  userId: string;
  darkMode: boolean;
  fixedScroll: boolean;
  notificationsOn: boolean;
}

export default function PreferenceToggle({ 
  userId, 
  darkMode, 
  fixedScroll,
  notificationsOn
}: PreferenceToggleProps) {
  const handleToggle = async (pref: "darkMode" | "fixedScroll" | "notificationsOn") => {
    const newValue = pref === "darkMode" ? !darkMode : 
                     pref === "fixedScroll" ? !fixedScroll : 
                     !notificationsOn;
    
    await updatePrefs(
      userId,
      pref === "darkMode" ? newValue : undefined,
      pref === "fixedScroll" ? newValue : undefined,
      pref === "notificationsOn" ? newValue : undefined
    );
    
    // Refresh the page to apply changes
    window.location.reload();
  };

  return (
    <div className="preference-toggle">
      <button 
        onClick={() => handleToggle("darkMode")}
        className="toggle-button dark-mode-toggle"
      >
        {darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      </button>
      
      <button 
        onClick={() => handleToggle("fixedScroll")}
        className="toggle-button fixed-scroll-toggle"
      >
        {fixedScroll ? "Fixed Scroll Off" : "Fixed Scroll On"}
      </button>
      
      <button 
        onClick={() => handleToggle("notificationsOn")}
        className="toggle-button notifications-toggle"
      >
        {notificationsOn ? "Notifications Off" : "Notifications On"}
      </button>
    </div>
  );
}