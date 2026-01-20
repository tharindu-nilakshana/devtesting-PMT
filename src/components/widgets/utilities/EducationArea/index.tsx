import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { BookOpen, ChevronDown, ChevronRight, Volume2, FileText, Lock } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface EducationAreaProps {
  wgid?: string;
  onSettings?: () => void;
  onRemove?: () => void;
  settings?: Record<string, any>;
}

interface Lesson {
  id: number;
  title: string;
  description: string;
  duration: string;
  completed: boolean;
  chapter: number;
}

const lessonVideoImage = "https://images.unsplash.com/photo-1618044733300-9472054094ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaW5hbmNpYWwlMjB0cmFkaW5nJTIwcGVyZm9ybWFuY2V8ZW58MXx8fHwxNzU5NTY4MzY4fDA&ixlib=rb-4.1.0&q=80&w=1080";
const exampleImage = "https://images.unsplash.com/photo-1618044733300-9472054094ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaW5hbmNpYWwlMjB0cmFkaW5nJTIwcGVyZm9ybWFuY2V8ZW58MXx8fHwxNzU5NTY4MzY4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
const mentorImage = "https://images.unsplash.com/photo-1758518731706-be5d5230e5a5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMHRlYW0lMjBtZWV0aW5nfGVufDF8fHwxNzU5NTUxNjA1OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

