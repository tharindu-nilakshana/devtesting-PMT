import { useState, useEffect } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { Cloud, CloudRain, Sun, CloudSnow, CloudDrizzle, Wind } from "lucide-react";
import { getUserTimezoneSync } from "@/utils/systemVariablesClient";

interface TimeZone {
  city: string;
  country: string;
  timezone: string;
  offset: string;
  isMyTimezone?: boolean;
  temperature: number;
  weather: "sunny" | "cloudy" | "rainy" | "snowy" | "drizzle" | "windy";
}

const timeZones: TimeZone[] = [
  { city: "Asia/Chongqing", country: "My Timezone", timezone: "Asia/Shanghai", offset: "GMT +08:00", isMyTimezone: true, temperature: 18, weather: "cloudy" },
  { city: "London (LON)", country: "UK", timezone: "Europe/London", offset: "GMT +01:00", temperature: 12, weather: "rainy" },
  { city: "New York (NY)", country: "US", timezone: "America/New_York", offset: "GMT -05:00", temperature: 15, weather: "sunny" },
  { city: "Tokyo (TKYO)", country: "JP", timezone: "Asia/Tokyo", offset: "GMT +09:00", temperature: 22, weather: "cloudy" },
];

interface WorldClockProps {
  wgid?: string;
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, any>;
}

export default function WorldClock({ onRemove, onSettings, onFullscreen, settings }: WorldClockProps) {
  const [times, setTimes] = useState<{ [key: string]: Date }>({});
  const [userTimezone, setUserTimezone] = useState<string>(getUserTimezoneSync);

  // Listen for timezone changes from profile settings
  useEffect(() => {
    const handleTimezoneChange = (event: CustomEvent) => {
      const { timezoneName } = event.detail;
      if (timezoneName) {
        setUserTimezone(timezoneName);
        // Update "My Timezone" entry
        timeZones[0] = {
          ...timeZones[0],
          timezone: timezoneName,
          city: timezoneName.split('/')[1] || timezoneName,
        };
      }
    };

    window.addEventListener('timezoneChanged', handleTimezoneChange as EventListener);
    return () => window.removeEventListener('timezoneChanged', handleTimezoneChange as EventListener);
  }, []);

  useEffect(() => {
    const updateTimes = () => {
      const newTimes: { [key: string]: Date } = {};
      timeZones.forEach((tz) => {
        newTimes[tz.timezone] = new Date();
      });
      setTimes(newTimes);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);

    return () => clearInterval(interval);
  }, [userTimezone]);

  const formatTime = (date: Date, timezone: string) => {
    return date.toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const formatDate = (date: Date, timezone: string) => {
    return date.toLocaleDateString("en-US", {
      timeZone: timezone,
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatDay = (date: Date, timezone: string) => {
    return date.toLocaleDateString("en-US", {
      timeZone: timezone,
      weekday: "short",
    });
  };

  const getWeatherIcon = (weather: string) => {
    const iconProps = { className: "w-4 h-4 text-muted-foreground" };
    switch (weather) {
      case "sunny":
        return <Sun {...iconProps} />;
      case "cloudy":
        return <Cloud {...iconProps} />;
      case "rainy":
        return <CloudRain {...iconProps} />;
      case "snowy":
        return <CloudSnow {...iconProps} />;
      case "drizzle":
        return <CloudDrizzle {...iconProps} />;
      case "windy":
        return <Wind {...iconProps} />;
      default:
        return <Cloud {...iconProps} />;
    }
  };

  return (
    <div className="w-full h-full bg-widget-header border border-border flex flex-col">
      <WidgetHeader title="World Clock" onRemove={onRemove} onSettings={onSettings} onFullscreen={onFullscreen} />

      <div className="flex-1 grid grid-cols-4 gap-px bg-border overflow-hidden">
        {timeZones.map((tz) => {
          const currentTime = times[tz.timezone];
          if (!currentTime) return null;

          return (
            <div key={tz.timezone} className="bg-background flex flex-col">
              <div className="h-[1.5px] bg-primary"></div>
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-muted-foreground">
                    {formatDay(currentTime, tz.timezone)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(currentTime, tz.timezone)}
                  </div>
                </div>
                
                <div className="mb-3 tracking-tight" style={{ fontSize: '2rem', lineHeight: '1', fontWeight: '300', fontVariantNumeric: 'tabular-nums' }}>
                  {formatTime(currentTime, tz.timezone)}
                </div>

                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-muted-foreground">
                    {tz.offset}
                  </div>
                  <div className="text-xs text-primary" style={{ fontWeight: '500' }}>
                    {tz.city}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {tz.country}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-bold">
                      {getWeatherIcon(tz.weather)}
                    </div>
                    <span className="text-xs text-muted-foreground font-bold">
                      {tz.temperature}°C
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

