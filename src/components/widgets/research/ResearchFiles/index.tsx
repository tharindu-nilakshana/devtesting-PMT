
"use client";

import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, FileText, X, ExternalLink, ChevronLeft, ChevronDown, Bookmark, BookmarkCheck, ChevronRight, Eye, EyeOff, Globe, Maximize2 } from "lucide-react";

interface ResearchFilesProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, unknown>;
}

interface Outlook {
  company: string;
  rating: "NEUTRAL" | "BUY" | "SELL" | "HOLD";
  description: string;
}

interface ResearchPaper {
  id: string;
  releaseDate: string;
  researchDate: string;
  title: string;
  institute: string;
  tags: string[];
  type: string;
  category: string;
  highlighted?: number; // 0 or 1 from API
  takeaways?: string[];
  outlooks?: Outlook[];
}

interface ApiSummary {
  id: number;
  title: string;
  takeaways: string[];
}

interface ApiOutlook {
  summaryId: number;
  instrument: string;
  bias: string;
  timeFrame: string | null;
  rationale: string;
}

interface InsightCard {
  type: "takeaway" | "outlook";
  content: string;
  company?: string;
  rating?: "NEUTRAL" | "BUY" | "SELL" | "HOLD";
}

// Helper function to get institute logo path
// Matches institute names with PNG files in notification-logos folder
const getInstituteLogo = (instituteName: string): string => {
  if (!instituteName) return '/assets/img/logos/notification-logos/Academy Securities.png';
  
  // Normalize the name for matching (remove extra spaces, handle variations)
  const normalized = instituteName.trim();
  
  // Map common variations to exact filenames
  const nameMappings: Record<string, string> = {
    "J.P. Morgan": "J.P. Morgan.png",
    "JP Morgan": "J.P. Morgan.png",
    "JPM": "J.P. Morgan.png",
    "JPMorgan": "J.P. Morgan.png",
    "Citi": "CitiFX.png",
    "Citibank": "CitiFX.png",
    "CitiFX": "CitiFX.png",
    "Bank of America": "Bank of America Securities.png",
    "BofA": "Bank of America Securities.png",
    "BOA": "Bank of America Securities.png",
    "RBC": "RBC Capital Markets.png",
    "Goldman Sachs": "Goldman Sachs.png",
    "GS": "Goldman Sachs.png",
    "Morgan Stanley": "Morgan Stanley.png",
    "MS": "Morgan Stanley.png",
    "MUFG": "MUFG.png",
    "Mizuho": "Mizuho Bank.png",
    "Mizuho Bank": "Mizuho Bank.png",
    "Standard Chartered": "Standard Chartered.png",
    "Wells Fargo": "Wells Fargo.png",
    "UBS": "UBS.png",
    "Credit Suisse": "Credit Suisse.png",
    "Deutsche Bank": "Deutsche Bank.png",
    "Barclays": "Barclays.png",
    "HSBC": "HSBC.png",
    "BNP Paribas": "BNP Paribas.png",
    "Société Générale": "Société Générale.png",
    "Societe Generale": "Société Générale.png",
    "NatWest": "NatWest.png",
    "Lloyds Bank": "Lloyds Bank.png",
    "Commerzbank": "Commerzbank.png",
    "UniCredit": "UniCredit.png",
    "Nordea": "Nordea.png",
    "SEB": "SEB.png",
    "DNB Markets": "DNB Markets.png",
    "Scotiabank": "Scotiabank.png",
    "TD Securities": "TD Securities.png",
    "CIBC Capital Markets": "CIBC Capital Markets.png",
    "RBC Capital Markets": "RBC Capital Markets.png",
    "Westpac": "Westpac.png",
    "ANZ": "ANZ.png",
    "Commonwealth Bank of Australia": "Commonwealth Bank of Australia.png",
    "BNZ": "BNZ.png",
    "ING": "ING.png",
    "Berenberg": "Berenberg.png",
    "Jefferies": "Jefferies.png",
    "Nomura Securities": "Nomura Securities.png",
    "Nomura": "Nomura Securities.png",
    "PIMCO": "PIMCO.png",
    "BlackRock": "BlackRock.png",
    "Amundi": "Amundi.png",
    "Schroders": "Schroders.png",
    "Janus Henderson Investors": "Janus Henderson Investors.png",
    "Pictet Group": "Pictet Group.png",
    "Pictet": "Pictet Group.png",
    "J. Safra Sarasin": "J. Safra Sarasin.png",
    "MAN Institute": "MAN Institute.png",
    "Investec Bank": "Investec Bank.png",
    "Crédit Agricole": "Crédit Agricole.png",
    "Credit Agricole": "Crédit Agricole.png",
    "Natixis": "Natixis.png",
    "BNY Mellon": "BNY Mellon.png",
    "Bank of England": "Bank of England.png",
    "BOE": "Bank of England.png",
    "Bank of Japan": "Bank of Japan.png",
    "BOJ": "Bank of Japan.png",
    "ADP": "ADP.png",
    "Academy Securities": "Academy Securities.png",
    "Newsquawk": "Newsquawk.png",
    "MNI": "MNI.png",
    "IFR": "IFR.png",
    "Refinitiv": "Refinitiv.png",
    "S&P Global": "S&P Global.png",
    "Spectra Market": "Spectra Market.png",
    "TS Lombard": "TS Lombard.png",
    "QCAM": "QCAM.png",
  };
  
  // Check exact match first
  if (nameMappings[normalized]) {
    return `/assets/img/logos/notification-logos/${nameMappings[normalized]}`;
  }
  
  // Try case-insensitive match
  const lowerNormalized = normalized.toLowerCase();
  for (const [key, value] of Object.entries(nameMappings)) {
    if (key.toLowerCase() === lowerNormalized) {
      return `/assets/img/logos/notification-logos/${value}`;
    }
  }
  
  // Try partial match (if institute name contains mapped key)
  for (const [key, value] of Object.entries(nameMappings)) {
    if (normalized.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(lowerNormalized)) {
      return `/assets/img/logos/notification-logos/${value}`;
    }
  }
  
  // If no mapping found, try direct filename match (exact match)
  // The API might return names that exactly match the PNG filenames
  return `/assets/img/logos/notification-logos/${normalized}.png`;
};

// Helper function to decode HTML entities and strip HTML tags
const decodeHtmlEntities = (html: string): string => {
  if (!html) return '';
  // First decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  let decoded = textarea.value;
  // Strip any remaining HTML tags
  decoded = decoded.replace(/<[^>]*>/g, '');
  // Decode common entities that might remain
  decoded = decoded
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'");
  return decoded.trim();
};

// Helper function to parse tags from pipe-separated string
const parseTags = (tagsString: string | null | undefined): string[] => {
  if (!tagsString || typeof tagsString !== 'string') return [];
  return tagsString.split('|').map(tag => tag.trim()).filter(tag => tag.length > 0);
};