export default function EducationArea({ onSettings, onRemove, settings }: EducationAreaProps) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [chapter1Open, setChapter1Open] = useState(true);
  const [chapter2Open, setChapter2Open] = useState(false);
  const [chapter3Open, setChapter3Open] = useState(false);

  const lessons: Lesson[] = [
    // Part I: Rules of Success & Work Ethic
    {
      id: 1,
      title: "Welcome to the PPT Mentoring",
      description: "Welcome to the Beginning of Everything You've Been Chasing! If you're holding this Lesson in your hands (or on your screen), you've already made a decision that separates you from the masses...",
      duration: "12:34",
      completed: true,
      chapter: 1
    },
    {
      id: 2,
      title: "Why Our Mentorship Program Outshines the Rest!",
      description: "This isn't just another trading program — it's a wake-up call. A transformation. A roadmap for traders who refuse to settle for mediocrity...",
      duration: "18:45",
      completed: true,
      chapter: 1
    },
    {
      id: 3,
      title: "Workflow with Kajabi and Your Mentors in Discord",
      description: "This is Not a Passive Course - It's a High-Performance Mentorship! This is not a traditional course where you watch videos and disappear into the void...",
      duration: "15:20",
      completed: true,
      chapter: 1
    },
    {
      id: 4,
      title: "Core Values for Success",
      description: "Anyone can win a trade. But very few build a life of consistency, clarity, and purpose - in the markets and in life. This Lesson isn't about flashy tactics...",
      duration: "22:10",
      completed: true,
      chapter: 1
    },
    {
      id: 5,
      title: "The Mindset That Separates Winners from Dreamers",
      description: "Most people chase success. Few train for it. This Lesson breaks down the core mental models that turn average traders into consistent performers...",
      duration: "19:55",
      completed: true,
      chapter: 1
    },
    {
      id: 6,
      title: "10,000 Hours to Perfection",
      description: "We live in a world obsessed with shortcuts. But real success? It still follows the same timeless principle: deliberate practice and mastery through repetition...",
      duration: "16:30",
      completed: true,
      chapter: 1
    },
    {
      id: 7,
      title: "10 Steps Process To Make You Successful",
      description: "What Awaits You in the '10 Steps Process to Make You Successful' Lesson. You've just landed on the blueprint that will change the trajectory of your trading career...",
      duration: "25:40",
      completed: true,
      chapter: 1
    },
    
    // Part II: Technical Analysis & Market Structure
    {
      id: 8,
      title: "Trading Loser vs. Winners",
      description: "In this lesson, we're going to explore a crucial topic: understanding why many traders fail. Drawing from real experiences and proven strategies...",
      duration: "20:15",
      completed: false,
      chapter: 2
    },
    {
      id: 9,
      title: "Risk Management Fundamentals",
      description: "Master the art of protecting your capital while maximizing returns. Learn position sizing, stop-loss strategies, and portfolio management techniques...",
      duration: "24:30",
      completed: false,
      chapter: 2
    },
    {
      id: 10,
      title: "Technical Analysis Deep Dive",
      description: "Advanced charting techniques, pattern recognition, and indicator analysis to give you an edge in the markets...",
      duration: "32:20",
      completed: false,
      chapter: 2
    },
    {
      id: 11,
      title: "Market Structure & Price Action",
      description: "Understanding how markets move, identifying key levels, and reading price action like a professional institutional trader...",
      duration: "28:15",
      completed: false,
      chapter: 2
    },
    {
      id: 12,
      title: "Support & Resistance Mastery",
      description: "Learn to identify and trade the most powerful support and resistance zones that professional traders use daily...",
      duration: "21:50",
      completed: false,
      chapter: 2
    },
    {
      id: 13,
      title: "Trend Analysis & Market Phases",
      description: "Identifying market trends, understanding market cycles, and knowing when to trade and when to stay on the sidelines...",
      duration: "26:40",
      completed: false,
      chapter: 2
    },
    
    // Part III: Advanced Trading Strategies (Premium)
    {
      id: 14,
      title: "Advanced Order Flow Analysis",
      description: "Deep dive into institutional order flow, volume profile analysis, and smart money concepts to identify high-probability setups...",
      duration: "35:20",
      completed: false,
      chapter: 3
    },
    {
      id: 15,
      title: "Options Trading Strategies",
      description: "Mastering advanced options strategies including spreads, strangles, and iron condors for consistent income generation...",
      duration: "42:15",
      completed: false,
      chapter: 3
    },
    {
      id: 16,
      title: "Algorithmic Trading Fundamentals",
      description: "Introduction to algorithmic trading, backtesting strategies, and building automated trading systems...",
      duration: "38:50",
      completed: false,
      chapter: 3
    },
    {
      id: 17,
      title: "Institutional Trading Techniques",
      description: "Learn how institutional traders operate, identify their footprints, and follow the smart money...",
      duration: "31:45",
      completed: false,
      chapter: 3
    },
    {
      id: 18,
      title: "Multi-Timeframe Analysis Mastery",
      description: "Advanced techniques for analyzing multiple timeframes simultaneously to improve entry and exit timing...",
      duration: "29:30",
      completed: false,
      chapter: 3
    },
    {
      id: 19,
      title: "Advanced Risk Management",
      description: "Portfolio diversification, correlation analysis, and advanced position sizing for professional risk management...",
      duration: "33:25",
      completed: false,
      chapter: 3
    },
    {
      id: 20,
      title: "Psychology of Professional Trading",
      description: "Master the mental game with advanced psychology techniques used by elite professional traders...",
      duration: "27:55",
      completed: false,
      chapter: 3
    }
  ];

  const totalLessons = 73;
  const completedLessons = lessons.filter(l => l.completed).length;
  const progressPercentage = (completedLessons / totalLessons) * 100;

  const chapter1Lessons = lessons.filter(l => l.chapter === 1);
  const chapter2Lessons = lessons.filter(l => l.chapter === 2);
  const chapter3Lessons = lessons.filter(l => l.chapter === 3);
  const chapter1Completed = chapter1Lessons.filter(l => l.completed).length;
  const chapter2Completed = chapter2Lessons.filter(l => l.completed).length;
  const chapter3Completed = chapter3Lessons.filter(l => l.completed).length;

  // Render lesson view when a lesson is selected
  if (selectedLesson) {
    return (
      <div className="w-full h-full flex flex-col bg-widget-body border border-border rounded-none overflow-hidden">
        <WidgetHeader 
          title="Education Center"
          onSettings={onSettings}
          onRemove={onRemove}
        />
        
        <div className="flex-1 flex overflow-hidden">
          {/* Video Player & Content - Left Side */}
          <div className="flex-1 flex flex-col overflow-hidden bg-widget-body">
            {/* Video Player */}
            <div className="relative bg-black border-b border-border" style={{ height: '320px' }}>
              <img 
                src={lessonVideoImage}
                alt="Lesson Video"
                className="w-full h-full object-cover"
              />
              {/* Video Controls Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                <button 
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    backdropFilter: 'blur(8px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <Volume2 className="w-7 h-7 text-white" />
                </button>
              </div>
            </div>

            {/* Lesson Content */}
            <div className="flex-1 overflow-y-auto bg-widget-body px-6 py-5">
              <h2 
                className="text-foreground mb-3"
                style={{ 
                  fontSize: '1.4rem',
                  fontWeight: 600,
                  letterSpacing: '-0.015em',
                  lineHeight: '1.3'
                }}
              >
                {selectedLesson.id}. {selectedLesson.title}
              </h2>
              
              <div className="mb-5">
                <span 
                  className="inline-block px-2 py-0.5 rounded text-xs border"
                  style={{ 
                    backgroundColor: 'var(--primary)',
                    borderColor: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    letterSpacing: '0.02em'
                  }}
                >
                  Part {selectedLesson.chapter === 1 ? 'I' : selectedLesson.chapter === 2 ? 'II' : 'III'}: {selectedLesson.chapter === 1 ? 'Rules of Success & Work Ethic' : selectedLesson.chapter === 2 ? 'Technical Analysis & Market Structure' : 'Advanced Trading Strategies'}
                </span>
              </div>

              <div className="max-w-none">
                <p 
                  className="text-foreground mb-4"
                  style={{ 
                    fontSize: '0.9rem',
                    lineHeight: '1.7',
                    color: 'var(--foreground)'
                  }}
                >
                  {selectedLesson.description}
                </p>

                <p 
                  className="text-foreground mb-5"
                  style={{ 
                    fontSize: '0.9rem',
                    lineHeight: '1.7',
                    color: 'var(--foreground)'
                  }}
                >
                  Anyone can win a trade. But very few build a life of consistency, clarity, and purpose - in the markets <span style={{ fontStyle: 'italic' }}>and</span> in life. This Lesson isn't about flashy tactics or surface-level motivation. It's about the values that shape champions. The identity behind execution. The mindset that separates amateurs from professionals.
                </p>

                <h4 
                  className="text-foreground mb-3"
                  style={{ 
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    letterSpacing: '-0.01em'
                  }}
                >
                  Inside this exclusive guide, you'll learn:
                </h4>

                <ul className="space-y-2.5 mb-6">
                  {[
                    { text: 'discipline, integrity', bold: true, text2: ', and honesty are your greatest trading edges' },
                    { text: 'Consistency over charisma', bold: true, text2: ' — why steady effort beats talent every time' },
                    { text: 'Emotional regulation under pressure', bold: true, text2: ' — the ultimate skill for high-stakes trading' }
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-2.5">
                      <div 
                        className="w-1 h-1 rounded-full flex-shrink-0 mt-2"
                        style={{ backgroundColor: 'var(--primary)' }}
                      ></div>
                      <span className="text-foreground" style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
                        Why <span style={{ fontWeight: 600 }}>{item.text}</span>{item.text2}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-2 mt-6 pt-5 border-t border-border">
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="px-4 py-2 rounded transition-all border"
                  style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 500,
                    backgroundColor: 'var(--widget-header)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--muted)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--widget-header)';
                  }}
                >
                  Back to Lessons
                </button>
                <button
                  className="flex-1 px-4 py-2 rounded transition-all border-0"
                  style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 600,
                    backgroundColor: 'var(--primary)',
                    color: 'var(--primary-foreground)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ea580c';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--primary)';
                  }}
                >
                  Mark as Complete
                </button>
              </div>
            </div>
          </div>

          {/* Lessons Sidebar - Right Side */}
          <div 
            className="w-80 flex flex-col bg-widget-header border-l border-border overflow-hidden"
          >
            {/* Downloads Section */}
            <div className="px-4 py-3 pb-4 border-b border-border">
              <h4 
                className="text-foreground mb-3"
                style={{ 
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  letterSpacing: '-0.01em'
                }}
              >
                Downloads
              </h4>
              <a 
                href="#"
                className="flex items-center gap-2 text-primary hover:underline group"
                style={{ fontSize: '0.8rem', fontWeight: 500 }}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="group-hover:text-primary/80 transition-colors">
                  Core_Values_for_Success-v1.pdf
                </span>
              </a>
            </div>

            {/* Sidebar Header */}
            <div className="px-4 py-3 pt-4 border-b border-border bg-widget-body">
              <div className="flex items-center justify-between">
                <span 
                  className="text-foreground"
                  style={{ 
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    letterSpacing: '-0.01em'
                  }}
                >
                  Part {selectedLesson.chapter === 1 ? 'I' : selectedLesson.chapter === 2 ? 'II' : 'III'}: {selectedLesson.chapter === 1 ? 'Rules of Success & Work Ethic' : selectedLesson.chapter === 2 ? 'Technical Analysis & Market Structure' : 'Advanced Trading Strategies'}
                </span>
                <span 
                  className="text-muted-foreground"
                  style={{ 
                    fontSize: '0.7rem',
                    fontWeight: 500
                  }}
                >
                  {selectedLesson.chapter === 1 ? chapter1Lessons.length : selectedLesson.chapter === 2 ? chapter2Lessons.length : chapter3Lessons.length} Lessons
                </span>
              </div>
            </div>

            {/* Lessons List */}
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-border">
                {(selectedLesson.chapter === 1 ? chapter1Lessons : selectedLesson.chapter === 2 ? chapter2Lessons : chapter3Lessons).map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={`w-full text-left px-3 py-2.5 transition-colors ${
                      selectedLesson.id === lesson.id
                        ? 'bg-primary/10 border-l-2 border-l-primary'
                        : 'hover:bg-widget-body border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="flex gap-2.5">
                      <div 
                        className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border"
                        style={{
                          fontSize: '0.7rem',
                          backgroundColor: lesson.completed ? 'var(--success)' : 'var(--widget-body)',
                          borderColor: lesson.completed ? 'var(--success)' : 'var(--border)',
                          color: lesson.completed ? '#ffffff' : 'var(--muted-foreground)',
                          fontWeight: 600
                        }}
                      >
                        {lesson.completed ? '✓' : lesson.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div 
                          className="text-foreground mb-0.5"
                          style={{ 
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            lineHeight: '1.3'
                          }}
                        >
                          {lesson.id}. {lesson.title}
                        </div>
                        <div 
                          className="text-muted-foreground"
                          style={{ 
                            fontSize: '0.7rem',
                            fontWeight: 500
                          }}
                        >
                          {lesson.duration}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default list view
  return (
    <div className="w-full h-full flex flex-col bg-widget-body border border-border rounded-none overflow-hidden">
      <WidgetHeader 
        title="Education Center"
        onSettings={onSettings}
        onRemove={onRemove}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Lessons List - Left Side */}
        <div className="flex-1 flex flex-col border-r border-border overflow-hidden">
          {/* Lessons Scroll Area */}
          <div className="flex-1 overflow-y-auto">
            {/* Part I Chapter */}
            <Collapsible open={chapter1Open} onOpenChange={setChapter1Open}>
              <CollapsibleTrigger className="w-full">
                <div className="px-4 py-3 border-b border-border bg-widget-header hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {chapter1Open ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground transition-transform" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground transition-transform" />
                      )}
                      <span 
                        className="text-foreground"
                        style={{ 
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          letterSpacing: '-0.01em'
                        }}
                      >
                        Part I: Rules of Success & Work Ethic
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span 
                        className="px-1.5 py-0.5 rounded border"
                        style={{
                          fontSize: '0.7rem',
                          backgroundColor: chapter1Completed === chapter1Lessons.length ? 'var(--success)' : 'var(--widget-body)',
                          borderColor: chapter1Completed === chapter1Lessons.length ? 'var(--success)' : 'var(--border)',
                          color: chapter1Completed === chapter1Lessons.length ? '#ffffff' : 'var(--foreground)',
                          fontWeight: 600
                        }}
                      >
                        {chapter1Completed}/{chapter1Lessons.length}
                      </span>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-widget-body">
                  {chapter1Lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className="w-full text-left px-3 py-2.5 hover:bg-widget-header transition-colors border-b border-border group"
                    >
                      <div className="flex gap-2.5">
                        <div 
                          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border"
                          style={{
                            fontSize: '0.7rem',
                            backgroundColor: lesson.completed ? 'var(--success)' : 'var(--widget-body)',
                            borderColor: lesson.completed ? 'var(--success)' : 'var(--border)',
                            color: lesson.completed ? '#ffffff' : 'var(--muted-foreground)',
                            fontWeight: 600
                          }}
                        >
                          {lesson.completed ? '✓' : lesson.id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <h4 
                              className="text-foreground flex-1"
                              style={{ 
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                lineHeight: '1.3'
                              }}
                            >
                              {lesson.id}. {lesson.title}
                            </h4>
                            <span 
                              className="text-muted-foreground flex-shrink-0"
                              style={{ 
                                fontSize: '0.7rem',
                                fontWeight: 500
                              }}
                            >
                              {lesson.duration}
                            </span>
                          </div>
                          <p 
                            className="text-muted-foreground line-clamp-1"
                            style={{ 
                              fontSize: '0.7rem',
                              lineHeight: '1.4'
                            }}
                          >
                            {lesson.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Part II Chapter */}
            <Collapsible open={chapter2Open} onOpenChange={setChapter2Open}>
              <CollapsibleTrigger className="w-full">
                <div className="px-4 py-3 border-b border-border bg-widget-header hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {chapter2Open ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground transition-transform" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground transition-transform" />
                      )}
                      <span 
                        className="text-foreground"
                        style={{ 
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          letterSpacing: '-0.01em'
                        }}
                      >
                        Part II: Technical Analysis & Market Structure
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span 
                        className="px-1.5 py-0.5 rounded border"
                        style={{
                          fontSize: '0.7rem',
                          backgroundColor: chapter2Completed === chapter2Lessons.length ? 'var(--success)' : 'var(--widget-body)',
                          borderColor: chapter2Completed === chapter2Lessons.length ? 'var(--success)' : 'var(--border)',
                          color: chapter2Completed === chapter2Lessons.length ? '#ffffff' : 'var(--foreground)',
                          fontWeight: 600
                        }}
                      >
                        {chapter2Completed}/{chapter2Lessons.length}
                      </span>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-widget-body">
                  {chapter2Lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className="w-full text-left px-3 py-2.5 hover:bg-widget-header transition-colors border-b border-border group"
                    >
                      <div className="flex gap-2.5">
                        <div 
                          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border"
                          style={{
                            fontSize: '0.7rem',
                            backgroundColor: lesson.completed ? 'var(--success)' : 'var(--widget-body)',
                            borderColor: lesson.completed ? 'var(--success)' : 'var(--border)',
                            color: lesson.completed ? '#ffffff' : 'var(--muted-foreground)',
                            fontWeight: 600
                          }}
                        >
                          {lesson.completed ? '✓' : lesson.id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <h4 
                              className="text-foreground flex-1"
                              style={{ 
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                lineHeight: '1.3'
                              }}
                            >
                              {lesson.id}. {lesson.title}
                            </h4>
                            <span 
                              className="text-muted-foreground flex-shrink-0"
                              style={{ 
                                fontSize: '0.7rem',
                                fontWeight: 500
                              }}
                            >
                              {lesson.duration}
                            </span>
                          </div>
                          <p 
                            className="text-muted-foreground line-clamp-1"
                            style={{ 
                              fontSize: '0.7rem',
                              lineHeight: '1.4'
                            }}
                          >
                            {lesson.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Part III Chapter - Locked Premium Content */}
            <Collapsible open={chapter3Open} onOpenChange={setChapter3Open}>
              <CollapsibleTrigger className="w-full">
                <div className="px-4 py-3 border-b border-border bg-widget-header hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {chapter3Open ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground transition-transform" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground transition-transform" />
                      )}
                      <span 
                        className="text-foreground"
                        style={{ 
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          letterSpacing: '-0.01em'
                        }}
                      >
                        Part III: Advanced Trading Strategies
                      </span>
                      <Lock className="w-3 h-3 text-yellow-500 ml-1" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span 
                        className="px-1.5 py-0.5 rounded border"
                        style={{
                          fontSize: '0.7rem',
                          backgroundColor: 'rgb(234, 179, 8)',
                          borderColor: 'rgb(234, 179, 8)',
                          color: '#000000',
                          fontWeight: 600
                        }}
                      >
                        PREMIUM
                      </span>
                      <span 
                        className="px-1.5 py-0.5 rounded border"
                        style={{
                          fontSize: '0.7rem',
                          backgroundColor: 'var(--widget-body)',
                          borderColor: 'var(--border)',
                          color: 'var(--foreground)',
                          fontWeight: 600
                        }}
                      >
                        {chapter3Completed}/{chapter3Lessons.length}
                      </span>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-widget-body relative overflow-hidden min-h-[400px]">
                  {/* Blurred Lessons Background */}
                  <div style={{ filter: 'blur(4px)', opacity: 0.7 }}>
                    {chapter3Lessons.map((lesson) => (
                      <div key={lesson.id} className="relative">
                        <div className="w-full text-left px-3 py-2.5 border-b border-border">
                          <div className="flex gap-2.5">
                            <div 
                              className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border"
                              style={{
                                fontSize: '0.7rem',
                                backgroundColor: 'var(--widget-body)',
                                borderColor: 'var(--border)',
                                color: 'var(--muted-foreground)',
                                fontWeight: 600
                              }}
                            >
                              {lesson.id}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-0.5">
                                <h4 
                                  className="text-foreground flex-1"
                                  style={{ 
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    lineHeight: '1.3'
                                  }}
                                >
                                  {lesson.id}. {lesson.title}
                                </h4>
                                <span 
                                  className="text-muted-foreground flex-shrink-0"
                                  style={{ 
                                    fontSize: '0.7rem',
                                    fontWeight: 500
                                  }}
                                >
                                  {lesson.duration}
                                </span>
                              </div>
                              <p 
                                className="text-muted-foreground line-clamp-1"
                                style={{ 
                                  fontSize: '0.7rem',
                                  lineHeight: '1.4'
                                }}
                              >
                                {lesson.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Upgrade Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(10, 10, 10, 0.5)' }}>
                    <div className="text-center px-6 py-8 max-w-sm">
                      <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{
                          backgroundColor: 'rgb(234, 179, 8)'
                        }}
                      >
                        <Lock className="w-8 h-8 text-black" />
                      </div>
                      <h3 
                        className="text-foreground mb-2"
                        style={{ 
                          fontSize: '1.2rem',
                          fontWeight: 600,
                          letterSpacing: '-0.015em'
                        }}
                      >
                        Premium Content
                      </h3>
                      <p 
                        className="text-muted-foreground mb-6"
                        style={{ 
                          fontSize: '0.85rem',
                          lineHeight: '1.6'
                        }}
                      >
                        Unlock advanced trading strategies and institutional techniques with our premium membership.
                      </p>
                      <button 
                        className="w-full py-3 px-6 rounded transition-all border-0"
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: 'var(--primary-foreground)',
                          fontWeight: 600,
                          fontSize: '0.9rem'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#ea580c';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--primary)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        Upgrade to Premium
                      </button>
                      <p 
                        className="text-muted-foreground mt-4"
                        style={{ 
                          fontSize: '0.75rem'
                        }}
                      >
                        Starting at <span style={{ fontWeight: 600, color: 'var(--primary)' }}>$99/month</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Course Info - Right Side */}
        <div 
          className="w-80 flex flex-col bg-widget-header overflow-y-auto"
        >
          {/* Course Banner */}
          <div className="relative">
            <img 
              src={exampleImage} 
              alt="Peak Performance Trading"
              className="w-full h-32 object-cover"
            />
          </div>

          {/* Progress Section */}
          <div className="p-4 border-b border-border">
            <div className="mb-3">
              <div className="flex items-baseline justify-between mb-2">
                <span 
                  className="text-foreground"
                  style={{ 
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    letterSpacing: '-0.01em'
                  }}
                >
                  {completedLessons} of {totalLessons} Lessons Completed
                </span>
                <span 
                  className="text-muted-foreground"
                  style={{ 
                    fontSize: '0.8rem',
                    fontWeight: 500
                  }}
                >
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-widget-body rounded-full overflow-hidden border border-border">
                <div 
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ 
                    width: `${progressPercentage}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center p-2 rounded border border-border bg-widget-body">
                <div 
                  className="text-foreground mb-0.5"
                  style={{ 
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    letterSpacing: '-0.02em'
                  }}
                >
                  {completedLessons}
                </div>
                <div 
                  className="text-muted-foreground"
                  style={{ 
                    fontSize: '0.7rem',
                    fontWeight: 500
                  }}
                >
                  Completed
                </div>
              </div>
              <div className="text-center p-2 rounded border border-border bg-widget-body">
                <div 
                  className="text-foreground mb-0.5"
                  style={{ 
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    letterSpacing: '-0.02em'
                  }}
                >
                  {totalLessons - completedLessons}
                </div>
                <div 
                  className="text-muted-foreground"
                  style={{ 
                    fontSize: '0.7rem',
                    fontWeight: 500
                  }}
                >
                  Remaining
                </div>
              </div>
              <div className="text-center p-2 rounded border border-border bg-widget-body">
                <div 
                  className="text-foreground mb-0.5"
                  style={{ 
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    letterSpacing: '-0.02em'
                  }}
                >
                  24h
                </div>
                <div 
                  className="text-muted-foreground"
                  style={{ 
                    fontSize: '0.7rem',
                    fontWeight: 500
                  }}
                >
                  Time Left
                </div>
              </div>
            </div>
          </div>

          {/* Mentorship Section */}
          <div className="p-4">
            {/* Mentor Image */}
            <div className="mb-4 rounded overflow-hidden border border-border">
              <img 
                src={mentorImage}
                alt="Professional Mentor"
                className="w-full h-32 object-cover"
              />
            </div>

            <div 
              className="text-center mb-3"
              style={{ 
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--foreground)',
                letterSpacing: '-0.01em'
              }}
            >
              We are always by your side!
            </div>

            <p 
              className="text-muted-foreground text-center mb-4"
              style={{ 
                fontSize: '0.8rem',
                lineHeight: '1.5'
              }}
            >
              Click here to go to your personal Discord Group and ask us any questions.
            </p>

            {/* CTA Button */}
            <button 
              className="w-full py-2.5 px-4 rounded border transition-all"
              style={{
                backgroundColor: 'var(--primary)',
                borderColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ea580c';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary)';
              }}
            >
              Your Personal Mentoring Group
            </button>

            {/* Quick Links */}
            <div className="mt-6 pt-4 border-t border-border space-y-2">
              <div 
                className="text-muted-foreground mb-3"
                style={{ 
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em'
                }}
              >
                QUICK LINKS
              </div>
              {[
                'Course Materials',
                'Trading Templates',
                'Community Forum',
                'Live Trading Sessions'
              ].map((link, index) => (
                <button
                  key={index}
                  className="w-full text-left px-3 py-2 rounded transition-colors hover:bg-widget-body border border-transparent hover:border-border"
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: 'var(--foreground)'
                  }}
                >
                  {link}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

