import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import WSBoot from "../components/WSBoot";
import I18nProvider from "../components/i18nProvider";
import GlobalChartInstancesInitializer from "../components/GlobalChartInstancesInitializer";
import { getPrefsCookie } from "../lib/cookie";
import { getServerUser } from "../lib/serverAuth";
import { Toaster } from "../components/ui/sonner";
import { CacheProvider } from "../components/CacheProvider";

export const dynamic = 'force-dynamic';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap", // Ensure font loads properly
  preload: true,   // Preload the font for better performance
});

const COLLAGE_PRELOAD_IMAGES = [
  "https://images.unsplash.com/photo-1574890766637-4d914193edfe?w=200",
  "https://images.unsplash.com/photo-1566481411105-046ba09e5a63?w=200",
  "https://images.unsplash.com/photo-1633059050703-0f1b50828402?w=200",
  "https://images.unsplash.com/photo-1651341050677-24dba59ce0fd?w=200",
  "https://images.unsplash.com/photo-1574884280706-7342ca3d4231?w=200",
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=200",
];

export const metadata: Metadata = {
  title: "PMT",
  description: "Advanced portfolio management and trading analytics platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get user data from server-side cookies for SSR
  const serverUser = await getServerUser();
  
  // Read preferences from cookie
  const prefs = (await getPrefsCookie()) ?? {
    darkMode: true,
    fixedScroll: false,
    notificationsOn: true,
    newWidgetLayout: false,
    newRecapsLayout: false,
    newResearchFilesLayout: false,
    numFormat: 'EU Format',
    dateFormat: 'DD/MM/YYYY',
    notificationSoundId: '0',
    version: 1,
  };

  console.log('RootLayout: Setting theme based on darkMode:', prefs.darkMode, '-> theme:', prefs.darkMode ? 'dark' : 'light');

  return (
    <html 
      lang="en" 
      data-theme={prefs.darkMode ? "dark" : "light"}
      data-fixed-scroll={prefs.fixedScroll}
      className={prefs.darkMode ? "dark" : "light"}
    >
      <head>
        {/* Preload TradingView charting library for faster widget loading */}
        <link rel="preload" href="/charting_library/charting_library.js" as="script" />
        <link rel="dns-prefetch" href="/charting_library/" />
        <link rel="preconnect" href="/charting_library/" />
        
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />

        {COLLAGE_PRELOAD_IMAGES.map((src) => (
          <link
            key={src}
            rel="preload"
            as="image"
            href={src}
            fetchPriority="high"
          />
        ))}
      </head>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        <CacheProvider>
          <I18nProvider>
            <AuthProvider serverUser={serverUser}>
              <GlobalChartInstancesInitializer />
              <WSBoot />
              <Toaster />
              {children}
            </AuthProvider>
          </I18nProvider>
        </CacheProvider>
      </body>
    </html>
  );
}