// Helper function to infer category from tags or name
const inferCategory = (name: string, tags: string[]): string => {
  const lowerName = name.toLowerCase();
  const lowerTags = tags.map(t => t.toLowerCase()).join(' ');
  
  if (lowerTags.includes('fx') || lowerTags.includes('currency') || lowerTags.includes('forex') || lowerTags.includes('usd') || lowerTags.includes('eur')) {
    return 'FX Research';
  }
  if (lowerTags.includes('equity') || lowerTags.includes('stock') || lowerTags.includes('earnings')) {
    return 'Equity Research';
  }
  if (lowerTags.includes('fixed income') || lowerTags.includes('bond') || lowerTags.includes('treasury')) {
    return 'Fixed Income';
  }
  if (lowerTags.includes('economic') || lowerTags.includes('macro') || lowerTags.includes('gdp') || lowerTags.includes('cpi')) {
    return 'Economic Research';
  }
  if (lowerTags.includes('commodit') || lowerTags.includes('oil') || lowerTags.includes('gold')) {
    return 'Commodities';
  }
  if (lowerTags.includes('sector') || lowerTags.includes('industry')) {
    return 'Sector Report';
  }
  if (lowerTags.includes('patent')) {
    return 'Patents';
  }
  if (lowerName.includes('policy') || lowerTags.includes('political')) {
    return 'Political Analysis';
  }
  
  return 'Bank Research'; // Default category
};


// Categories to exclude from dropdown
const EXCLUDED_CATEGORIES = ['Commodities', 'Economic Research', 'Equity Research', 'FX Research', 'Fixed Income', 'Sector Report', 'Political Analysis'];

// Categories will be dynamically generated from API data
const DEFAULT_CATEGORIES = [
  "All Types",
  "Bank Research",
  "Patents",
  "Analyst Reports"
];

