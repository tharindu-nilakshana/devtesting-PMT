"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { toast } from "sonner";
import Image from "next/image";

// 60+ Collage images for the scrolling grid - Financial/Trading themed
const collageImages = [
  "https://images.unsplash.com/photo-1574890766637-4d914193edfe?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1566481411105-046ba09e5a63?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1633059050703-0f1b50828402?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1651341050677-24dba59ce0fd?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1574884280706-7342ca3d4231?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1709050939155-78bb8f4c9fef?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1589708136696-6fb7e82702c6?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1758520144420-3e5b22e9b9a4?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1564858611794-e9c4a5442330?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1758691736483-5f600b509962?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1580519541860-385b101a37e3?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1645226880663-81561dcab0ae?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1713461983836-de0a45009424?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1672870153618-b369bcc8c55d?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1683291250890-2756e03ceaef?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1624365169364-0640dd10e180?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1633534415766-165181ffdbb7?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1744782211816-c5224434614f?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1699802703781-49071d3590a9?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1612178991541-b48cc8e92a4d?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1618044733300-9472054094ee?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1464349347811-3c5a10c43e2e?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1710492341412-8b3aee7e70a6?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1560789438-797849c1e18d?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1625236239092-8d15fbff5420?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1529187010230-993776efc565?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1694278658706-5b71cde4dd2f?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1733503747506-773e56e4078f?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1648275913341-7973ae7bc9b3?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1652180785831-911ebe69b68d?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1572276037952-478cead56982?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1669348141071-9eae9ac4224e?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1580661129736-549da24503a4?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1609358905581-e5381612486e?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1742415888265-d5044039d8e6?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1574890766637-4d914193edfe?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1566481411105-046ba09e5a63?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1633059050703-0f1b50828402?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1651341050677-24dba59ce0fd?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1574884280706-7342ca3d4231?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1709050939155-78bb8f4c9fef?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1589708136696-6fb7e82702c6?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1758520144420-3e5b22e9b9a4?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1564858611794-e9c4a5442330?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1758691736483-5f600b509962?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1580519541860-385b101a37e3?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1645226880663-81561dcab0ae?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1713461983836-de0a45009424?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1672870153618-b369bcc8c55d?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1683291250890-2756e03ceaef?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1624365169364-0640dd10e180?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1633534415766-165181ffdbb7?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1744782211816-c5224434614f?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1699802703781-49071d3590a9?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1612178991541-b48cc8e92a4d?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1618044733300-9472054094ee?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1464349347811-3c5a10c43e2e?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1710492341412-8b3aee7e70a6?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1560789438-797849c1e18d?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1625236239092-8d15fbff5420?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1529187010230-993776efc565?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1694278658706-5b71cde4dd2f?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1733503747506-773e56e4078f?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1648275913341-7973ae7bc9b3?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1652180785831-911ebe69b68d?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1572276037952-478cead56982?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1669348141071-9eae9ac4224e?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1580661129736-549da24503a4?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1609358905581-e5381612486e?w=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1742415888265-d5044039d8e6?w=200&fit=crop&auto=format",
];

// Pre-shuffled images to avoid delayed appearance and ensure consistent distribution
const shuffleImages = (arr: string[], seed: number) => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor((seed + i) * 0.12345) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Create multiple shuffled versions to ensure endless variety
const shuffledImageSets = [
  shuffleImages(collageImages, 12345),
  shuffleImages(collageImages, 67890), 
  shuffleImages(collageImages, 54321),
  shuffleImages(collageImages, 98765),
  shuffleImages(collageImages, 11111),
  shuffleImages(collageImages, 22222),
  shuffleImages(collageImages, 33333),
  shuffleImages(collageImages, 44444),
  shuffleImages(collageImages, 55555),
  shuffleImages(collageImages, 66666),
];

// Fixed number of images per column for consistent animation speed
const IMAGES_PER_COLUMN = 22;

const SCROLL_DURATION_MULTIPLIER = 2.4;

// Calculate column count immediately without state delay
const calculateColumnCount = (width: number) => {
  const paddingX = 16;
  const effectiveWidth = Math.max(0, width - paddingX);
  const colWidth = 140;
  const gap = 8;
  return Math.max(4, Math.ceil((effectiveWidth + gap) / (colWidth + gap)));
};

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login, isLoading, error } = useAuth();
  const collageContainerRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isContactMode, setIsContactMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [collageColumnCount, setCollageColumnCount] = useState(25); // High default for wide screens, extras are clipped

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    
    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();

    if (!resetEmail || !/\S+@\S+\.\S+/.test(resetEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsResetLoading(true);
    try {
      toast.success("Reset link request submitted", {
        description: "If an account exists for this email, you'll receive a reset link shortly.",
      });
    } finally {
      setIsResetLoading(false);
    }
  };

  // Use useEffect with debouncing for resize observer
  useEffect(() => {
    const el = collageContainerRef.current;
    if (!el) return;

    let timeoutId: NodeJS.Timeout;

    const updateColumns = () => {
      const newCount = calculateColumnCount(el.clientWidth);
      setCollageColumnCount(newCount);
    };

    // Debounced resize handler to avoid excessive updates
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateColumns, 150);
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(el);

    return () => {
      ro.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  const getColumnImages = (columnIndex: number) => {
    // Use different shuffled sets for better distribution and variety
    const imageSetIndex = columnIndex % shuffledImageSets.length;
    const imageSet = shuffledImageSets[imageSetIndex];
    
    // Use fixed number of images for consistent animation speed across all screen sizes
    const infiniteImages = [];
    for (let i = 0; i < IMAGES_PER_COLUMN; i++) {
      // Offset the starting index based on column for more variety
      const offset = (columnIndex * 7) % imageSet.length;
      infiniteImages.push(imageSet[(i + offset) % imageSet.length]);
    }
    
    return infiniteImages;
  };

  return (
    <div className="min-h-screen w-full bg-background flex">
      {/* Left Side - Scrolling Image Collage */}
      <div className="hidden lg:flex lg:w-[65%] relative bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#141414] overflow-hidden">
        {/* Background subtle grid */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, #2a2a2a 0px, transparent 1px, transparent 30px),
                               repeating-linear-gradient(90deg, #2a2a2a 0px, transparent 1px, transparent 30px)`
            }} 
          />
        </div>

        {/* Scrolling Image Grid Container */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent z-20 pointer-events-none" />
          
          <div ref={collageContainerRef} className="h-full flex gap-2 p-2">
            {Array.from({ length: collageColumnCount }, (_, i) => i).map((columnIndex) => {
              // Expanded column configurations for better variety on wide screens
              const columnConfigs = [
                { direction: 'down', duration: 60, delay: 0 },
                { direction: 'up', duration: 55, delay: -8 },
                { direction: 'down', duration: 65, delay: -15 },
                { direction: 'up', duration: 70, delay: -5 },
                { direction: 'down', duration: 50, delay: -20 },
                { direction: 'up', duration: 75, delay: -12 },
                { direction: 'down', duration: 80, delay: -3 },
                { direction: 'up', duration: 58, delay: -18 },
                { direction: 'down', duration: 62, delay: -7 },
                { direction: 'up', duration: 68, delay: -25 },
                { direction: 'down', duration: 72, delay: -10 },
                { direction: 'up', duration: 78, delay: -2 },
                { direction: 'down', duration: 53, delay: -22 },
                { direction: 'up', duration: 67, delay: -13 },
                { direction: 'down', duration: 63, delay: -28 },
                { direction: 'up', duration: 57, delay: -16 },
                { direction: 'down', duration: 73, delay: -9 },
                { direction: 'up', duration: 61, delay: -21 },
                { direction: 'down', duration: 69, delay: -4 },
                { direction: 'up', duration: 64, delay: -17 },
                { direction: 'down', duration: 76, delay: -11 },
                { direction: 'up', duration: 54, delay: -24 },
                { direction: 'down', duration: 71, delay: -6 },
                { direction: 'up', duration: 59, delay: -19 },
                { direction: 'down', duration: 66, delay: -14 },
              ];
              
              const config = columnConfigs[columnIndex % columnConfigs.length];
              const columnImages = getColumnImages(columnIndex);
              
              // Use deterministic rotation values to prevent hydration mismatch
              const rotations = columnImages.map((_, imgIndex) => 
                ((imgIndex * 0.7 + columnIndex * 0.3) % 1 - 0.5) * 20
              );
              
              return (
                <div 
                  key={columnIndex}
                  className="h-full overflow-hidden flex-shrink-0"
                  style={{ width: '140px', minWidth: '140px' }}
                >
                  <div className="h-full relative">
                    <div 
                      className="flex flex-col gap-2"
                      style={{
                        animation: `scroll-${config.direction} ${config.duration * SCROLL_DURATION_MULTIPLIER}s linear infinite`,
                        animationDelay: `${config.delay}s`,
                      }}
                    >
                      {/* Triple the images for truly seamless infinite scroll */}
                      {[...columnImages, ...columnImages, ...columnImages].map((img, imgIndex) => (
                        <div
                          key={imgIndex}
                          className="relative flex-shrink-0"
                          style={{ 
                            width: '140px', 
                            height: '140px', 
                            perspective: '800px'
                          }}
                        >
                          <div
                            className="w-full h-full relative overflow-hidden rounded-sm"
                            style={{
                              transform: `rotateY(${rotations[imgIndex % rotations.length]}deg)`,
                              transformStyle: 'preserve-3d',
                            }}
                          >
                            <Image
                              src={img}
                              alt=""
                              className="w-full h-full object-cover blur-[2.2px]"
                              width={140}
                              height={140}
                              style={{                                
                                objectFit: 'cover'
                              }}
                              loading="eager"
                              draggable={false}
                            />
                            <div className="absolute inset-0 bg-black/50" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent z-20 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none z-10" />
        </div>
        
        <div className="absolute top-0 right-0 bottom-0 w-48 bg-gradient-to-l from-background via-background/80 to-transparent z-20 pointer-events-none" />
        
        <div className="relative z-30 flex items-center justify-center w-full px-12 py-12 pointer-events-none" style={{ perspective: '1200px' }}>
          <div className="text-center">
            <div 
              className="inline-block bg-black/70 backdrop-blur-sm border border-primary/30 rounded-lg px-8 py-6"
              style={{
                transform: 'rotateX(5deg) rotateY(-2deg) translateZ(30px)',
                transformStyle: 'preserve-3d',
                boxShadow: `0 20px 60px rgba(0, 0, 0, 0.5), 0 10px 30px rgba(249, 115, 22, 0.2)`,
              }}
            >
              <h1 className="text-5xl mb-4 tracking-tight drop-shadow-lg" style={{ transform: 'translateZ(20px)', fontSize: '3rem !important' }}>
                <span className="text-primary">{t('Login.PowerYourTrading').split(' ')[0]}</span>{" "}
                <span className="text-white">{t('Login.PowerYourTrading').split(' ').slice(1).join(' ')}</span>
              </h1>
              <h2 className="text-4xl text-white tracking-tight drop-shadow-lg" style={{ transform: 'translateZ(15px)', fontSize: '2.25rem !important' }}>
                {t('Login.DataThatMovesCharts')}
              </h2>
            </div>
          </div>
        </div>
        
        <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent z-25" />
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-[35%] flex items-center justify-center bg-background px-8 py-12 relative">
        <div className="hidden lg:block absolute top-0 left-0 bottom-0 w-16 bg-gradient-to-r from-background/20 to-transparent pointer-events-none z-0" />
        
        <div className="w-full max-w-md relative z-10">
          <div className="mb-8">
            {/* <p className="text-sm text-muted-foreground mb-2">{t('Login.Welcome')}</p> */}
            <h2 className="text-2xl mb-1">
              <span className="text-foreground">{t('Login.PrimeMarketTerminal').split(' ')[0]}</span>{" "}
              <span className="text-primary">{t('Login.PrimeMarketTerminal').split(' ')[1]}</span>
            </h2>
            {/* <p className="text-sm text-muted-foreground">{t('Login.FirstLoginMessage')}</p> */}
          </div>

          {error && (
            <div className="mb-6 p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="relative overflow-hidden">
            <div
              className="transition-all duration-500 ease-in-out"
              style={{
                opacity: isResetMode || isContactMode ? 0 : 1,
                transform: isResetMode || isContactMode ? 'translateX(-100%)' : 'translateX(0)',
                position: isResetMode || isContactMode ? 'absolute' : 'relative',
                top: 0,
                width: '100%',
              }}
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm text-foreground">
                    {t('Login.EmailAddress')}
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-input-background border-border focus:border-primary transition-colors h-11"
                    placeholder={t('Login.EmailPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm text-foreground">
                    {t('Login.Password')}
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10 bg-input-background border-border focus:border-primary transition-colors h-11"
                      placeholder={t('Login.PasswordPlaceholder')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="stay-logged"
                      checked={stayLoggedIn}
                      onCheckedChange={(checked) => setStayLoggedIn(checked as boolean)}
                    />
                    <label
                      htmlFor="stay-logged"
                      className="text-sm text-foreground cursor-pointer select-none"
                    >
                      {t('Login.StayLoggedIn')}
                    </label>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => {
                      setResetEmail(email);
                      setIsContactMode(false);
                      setIsResetMode(true);
                    }}
                  >
                    {t('Login.ForgetPassword')}
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 tracking-wide"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      {t('Login.SigningIn')}
                    </div>
                  ) : (
                    t('Login.SignIn')
                  )}
                </Button>
              </form>
            </div>

            <div
              className="transition-all duration-500 ease-in-out"
              style={{
                opacity: isResetMode ? 1 : 0,
                transform: isResetMode ? 'translateX(0)' : 'translateX(100%)',
                position: isResetMode ? 'relative' : 'absolute',
                top: 0,
                width: '100%',
              }}
            >
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="reset-email" className="text-sm text-foreground">
                    Email Address:
                  </label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="bg-input-background border-border focus:border-primary transition-colors h-11"
                    placeholder="example@gmail.com"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 tracking-wide"
                  disabled={isResetLoading}
                >
                  {isResetLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Sending...
                    </div>
                  ) : (
                    "Reset Password"
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => setIsResetMode(false)}
                  >
                    Back to Login
                  </button>
                </div>

                <div className="mt-6 p-4 bg-muted/30 border border-border rounded-md space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll send you a reset link to your email address
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      The link will expire in 24 hours
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Check your spam folder if you don&apos;t see it
                    </p>
                  </div>
                </div>
              </form>
            </div>

            <div
              className="transition-all duration-500 ease-in-out"
              style={{
                opacity: isContactMode ? 1 : 0,
                transform: isContactMode ? 'translateX(0)' : 'translateX(100%)',
                position: isContactMode ? 'relative' : 'absolute',
                top: 0,
                width: '100%',
              }}
            >
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl mb-3">Trouble Logging In?</h3>
                  <p className="text-sm text-muted-foreground">
                    We are here to assist you. Select one of the options below to resolve your login issues.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm">
                      <span className="text-primary">1.</span>{" "}
                      <button
                        className="text-primary hover:underline"
                        onClick={() => {
                          setResetEmail(email);
                          setIsContactMode(false);
                          setIsResetMode(true);
                        }}
                      >
                        Forgot Password?
                      </button>
                    </h4>
                    <p className="text-xs text-muted-foreground pl-4">
                      If you have forgotten your password, click here to reset. You will receive an email with instructions on how to create a new password.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm">
                      <span className="text-primary">2.</span>{" "}
                      <span className="text-primary">Verify Email Address</span>
                    </h4>
                    <p className="text-xs text-muted-foreground pl-4">
                      Ensure your email address is verified for a secure login. If you haven&apos;t received a verification email, request a new one instantly.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm">
                      <span className="text-primary">3.</span>{" "}
                      <span className="text-primary">Clear Browser Cache</span>
                    </h4>
                    <p className="text-xs text-muted-foreground pl-4">
                      Login troubles can sometimes be due to cached data. Clear your browser&apos;s cache and attempt logging in again.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm">
                      <span className="text-primary">4.</span>{" "}
                      <span className="text-primary">Disable VPN or Proxy</span>
                    </h4>
                    <p className="text-xs text-muted-foreground pl-4">
                      Temporarily disable VPNs or Proxies as they can interfere with the login process. Try logging in without them.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm">
                      <span className="text-primary">5.</span>{" "}
                      <span className="text-primary">Contact Customer Support</span>
                    </h4>
                    <p className="text-xs text-muted-foreground pl-4">
                      If none of the above options solve your issue, our customer support team is just a click away. Submit a support ticket, and we&apos;ll respond promptly to help you.
                    </p>
                  </div>
                </div>

                <a
                  href="https://wa.me/4915750007792"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#10b981] hover:bg-[#059669] text-white h-12 tracking-wide flex items-center justify-center rounded-md font-medium text-sm"
                >
                  Contact Us
                </a>

                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => setIsContactMode(false)}
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            </div>
          </div>

          {!isContactMode && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {t('Login.Questions')}{" "}
              <button
                className="text-primary hover:underline"
                onClick={() => {
                  setIsResetMode(false);
                  setIsContactMode(true);
                }}
              >
                {t('Login.ContactUs')}
              </button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('Login.Language')}</span>
              <LanguageSwitcher />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button 
              onClick={() => window.open('https://dl.todesktop.com/24092526hja04u6', '_blank')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border rounded-md hover:border-primary/50 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <div className="text-left">
                <div className="text-xs text-muted-foreground">{t('Login.DownloadFor')}</div>
                <div className="text-foreground">{t('Login.Windows')}</div>
              </div>
            </button>
            <button 
              onClick={() => window.open('https://dl.todesktop.com/24092526hja04u6', '_blank')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border rounded-md hover:border-primary/50 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <div className="text-left">
                <div className="text-xs text-muted-foreground">{t('Login.DownloadFor')}</div>
                <div className="text-foreground">{t('Login.MacOS')}</div>
              </div>
            </button>
          </div>

          <div className="lg:hidden mt-12 text-center">
            <div className="text-xl tracking-wider mb-4">
              <span className="text-foreground">{t('Login.PrimeMarketTerminal').split(' ')[0]}</span>{" "}
              <span className="text-primary">{t('Login.PrimeMarketTerminal').split(' ')[1]}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('Login.Copyright')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