export function ResearchFiles({ onSettings, onRemove, onFullscreen, settings }: ResearchFilesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaper, setSelectedPaper] = useState<ResearchPaper | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All Types");
  const [selectedInstitute, setSelectedInstitute] = useState("All Institutes");
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showInstituteMenu, setShowInstituteMenu] = useState(false);
  const [savedPapers, setSavedPapers] = useState<Set<string>>(new Set());
  const [hoveredTagRow, setHoveredTagRow] = useState<string | null>(null);
  const [insightIndex, setInsightIndex] = useState(0);
  const [showInsights, setShowInsights] = useState(true);
  const [tagScrollPosition, setTagScrollPosition] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tagsContainerRef = useRef<HTMLDivElement>(null);
  
  // Container width tracking for responsive layout
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update scroll button states
  const updateScrollButtons = useCallback(() => {
    if (tagsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tagsContainerRef.current;
      setTagScrollPosition(scrollLeft);
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);
  
  // API data states
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [institutes, setInstitutes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  
  // PDF viewer states
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  
  // HTML content states for analyst reports
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [analystReportData, setAnalystReportData] = useState<any | null>(null);
  
  // Summary states
  const [summaryData, setSummaryData] = useState<{ takeaways: string[]; outlooks: Outlook[] } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  // Scroll position tracking
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const savedScrollPosition = useRef<number>(0);
  
  // Refs for button containers to lock their widths
  const categoryButtonRef = useRef<HTMLButtonElement | null>(null);
  const instituteButtonRef = useRef<HTMLButtonElement | null>(null);
  const categoryContainerRef = useRef<HTMLDivElement | null>(null);
  const instituteContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Track read status for papers
  const [readPapers, setReadPapers] = useState<Set<string>>(new Set());

  // Track container width using ResizeObserver for responsive layout
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Determine if we should use mobile layout based on container width
  // lg breakpoint is 1024px, so use mobile layout if container is smaller
  const useMobileLayout = containerWidth > 0 && containerWidth < 1024;

  // Fetch institutes on mount
  useEffect(() => {
    const fetchInstitutes = async () => {
      try {
        const response = await fetch('/api/pmt/research-institutes', {
          method: 'POST',
        });
        if (!response.ok) throw new Error('Failed to fetch institutes');
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          const instituteNames = result.data
            .map((item: { Institute?: string }) => item.Institute)
            .filter((name: string) => name && name.trim().length > 0);
          setInstitutes(['All Institutes', ...instituteNames.sort()]);
        }
      } catch (err) {
        console.error('Error fetching institutes:', err);
      }
    };
    fetchInstitutes();
  }, []);

  // Fetch papers
  const fetchPapers = useCallback(async (searchString: string = '', fileType: string = 'research paper', institute: string = '', sortBy: string = 'Date', sortOrder: string = 'desc', category: string = 'All Types') => {
    setLoading(true);
    setError(null);
    try {
      // Determine which API endpoint to use based on category
      const isAnalystReports = category === 'Analyst Reports';
      const apiEndpoint = isAnalystReports ? '/api/pmt/analyst-reports' : '/api/pmt/research-files';
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          SearchString: searchString,
          FileType: fileType,
          Institute: institute,
          sortby: sortBy,
          sortorder: sortOrder,
        }),
      });
      
      if (!response.ok) throw new Error(isAnalystReports ? 'Failed to fetch analyst reports' : 'Failed to fetch research files');
      const result = await response.json();
      
      // Debug logging for analyst reports
      if (isAnalystReports) {
        console.log('📊 [Analyst Reports] API response:', result);
        console.log('📊 [Analyst Reports] Response structure:', {
          success: result.success,
          hasData: !!result.data,
          dataType: typeof result.data,
          isDataArray: Array.isArray(result.data),
          hasFileList: !!result.data?.FileList,
          hasSessionWarps: !!result.data?.SessionWarps,
          fileListLength: result.data?.FileList?.length || 0,
          sessionWarpsLength: result.data?.SessionWarps?.length || 0
        });
      }
      
      // Handle different response structures - analyst reports uses SessionWarps instead of FileList
      let fileList: any[] = [];
      if (result.success) {
        // Check if data.FileList exists (research files format)
        if (result.data?.FileList && Array.isArray(result.data.FileList)) {
          fileList = result.data.FileList;
        }
        // Check if data.SessionWarps exists (analyst reports format)
        else if (result.data?.SessionWarps && Array.isArray(result.data.SessionWarps)) {
          fileList = result.data.SessionWarps;
        }
        // Check if data is directly an array (alternative format)
        else if (Array.isArray(result.data)) {
          fileList = result.data;
        }
        // Check if result is directly an array (some APIs return arrays directly)
        else if (Array.isArray(result)) {
          fileList = result;
        }
      }
      
      if (isAnalystReports) {
        console.log('📊 [Analyst Reports] Extracted fileList length:', fileList.length);
      }
      
      if (fileList.length > 0) {
        // Map API response to ResearchPaper interface
        const mappedPapers: ResearchPaper[] = fileList.map((file: any) => {
          const tags = parseTags(file.tags);
          // For Analyst Reports, use the category directly; otherwise infer it
          const paperCategory = isAnalystReports ? 'Analyst Reports' : inferCategory(file.name || file.headline, tags);
          
          return {
            id: String(file.id),
            releaseDate: file.datef || '',
            researchDate: file.researchdatef || file.datef || '',
            title: decodeHtmlEntities(file.name || file.headline || ''), // Analyst reports use 'headline', research files use 'name'
            institute: file.institute || '', // Analyst reports don't have institute
            tags: tags,
            type: file.FileType || 'PDF',
            category: paperCategory,
            highlighted: file.highlighted || file.Highlighted || 0, // Handle both cases
            // takeaways and outlooks are not provided by API, so we'll leave them empty
          };
        });
        
        setPapers(mappedPapers);
        
        // Initialize read status from API response and preserve existing read status
        // Use functional setState to avoid dependency issues
        setReadPapers(prev => {
          const readIds = new Set<string>(prev); // Preserve existing read status
          fileList.forEach((file: any) => {
          const fileId = String(file.id);
            // Check ReadStatus (handle both ReadStatus and Readstatus)
            const readStatus = file.ReadStatus !== undefined ? file.ReadStatus : file.Readstatus;
            if (readStatus !== null && readStatus !== undefined && readStatus !== false) {
            readIds.add(fileId);
          }
          });
          return readIds;
        });
        
        setSavedPapers(prev => {
          const savedIds = new Set<string>(prev); // Preserve existing saved status
          fileList.forEach((file: any) => {
            const fileId = String(file.id);
            // Check SavedStatus (handle both SavedStatus and Savedstatus)
            const savedStatus = file.SavedStatus !== undefined ? file.SavedStatus : file.Savedstatus;
            if (savedStatus !== null && savedStatus !== undefined && savedStatus !== false) {
            savedIds.add(fileId);
          }
        });
          return savedIds;
        });
        
        // Extract unique categories from papers and merge with default categories
        const uniqueCategories = new Set<string>(DEFAULT_CATEGORIES);
        mappedPapers.forEach(paper => {
          if (paper.category && !EXCLUDED_CATEGORIES.includes(paper.category)) {
            uniqueCategories.add(paper.category);
          }
        });
        setCategories(Array.from(uniqueCategories).sort());
      } else {
        setPapers([]);
      }
    } catch (err) {
      console.error('Error fetching papers:', err);
      const errorMessage = category === 'Analyst Reports' ? 'Failed to fetch analyst reports' : 'Failed to fetch research files';
      setError(err instanceof Error ? err.message : errorMessage);
      setPapers([]);
    } finally {
      setLoading(false);
      // Mark initial load as complete after first fetch
      isInitialLoadRef.current = false;
    }
  }, []);

  // Update container widths to match button content (doubled width)
  useEffect(() => {
    const updateWidths = () => {
      requestAnimationFrame(() => {
        if (categoryButtonRef.current && categoryContainerRef.current) {
          // Set fixed width - don't measure, just set to a fixed doubled width
          const fixedWidth = 200; // Fixed width in pixels (doubled from typical ~100px)
          categoryButtonRef.current.style.width = `${fixedWidth}px`;
          categoryContainerRef.current.style.width = `${fixedWidth}px`;
          categoryContainerRef.current.style.minWidth = `${fixedWidth}px`;
          categoryContainerRef.current.style.maxWidth = `${fixedWidth}px`;
        }
        if (instituteButtonRef.current && instituteContainerRef.current) {
          // Set fixed width - don't measure, just set to a fixed doubled width
          const fixedWidth = 200; // Fixed width in pixels (doubled from typical ~100px)
          instituteButtonRef.current.style.width = `${fixedWidth}px`;
          instituteContainerRef.current.style.width = `${fixedWidth}px`;
          instituteContainerRef.current.style.minWidth = `${fixedWidth}px`;
          instituteContainerRef.current.style.maxWidth = `${fixedWidth}px`;
        }
      });
    };
    
    // Update when selection changes
    updateWidths();
    const timeoutId = setTimeout(updateWidths, 10);
    const timeoutId2 = setTimeout(updateWidths, 100);
    window.addEventListener('resize', updateWidths);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
      window.removeEventListener('resize', updateWidths);
    };
  }, [selectedCategory, selectedInstitute]);

  // Fetch papers on mount and when filters change
  useEffect(() => {
    const instituteFilter = selectedInstitute === "All Institutes" ? '' : selectedInstitute;
    // Only call API - fetchPapers will determine which endpoint based on category
    fetchPapers(searchQuery, 'research paper', instituteFilter, 'Date', 'desc', selectedCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedInstitute, selectedCategory]);

  const filteredPapers = papers.filter(paper => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      paper.title.toLowerCase().includes(query) ||
      paper.institute.toLowerCase().includes(query) ||
      paper.tags.some(tag => tag.toLowerCase().includes(query));
    
    const matchesCategory = selectedCategory === "All Types" || paper.category === selectedCategory;
    const matchesInstitute = selectedInstitute === "All Institutes" || paper.institute === selectedInstitute;
    
    return matchesSearch && matchesCategory && matchesInstitute;
  });

  const toggleSave = (paperId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedPapers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paperId)) {
        newSet.delete(paperId);
      } else {
        newSet.add(paperId);
      }
      return newSet;
    });
  };

  // Helper function to transform API bias to rating
  const transformBiasToRating = (bias: string): "NEUTRAL" | "BUY" | "SELL" | "HOLD" => {
    const lowerBias = bias.toLowerCase();
    if (lowerBias.includes('bullish') || lowerBias === 'buy') return "BUY";
    if (lowerBias.includes('bearish') || lowerBias === 'sell') return "SELL";
    return "NEUTRAL";
  };

  // Fetch summary data for a paper
  const fetchSummary = useCallback(async (fileId: string, category?: string) => {
    setLoadingSummary(true);
    try {
      const isAnalystReport = category === 'Analyst Reports';
      const apiEndpoint = isAnalystReport ? '/api/pmt/analyst-report-summary' : '/api/pmt/research-file-summary';
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ FileID: fileId }),
      });

      if (!response.ok) {
        console.warn('Failed to fetch summary:', response.status);
        setSummaryData(null);
        return;
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Handle both research files and analyst reports response structures
        const { summaries, outlooks } = result.data;
        
        // Transform summaries to takeaways
        const allTakeaways: string[] = [];
        if (summaries && Array.isArray(summaries)) {
          summaries.forEach((summary: ApiSummary) => {
            if (summary.takeaways && Array.isArray(summary.takeaways)) {
              allTakeaways.push(...summary.takeaways);
            }
          });
        }
        
        // Transform outlooks
        const transformedOutlooks: Outlook[] = [];
        if (outlooks && Array.isArray(outlooks)) {
          outlooks.forEach((outlook: ApiOutlook) => {
            transformedOutlooks.push({
              company: outlook.instrument || 'Unknown',
              rating: transformBiasToRating(outlook.bias || 'neutral'),
              description: outlook.rationale || '',
            });
          });
        }
        
        setSummaryData({
          takeaways: allTakeaways,
          outlooks: transformedOutlooks,
        });
      } else {
        setSummaryData(null);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
      setSummaryData(null);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // Reset slider indices when selecting a new paper
  const handleSelectPaper = async (paper: ResearchPaper) => {
    // Save current scroll position before navigating away
    if (tableScrollRef.current) {
      savedScrollPosition.current = tableScrollRef.current.scrollTop;
    }
    
    // Mark as read if not already read
    if (!readPapers.has(paper.id)) {
      try {
        const isAnalystReport = paper.category === 'Analyst Reports';
        const apiEndpoint = isAnalystReport ? '/api/pmt/analyst-report-read' : '/api/pmt/research-file-read';
        const method = isAnalystReport ? 'POST' : 'PUT';
        
        const response = await fetch(apiEndpoint, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ FileID: paper.id }),
        });
        
        if (response.ok) {
          // Update local read status
          setReadPapers(prev => new Set(prev).add(paper.id));
        } else {
          console.error('Failed to mark file as read:', await response.text());
        }
      } catch (error) {
        console.error('Error marking file as read:', error);
        // Still proceed to show the paper even if marking as read fails
      }
    }
    
    setSelectedPaper(paper);
    setInsightIndex(0);
    setPdfUrl(null);
    setPdfError(null);
    setHtmlContent(null);
    setAnalystReportData(null);
    setSummaryData(null); // Reset summary when selecting new paper
    setShowInsights(true); // Show insights by default when opening a paper
    
    // Fetch summary for the selected paper (for both research files and analyst reports)
    fetchSummary(paper.id, paper.category);
  };

  // Restore scroll position when returning to list
  useEffect(() => {
    if (!selectedPaper && tableScrollRef.current && savedScrollPosition.current > 0) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (tableScrollRef.current) {
          tableScrollRef.current.scrollTop = savedScrollPosition.current;
        }
      }, 0);
    }
  }, [selectedPaper]);

  // Fetch PDF file or HTML content when paper is selected
  useEffect(() => {
    if (!selectedPaper) {
      setPdfUrl(null);
      setHtmlContent(null);
      setAnalystReportData(null);
      return;
    }

    const isAnalystReport = selectedPaper.category === 'Analyst Reports';

    const fetchContent = async () => {
      setLoadingPdf(true);
      setPdfError(null);
      
      try {
        if (isAnalystReport) {
          // Fetch HTML content for analyst reports
          const response = await fetch('/api/pmt/analyst-reports-detail', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ FileID: selectedPaper.id }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to fetch analyst report' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          const result = await response.json();
          
          if (result.success && result.data) {
            setAnalystReportData(result.data);
            // Decode HTML entities in Details field
            const details = result.data.Details || '';
            const decodedHtml = decodeHtmlEntities(details);
            setHtmlContent(decodedHtml);
          } else {
            throw new Error('Analyst report data not found in response');
          }
        } else {
          // Fetch PDF for research files
        const response = await fetch('/api/pmt/research-file-by-id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ FileID: selectedPaper.id }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch PDF' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        // Check if response is JSON (might contain URL) or PDF blob
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          const jsonData = await response.json();
          // If JSON contains a URL, use it; otherwise create blob URL from base64 if present
          if (jsonData.data?.url) {
            setPdfUrl(jsonData.data.url);
          } else if (jsonData.data?.pdfBase64) {
            // Convert base64 to blob URL
            const binaryString = atob(jsonData.data.pdfBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
          } else {
            throw new Error('PDF data not found in response');
          }
        } else {
          // Response is PDF blob
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
          }
        }
      } catch (err) {
        console.error('Error fetching content:', err);
        setPdfError(err instanceof Error ? err.message : (isAnalystReport ? 'Failed to load analyst report' : 'Failed to load PDF'));
      } finally {
        setLoadingPdf(false);
      }
    };

    fetchContent();

    // Cleanup: revoke object URL when component unmounts or paper changes
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPaper?.id]);

  // Download PDF handler
  const handleDownloadPdf = async () => {
    if (!selectedPaper) return;

    try {
      const response = await fetch('/api/pmt/research-file-by-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ FileID: selectedPaper.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedPaper.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setPdfError(err instanceof Error ? err.message : 'Failed to download PDF');
    }
  };

  // Open PDF in new tab
  const handleOpenInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  // Open analyst report in fullscreen mode
  const handleOpenFullscreen = () => {
    if (htmlContent && selectedPaper) {
      // Create a new window with the HTML content
      const fullscreenWindow = window.open('', '_blank');
      if (fullscreenWindow) {
        fullscreenWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${selectedPaper.title}</title>
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                html, body {
                  width: 100%;
                  height: 100%;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  padding: 20px;
                  background-color: #000;
                  color: #fff;
                  line-height: 1.6;
                  overflow-x: hidden;
                }
                .close-button {
                  position: fixed;
                  top: 20px;
                  right: 20px;
                  width: 40px;
                  height: 40px;
                  background-color: rgba(255, 255, 255, 0.1);
                  border: 1px solid rgba(255, 255, 255, 0.2);
                  border-radius: 8px;
                  color: #fff;
                  font-size: 20px;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  z-index: 1000;
                  transition: all 0.2s;
                }
                .close-button:hover {
                  background-color: rgba(255, 255, 255, 0.2);
                  border-color: rgba(255, 255, 255, 0.3);
                }
                .close-button:active {
                  background-color: rgba(255, 255, 255, 0.15);
                }
                .analyst-report-content {
                  font-size: 15px;
                  line-height: 1.7;
                  max-width: 1200px;
                  margin: 0 auto;
                }
                .analyst-report-content h5 {
                  font-size: 18px;
                  font-weight: 600;
                  margin-top: 24px;
                  margin-bottom: 12px;
                  color: #fff;
                }
                .analyst-report-content h5 span {
                  font-size: 18px;
                  font-weight: 600;
                }
                .analyst-report-content p {
                  font-size: 15px;
                  line-height: 1.7;
                  margin-bottom: 12px;
                  color: #fff;
                }
                .analyst-report-content ul {
                  font-size: 15px;
                  line-height: 1.7;
                  margin-bottom: 16px;
                  padding-left: 24px;
                }
                .analyst-report-content li {
                  font-size: 15px;
                  line-height: 1.7;
                  margin-bottom: 8px;
                  color: #fff;
                }
                .analyst-report-content hr {
                  margin: 24px 0;
                  border-color: #333;
                }
                .analyst-report-content b,
                .analyst-report-content strong {
                  font-weight: 600;
                }
                .analyst-report-content * {
                  font-size: inherit;
                }
                .analyst-report-content span {
                  font-size: inherit;
                }
              </style>
            </head>
            <body>
              <button class="close-button" onclick="closeFullscreen()" title="Close (Press ESC)">×</button>
              <div class="analyst-report-content">
                ${htmlContent}
              </div>
              <script>
                function closeFullscreen() {
                  // Exit fullscreen mode if active
                  if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
                    if (document.exitFullscreen) {
                      document.exitFullscreen();
                    } else if (document.webkitExitFullscreen) {
                      document.webkitExitFullscreen();
                    } else if (document.mozCancelFullScreen) {
                      document.mozCancelFullScreen();
                    } else if (document.msExitFullscreen) {
                      document.msExitFullscreen();
                    }
                  }
                  // Close the window
                  window.close();
                }
                
                // Listen for ESC key to close
                document.addEventListener('keydown', function(e) {
                  if (e.key === 'Escape') {
                    closeFullscreen();
                  }
                });
                
                // Request fullscreen when page loads
                window.addEventListener('load', function() {
                  const elem = document.documentElement;
                  if (elem.requestFullscreen) {
                    elem.requestFullscreen().catch(function(err) {
                      console.log('Fullscreen request failed:', err);
                    });
                  } else if (elem.webkitRequestFullscreen) {
                    elem.webkitRequestFullscreen();
                  } else if (elem.mozRequestFullScreen) {
                    elem.mozRequestFullScreen();
                  } else if (elem.msRequestFullscreen) {
                    elem.msRequestFullscreen();
                  }
                });
              </script>
            </body>
          </html>
        `);
        fullscreenWindow.document.close();
      }
    }
  };

  // Combine takeaways and outlooks into one array
  const getInsightCards = (paper: ResearchPaper): InsightCard[] => {
    const cards: InsightCard[] = [];
    
    // Use API summary data if available, otherwise use paper data
    const takeaways = summaryData?.takeaways || paper.takeaways || [];
    const outlooks = summaryData?.outlooks || paper.outlooks || [];
    
    // Add takeaways
    if (takeaways.length > 0) {
      takeaways.forEach(takeaway => {
        cards.push({ type: "takeaway", content: takeaway });
      });
    }
    
    // Add outlooks
    if (outlooks.length > 0) {
      outlooks.forEach(outlook => {
        cards.push({
          type: "outlook",
          content: outlook.description,
          company: outlook.company,
          rating: outlook.rating,
        });
      });
    }
    
    return cards;
  };

  const getTypeIcon = (type: string, category?: string) => {
    // Show web icon for Analyst Reports
    if (category === 'Analyst Reports') {
      return (
        <div className="flex items-center justify-center w-6 h-6 bg-blue-500/20 rounded">
          <Globe className="w-3.5 h-3.5 text-blue-500" />
        </div>
      );
    }
    
    switch (type) {
      case "PDF":
        return (
          <div className="flex items-center justify-center w-6 h-6 bg-destructive/20 rounded">
            <FileText className="w-3.5 h-3.5 text-destructive" />
          </div>
        );
      case "ING":
        return (
          <div className="flex items-center justify-center w-6 h-6 bg-primary/20 rounded">
            <FileText className="w-3.5 h-3.5 text-primary" />
          </div>
        );
      case "MUFG":
        return (
          <div className="flex items-center justify-center w-6 h-6 bg-destructive/20 rounded">
            <FileText className="w-3.5 h-3.5 text-destructive" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-6 h-6 bg-muted rounded">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        );
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "BUY":
        return "bg-success/20 text-success border-success/40";
      case "SELL":
        return "bg-destructive/20 text-destructive border-destructive/40";
      case "NEUTRAL":
      case "HOLD":
        return "bg-warning/20 text-warning border-warning/40";
      default:
        return "bg-muted/20 text-muted-foreground border-muted-foreground/40";
    }
  };

  // Reset tag scroll position when paper changes and update scroll buttons
  useEffect(() => {
    if (selectedPaper && tagsContainerRef.current) {
      tagsContainerRef.current.scrollLeft = 0;
      setTagScrollPosition(0);
      // Update scroll buttons after a brief delay to ensure layout is complete
      setTimeout(updateScrollButtons, 100);
    }
  }, [selectedPaper, updateScrollButtons]);

  // Update scroll buttons on mount and resize
  useEffect(() => {
    if (selectedPaper && tagsContainerRef.current) {
      updateScrollButtons();
      const resizeObserver = new ResizeObserver(() => {
        updateScrollButtons();
      });
      resizeObserver.observe(tagsContainerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [selectedPaper, updateScrollButtons]);

  if (selectedPaper) {
    return (
      <div className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden">
        <WidgetHeader 
          title={selectedCategory === "All Types" ? "Research Files" : selectedCategory}
          onRemove={onRemove}
          onFullscreen={onFullscreen}
        />

        {/* Detail View Header */}
        <div className="pl-2 md:pl-4 pr-2 md:pr-4 py-3 bg-widget-header border-b border-border">
          <div className="flex items-center mb-2 gap-2 md:gap-4">
            {/* Back to List - Left */}
            <div className="flex-shrink-0">
              <button
                onClick={() => setSelectedPaper(null)}
                className="flex items-center gap-1 md:gap-2 text-sm md:text-base text-muted-foreground hover:text-primary transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Back to List</span>
                <span className="sm:hidden">Back</span>
              </button>
            </div>
            
            {/* Title - Takes all remaining space and is centered */}
            <div className="flex-1 min-w-0 text-center overflow-hidden">
              <span className="text-sm md:text-base font-medium">{selectedPaper.title}</span>
            </div>
            
            {/* Hide Insights & Logo - Right */}
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <button
                onClick={() => setShowInsights(!showInsights)}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 text-sm md:text-base hover:opacity-80 transition-colors whitespace-nowrap"
                title={showInsights ? "Hide Insights" : "Show Insights"}
              >
                {showInsights ? <EyeOff className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                <span className="hidden sm:inline">{showInsights ? "Hide" : "Show"} Insights</span>
              </button>
              {selectedPaper.institute && (
                <img
                  src={getInstituteLogo(selectedPaper.institute)}
                  alt={selectedPaper.institute}
                  className="h-4 md:h-5 rounded"
                />
              )}
            </div>
          </div>
          
          {/* Tags Display - Horizontally Scrollable */}
          {selectedPaper.tags && selectedPaper.tags.length > 0 && (
            <div className="relative mt-2">
              <div className="flex items-center gap-2">
                {/* Left Arrow */}
                <button
                  onClick={() => {
                    if (tagsContainerRef.current) {
                      const scrollAmount = 200;
                      tagsContainerRef.current.scrollLeft -= scrollAmount;
                      updateScrollButtons();
                    }
                  }}
                  disabled={!canScrollLeft}
                  className="flex-shrink-0 p-1 hover:bg-muted/50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Scroll tags left"
                >
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                
                {/* Scrollable Tags Container */}
                <div
                  ref={tagsContainerRef}
                  className="flex-1 overflow-x-auto overflow-y-hidden gap-1.5 flex [&::-webkit-scrollbar]:hidden"
                  style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none'
                  }}
                  onScroll={updateScrollButtons}
                  onLoad={updateScrollButtons}
                >
              {selectedPaper.tags.map((tag, index) => (
                <span
                  key={index}
                      className="px-2 py-0.5 bg-muted/50 border border-border/60 rounded text-xs text-muted-foreground hover:bg-muted/70 transition-colors whitespace-nowrap flex-shrink-0"
                >
                  {tag}
                </span>
              ))}
                </div>
                
                {/* Right Arrow */}
                <button
                  onClick={() => {
                    if (tagsContainerRef.current) {
                      const scrollAmount = 200;
                      tagsContainerRef.current.scrollLeft += scrollAmount;
                      updateScrollButtons();
                    }
                  }}
                  disabled={!canScrollRight}
                  className="flex-shrink-0 p-1 hover:bg-muted/50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Scroll tags right"
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Combined Insights Section */}
        {showInsights && (() => {
          const insightCards = getInsightCards(selectedPaper);
          if (insightCards.length === 0) return null;
          return (
            <div className="px-4 py-1.5 bg-muted/20 border-b border-border">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                    <img src="/assets/widgets/049eb5c7f3378fd80253d048d5a531e533b33f8c.png" alt="PMT AI" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-xs">AI Insights</span>
                </div>
                {insightCards.length > 3 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setInsightIndex(Math.max(0, insightIndex - 1))}
                      disabled={insightIndex === 0}
                      className="p-1.5 hover:bg-muted rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {insightIndex + 1}-{Math.min(insightIndex + 3, insightCards.length)} of {insightCards.length}
                    </span>
                    <button
                      onClick={() => setInsightIndex(Math.min(insightCards.length - 3, insightIndex + 1))}
                      disabled={insightIndex >= insightCards.length - 3}
                      className="p-1.5 hover:bg-muted rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="relative overflow-hidden">
                <div 
                  className="flex gap-3 transition-transform duration-300 ease-in-out"
                  style={{ transform: `translateX(-${insightIndex * (288 + 12)}px)` }}
                >
                  {insightCards.map((card, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0 w-72 bg-widget-body border border-border/60 rounded-lg shadow-sm hover:border-primary/30 transition-colors"
                    >
                      {card.type === "takeaway" ? (
                        <div className="p-3 flex items-start gap-3">
                          <div className="w-1 h-full bg-primary/60 rounded-full flex-shrink-0 mt-1"></div>
                          <p className="text-xs leading-relaxed text-foreground/90">{card.content}</p>
                        </div>
                      ) : (
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm">{card.company}</span>
                            <span className={`px-2.5 py-1 rounded text-xs font-medium border ${getRatingColor(card.rating!)}`}>
                              {card.rating}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-foreground/80">{card.content}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
        {showInsights && loadingSummary && (
          <div className="px-4 py-4 bg-widget-body border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                <img src="/assets/widgets/049eb5c7f3378fd80253d048d5a531e533b33f8c.png" alt="PMT AI" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm">AI Insights</span>
                <span className="text-xs text-muted-foreground">Loading summaries...</span>
              </div>
            </div>
          </div>
        )}

        {/* PDF Viewer / HTML Content Viewer */}
        <div className="flex-1 bg-widget-body flex flex-col items-center justify-center overflow-hidden">
          {loadingPdf ? (
            <div className="w-full max-w-4xl h-full bg-muted/20 border border-border rounded m-2 md:m-4 flex flex-col items-center justify-center p-4 md:p-8 text-center">
              <FileText className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground mb-4 animate-pulse" />
              <h3 className="mb-2 text-sm md:text-lg">{selectedPaper.category === 'Analyst Reports' ? 'Loading Report...' : 'Loading PDF...'}</h3>
              <p className="text-xs md:text-sm text-muted-foreground mb-4 px-2">
                {selectedPaper.title}
              </p>
            </div>
          ) : pdfError ? (
            <div className="w-full max-w-4xl h-full bg-muted/20 border border-border rounded m-2 md:m-4 flex flex-col items-center justify-center p-4 md:p-8 text-center">
              <FileText className="w-12 h-12 md:w-16 md:h-16 text-destructive mb-4" />
              <h3 className="mb-2 text-sm md:text-lg">{selectedPaper.category === 'Analyst Reports' ? 'Analyst Report Viewer' : 'PDF Document Viewer'}</h3>
              <p className="text-xs md:text-sm text-muted-foreground mb-2 px-2">
                {selectedPaper.title}
              </p>
              <p className="text-xs md:text-sm text-destructive mb-4 px-2">
                Error: {pdfError}
              </p>
            </div>
          ) : selectedPaper.category === 'Analyst Reports' && htmlContent ? (
            <div className="flex-1 w-full flex flex-col relative overflow-auto custom-scrollbar">
              <style dangerouslySetInnerHTML={{__html: `
                .analyst-report-content {
                  font-size: 14px !important;
                  line-height: 1.7 !important;
                  color: inherit;
                }
                @media (min-width: 768px) {
                  .analyst-report-content {
                    font-size: 15px !important;
                  }
                }
                .analyst-report-content h5 {
                  font-size: 16px !important;
                  font-weight: 600 !important;
                  margin-top: 20px !important;
                  margin-bottom: 10px !important;
                  color: inherit !important;
                }
                @media (min-width: 768px) {
                  .analyst-report-content h5 {
                    font-size: 18px !important;
                  margin-top: 24px !important;
                  margin-bottom: 12px !important;
                  }
                }
                .analyst-report-content h5 span {
                  font-size: inherit !important;
                  font-weight: 600 !important;
                }
                .analyst-report-content p {
                  font-size: inherit !important;
                  line-height: 1.7 !important;
                  margin-bottom: 10px !important;
                  color: inherit !important;
                }
                @media (min-width: 768px) {
                  .analyst-report-content p {
                    margin-bottom: 12px !important;
                  }
                }
                .analyst-report-content ul {
                  font-size: inherit !important;
                  line-height: 1.7 !important;
                  margin-bottom: 12px !important;
                  padding-left: 20px !important;
                }
                @media (min-width: 768px) {
                  .analyst-report-content ul {
                  margin-bottom: 16px !important;
                  padding-left: 24px !important;
                  }
                }
                .analyst-report-content li {
                  font-size: inherit !important;
                  line-height: 1.7 !important;
                  margin-bottom: 6px !important;
                  color: inherit !important;
                }
                @media (min-width: 768px) {
                  .analyst-report-content li {
                    margin-bottom: 8px !important;
                  }
                }
                .analyst-report-content hr {
                  margin: 20px 0 !important;
                  border-color: hsl(var(--border)) !important;
                }
                @media (min-width: 768px) {
                  .analyst-report-content hr {
                    margin: 24px 0 !important;
                  }
                }
                .analyst-report-content b,
                .analyst-report-content strong {
                  font-weight: 600 !important;
                  font-size: inherit !important;
                }
                .analyst-report-content * {
                  font-size: inherit !important;
                }
                .analyst-report-content span {
                  font-size: inherit !important;
                }
              `}} />
              <div className="flex-1 p-3 md:p-6 max-w-6xl mx-auto w-full">
                <div 
                  className="analyst-report-content"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </div>
              {selectedPaper.category !== 'Analyst Reports' && (
              <div className="sticky bottom-0 px-2 md:px-4 py-2 bg-widget-header border-t border-border flex items-center justify-center gap-2 z-10">
                <button 
                  onClick={handleOpenFullscreen}
                  className="px-3 md:px-4 py-2 bg-yellow-500 text-black rounded text-xs md:text-sm hover:bg-yellow-600 transition-colors flex items-center gap-2"
                >
                  <Maximize2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Open in Fullscreen</span>
                  <span className="sm:hidden">Fullscreen</span>
                </button>
              </div>
              )}
            </div>
          ) : pdfUrl ? (
            <div className="flex-1 w-full flex flex-col relative">
              <iframe
                src={pdfUrl}
                className="flex-1 w-full border-0"
                title={selectedPaper.title}
                style={{ minHeight: '300px' }}
              />
            </div>
          ) : (
            <div className="w-full max-w-4xl h-full bg-muted/20 border border-border rounded m-2 md:m-4 flex flex-col items-center justify-center p-4 md:p-8 text-center">
              <FileText className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground mb-4" />
              <h3 className="mb-2 text-sm md:text-lg">{selectedPaper.category === 'Analyst Reports' ? 'Analyst Report Viewer' : 'PDF Document Viewer'}</h3>
              <p className="text-xs md:text-sm text-muted-foreground mb-4 px-2">
                {selectedPaper.title}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden relative" style={{ overflowX: 'visible' }}>
      <WidgetHeader 
        title={selectedCategory === "All Types" ? "Research Files" : selectedCategory}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
      />

      {/* Search Bar and Filters */}
      <div className="px-2 lg:px-4 py-2 bg-widget-header border-b border-border relative z-[100] flex-shrink-0" style={{ height: 'auto', maxHeight: 'none' }}>
        <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-0" style={{ maxWidth: '100%', flexShrink: 1 }}>
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm lg:text-base bg-input border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ height: '32px', boxSizing: 'border-box', maxWidth: '100%' }}
            />
          </div>

          {/* Filters Row */}
          <div className="flex gap-2 items-stretch flex-shrink-0">
          {/* Category Filter */}
            <div ref={categoryContainerRef} className="relative flex-1 lg:flex-shrink-0 lg:flex-grow-0" style={{ height: '32px', overflow: 'visible' }}>
            <button
              ref={categoryButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setShowCategoryMenu(!showCategoryMenu);
                setShowInstituteMenu(false);
              }}
                className={`w-full lg:w-auto h-[32px] flex items-center justify-between lg:justify-center gap-2 px-3 py-1.5 text-sm lg:text-base bg-muted hover:bg-muted/80 transition-colors border border-border whitespace-nowrap box-border ${showCategoryMenu ? 'rounded-t border-b-0' : 'rounded'}`}
            >
                <span className="truncate">{selectedCategory}</span>
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </button>
            {showCategoryMenu && (
              <>
                <div
                  className="fixed inset-0 z-[100]"
                  onClick={() => setShowCategoryMenu(false)}
                />
                <div className="absolute left-0 z-[10001] bg-popover border border-border rounded-b shadow-xl max-h-[300px] overflow-y-auto custom-scrollbar" style={{ width: 'max-content', minWidth: '200px', maxWidth: '220px', top: '0px' }}>
                  <div className="pb-1 px-1">
                    {((categories.length > 0 ? categories : DEFAULT_CATEGORIES).filter(category => 
                      !EXCLUDED_CATEGORIES.includes(category)
                    )).map((category) => (
                      <button
                        key={category}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCategory(category);
                          setShowCategoryMenu(false);
                        }}
                        className={`block w-full text-left px-3 py-1.5 text-base rounded transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${
                          selectedCategory === category
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                        title={category}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Institute Filter - Hidden for Analyst Reports and Patents */}
          {selectedCategory !== "Analyst Reports" && selectedCategory !== "Patents" && (
            <div ref={instituteContainerRef} className="relative flex-1 lg:flex-shrink-0 lg:flex-grow-0" style={{ height: '32px', overflow: 'visible' }}>
            <button
              ref={instituteButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setShowInstituteMenu(!showInstituteMenu);
                setShowCategoryMenu(false);
              }}
                className={`w-full lg:w-auto h-[32px] flex items-center justify-between lg:justify-center gap-2 px-3 py-1.5 text-sm lg:text-base bg-muted hover:bg-muted/80 transition-colors border border-border whitespace-nowrap box-border ${showInstituteMenu ? 'rounded-t border-b-0' : 'rounded'}`}
            >
                <span className="truncate">{selectedInstitute}</span>
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </button>
            {showInstituteMenu && (
              <>
                <div
                  className="fixed inset-0 z-[100]"
                  onClick={() => setShowInstituteMenu(false)}
                />
                <div className="absolute left-0 z-[10001] bg-popover border border-border rounded-b shadow-xl max-h-[300px] overflow-y-auto custom-scrollbar" style={{ width: 'max-content', minWidth: '200px', maxWidth: '220px', top: '0px' }}>
                  <div className="pb-1 px-1">
                    {(institutes.length > 0 ? institutes : ['All Institutes']).map((institute) => (
                      <button
                        key={institute}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInstitute(institute);
                          setShowInstituteMenu(false);
                        }}
                        className={`block w-full text-left px-3 py-1.5 text-base rounded transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${
                          selectedInstitute === institute
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                        title={institute}
                      >
                        {institute}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Mobile Card Layout & Desktop Table */}
      <div 
        ref={tableScrollRef}
        className="flex-1 overflow-auto custom-scrollbar"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm md:text-base text-muted-foreground">Loading research papers...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm md:text-base text-destructive">Error loading papers: {error}</div>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm md:text-base text-muted-foreground">No research papers found</div>
          </div>
        ) : (
          <>
            {/* Mobile Card Layout */}
            {useMobileLayout && (
            <div className="space-y-3 p-3">
              {filteredPapers.map((paper) => {
                const isHighlighted = paper.highlighted === 1;
                const isRead = readPapers.has(paper.id);
                return (
                  <div
                    key={paper.id}
                    onClick={() => handleSelectPaper(paper)}
                    className={`group rounded-xl border transition-all duration-200 cursor-pointer backdrop-blur-sm ${
                      isHighlighted 
                        ? "border-primary/50 bg-[rgb(45,25,12)] shadow-lg shadow-primary/20" 
                        : isRead
                        ? "bg-muted/10 border-border/50"
                        : "bg-widget-body/95 border-border/50 hover:border-primary/30 hover:bg-widget-body hover:shadow-md"
                    }`}
                  >
                    {isHighlighted ? (
                      <div className="p-4 space-y-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 flex items-center justify-center bg-primary/20 rounded-lg flex-shrink-0 border border-primary/30">
                            <span className="text-xs font-bold text-primary">PMT</span>
                          </div>
                        </div>
                        <h3 className="text-base font-semibold leading-relaxed text-foreground line-clamp-2">
                          {paper.title}
                        </h3>
                        {paper.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {paper.tags.slice(0, 6).map((tag, index) => (
                              <span key={index} className="px-2.5 py-1 bg-muted/50 text-muted-foreground rounded-lg text-xs font-medium border border-border/50">
                                {tag}
                              </span>
                            ))}
                            {paper.tags.length > 6 && (
                              <span className="px-2.5 py-1 bg-muted/50 text-muted-foreground rounded-lg text-xs font-medium border border-border/50">
                                +{paper.tags.length - 6}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getTypeIcon(paper.type, paper.category)}
                          </div>
                          <div className="flex-1 min-w-0 space-y-2.5">
                            <h3 className={`text-base font-semibold leading-relaxed line-clamp-2 ${isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {paper.title}
                            </h3>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                {paper.releaseDate && (
                                    <span className="text-sm text-muted-foreground">{paper.releaseDate}</span>
                              )}
                                    {paper.researchDate && (
                                <>
                                  {paper.releaseDate && (
                                    <span className="text-sm text-muted-foreground/50">•</span>
                                    )}
                                  <span className="text-sm text-muted-foreground">{paper.researchDate}</span>
                                  </>
                                )}
                                {paper.institute && (
                                  <>
                                  {(paper.releaseDate || paper.researchDate) && (
                                    <span className="text-sm text-muted-foreground/50">•</span>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={getInstituteLogo(paper.institute)}
                                      alt={paper.institute}
                                      className="h-4 w-auto rounded"
                                    />
                                    <span className="text-sm text-muted-foreground truncate max-w-[120px]">{paper.institute}</span>
                                  </div>
                                  </>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => toggleSave(paper.id, e)}
                            className="flex-shrink-0 p-2 hover:bg-muted/60 rounded-lg transition-colors mt-1"
                              title={savedPapers.has(paper.id) ? "Remove from saved" : "Save for later"}
                            >
                              {savedPapers.has(paper.id) ? (
                                <BookmarkCheck className="w-5 h-5 text-orange-500" />
                              ) : (
                              <Bookmark className="w-5 h-5 text-muted-foreground/70 group-hover:text-muted-foreground transition-colors" />
                              )}
                            </button>
                        </div>
                        {paper.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-border/40">
                            {paper.tags.slice(0, 6).map((tag, index) => (
                              <span key={index} className={`px-2.5 py-1 bg-muted/40 text-muted-foreground rounded-lg text-xs font-medium border border-border/40 ${isRead ? 'opacity-60' : ''}`}>
                                {tag}
                              </span>
                            ))}
                            {paper.tags.length > 6 && (
                              <span className={`px-2.5 py-1 bg-muted/40 text-muted-foreground rounded-lg text-xs font-medium border border-border/40 ${isRead ? 'opacity-60' : ''}`}>
                                +{paper.tags.length - 6}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}

            {/* Desktop Table Layout */}
            {!useMobileLayout && (
            <table className="w-full text-base" style={{ tableLayout: 'fixed' }}>
            <thead className="sticky top-0 z-10 bg-widget-header border-b border-border">
            <tr>
              <th className="text-left px-2 py-2 text-base text-muted-foreground" style={{ width: '80px', maxWidth: '80px', minWidth: '70px' }}>
                <span className="hidden xl:inline">Release Date</span>
                <span className="xl:hidden">Release</span>
              </th>
              <th className="text-left px-2 py-2 text-base text-muted-foreground" style={{ width: '90px', maxWidth: '90px', minWidth: '70px' }}>
                <span className="hidden xl:inline">Research Date</span>
                <span className="xl:hidden">Research</span>
              </th>
              <th className="text-center px-2 py-2 text-base text-muted-foreground whitespace-nowrap" style={{ width: '60px', maxWidth: '60px', minWidth: '50px' }}>
                File
              </th>
              <th className="text-left px-3 py-2 text-base text-muted-foreground" style={{ minWidth: '300px', width: '45%' }}>
                Title
              </th>
              <th className="text-center px-3 py-2 text-base text-muted-foreground whitespace-nowrap" style={{ width: '80px', maxWidth: '80px' }}>
                Institute
              </th>
              <th className="text-left px-3 py-2 text-base text-muted-foreground" style={{ width: '180px', maxWidth: '180px', minWidth: '120px' }}>
                Tags
              </th>
              <th className="text-center px-3 py-2 text-base text-muted-foreground whitespace-nowrap" style={{ width: '80px', maxWidth: '80px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filteredPapers.map((paper) => {
              const isHighlighted = paper.highlighted === 1;
              const isRead = readPapers.has(paper.id);
              return (
              <tr
                key={paper.id}
                className={`transition-colors cursor-pointer whitespace-nowrap ${
                  isHighlighted 
                    ? "border-b-2 border-primary/30 sticky top-0 z-[9]" 
                    : isRead
                    ? "bg-muted/10 hover:bg-muted/20"
                    : "hover:bg-muted/30"
                }`}
                style={isHighlighted ? { 
                  backgroundColor: 'rgb(45, 25, 12)', // solid dark orange-brown, opaque
                } : undefined}
                onMouseEnter={(e) => {
                  if (isHighlighted) {
                    e.currentTarget.style.backgroundColor = 'rgb(55, 30, 15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isHighlighted) {
                    e.currentTarget.style.backgroundColor = 'rgb(45, 25, 12)';
                  }
                }}
                onClick={() => handleSelectPaper(paper)}
              >
                <td className={`px-2 py-2.5 whitespace-nowrap text-base ${isRead ? 'text-gray-400' : ''}`} style={{ width: '80px', maxWidth: '80px', minWidth: '70px' }}>
                  {paper.releaseDate}
                </td>
                <td className={`px-2 py-2.5 whitespace-nowrap text-base ${isRead ? 'text-gray-400' : ''}`} style={{ width: '90px', maxWidth: '90px', minWidth: '70px' }}>
                  {paper.researchDate}
                </td>
                <td className="px-2 py-2.5 text-center text-base" style={{ width: '60px', maxWidth: '60px', minWidth: '50px' }}>
                  {isHighlighted ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 flex items-center justify-center bg-primary/10 rounded">
                        <span className="text-xs font-bold text-primary">PMT</span>
                      </div>
                    </div>
                  ) : (
                    getTypeIcon(paper.type, paper.category)
                  )}
                </td>
                <td className="px-3 py-2.5 text-base whitespace-nowrap" style={{ minWidth: '300px', width: '45%' }} colSpan={isHighlighted ? 3 : undefined}>
                  {isHighlighted ? (
                    <div className="flex items-start gap-2.5">
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <p className="text-base leading-snug text-foreground/90 truncate whitespace-nowrap">
                          {paper.title}
                          {paper.tags.length > 0 && (
                            <span className="text-muted-foreground"> {paper.tags.slice(0, 10).join(' / ')}{paper.tags.length > 10 ? ' / ...' : ''}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className={`truncate whitespace-nowrap ${isRead ? 'text-gray-400' : ''}`} style={{ maxWidth: '100%' }}>
                      {paper.title}
                    </div>
                  )}
                </td>
                {!isHighlighted && (
                  <>
                    <td className={`px-3 py-2.5 text-center ${isRead ? 'opacity-60' : ''}`} style={{ width: '80px', maxWidth: '80px' }}>
                      <img
                        src={getInstituteLogo(paper.institute)}
                        alt={paper.institute}
                        className="h-4 inline-block rounded"
                      />
                    </td>
                    <td 
                      className="px-3 py-2.5 relative text-base"
                      style={{ width: '180px', maxWidth: '180px', minWidth: '120px', overflow: 'hidden' }}
                      onMouseEnter={() => setHoveredTagRow(paper.id)}
                      onMouseLeave={() => setHoveredTagRow(null)}
                    >
                      <div className="flex flex-nowrap gap-1" style={{ width: '100%', overflow: 'hidden' }}>
                        {/* Show 3-4 complete tags that fit, then count of remaining */}
                        {(() => {
                          // Show up to 3 tags (user requested 3-4), but ensure they fit completely
                          const maxVisibleTags = Math.min(3, paper.tags.length);
                          const visibleTags = paper.tags.slice(0, maxVisibleTags);
                          const remainingCount = paper.tags.length - maxVisibleTags;
                          const hasMoreTags = remainingCount > 0;
                          
                          return (
                            <>
                              {visibleTags.map((tag, index) => (
                      <span
                        key={index}
                                  className={`px-2 py-0.5 bg-muted text-muted-foreground rounded text-sm whitespace-nowrap flex-shrink-0 ${isRead ? 'text-gray-400' : ''}`}
                      >
                        {tag}
                      </span>
                    ))}
                              {hasMoreTags && (
                                <span className={`px-2 py-0.5 bg-muted text-muted-foreground rounded text-sm cursor-pointer hover:bg-muted/80 whitespace-nowrap flex-shrink-0 ${isRead ? 'text-gray-400' : ''}`}>
                                  +{remainingCount}
                        </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      {/* Tooltip positioned relative to td - shows all tags on hover */}
                      {hoveredTagRow === paper.id && paper.tags.length > 0 && (
                        <div className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded shadow-lg p-2 min-w-[200px] max-w-[300px]" style={{ marginLeft: '12px' }}>
                            <div className="flex flex-wrap gap-1">
                              {paper.tags.map((tag, index) => (
                                <span
                                  key={index}
                                className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-sm whitespace-nowrap"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                  </td>
                  </>
                )}
                <td className="px-3 py-2.5" style={{ width: '80px', maxWidth: '80px' }}>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={(e) => toggleSave(paper.id, e)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title={savedPapers.has(paper.id) ? "Remove from saved" : "Save for later"}
                    >
                      {savedPapers.has(paper.id) ? (
                        <BookmarkCheck className="w-3.5 h-3.5 text-orange-500" />
                      ) : (
                        <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 lg:px-4 py-2 bg-widget-header border-t border-border text-sm lg:text-base text-muted-foreground">
        {loading ? (
          <span>Loading research papers...</span>
        ) : error ? (
          <span className="text-destructive">Error: {error}</span>
        ) : (
          <span>Showing {filteredPapers.length} of {papers.length} research papers</span>
        )}
      </div>
    </div>
  );
}

export default ResearchFiles;

