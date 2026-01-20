export interface NewsDashboardApiArticle {
  id: number;
  datetime: string;
  datetimeLocal?: string;
  headline: string | null;
  story: string | null;
  source: string | null;
  category: string | null;
  article_sentiment?: string | null;
  ImageName?: string | null;
  img_id?: number | null;
  Highlighted?: number;
  key_takeaways?: Array<{ ID: number; takeaway: string }>;
}

export interface NewsDetailsApiArticle extends NewsDashboardApiArticle {
  storyId?: number | null;
  symbols?: string | null;
  clicks?: number;
  financial_instruments?: Array<{ name: string; sentiment: string }>;
  tags?: string;
  Currencies?: string;
  Countries?: Array<{ name: string; sentiment: string }>;
  Stock_Tickers?: string;
  Companies?: Array<{ name: string; sentiment: string }>;
  Asset_Classes?: string;
  Published?: number;
}

export interface FetchNewsDashboardParams {
  limit?: number;
  offset?: number;
  category?: string;
  articleSentiment?: string;
  published?: number;
}

export interface NewsDashboardResponse {
  success: boolean;
  data?: {
    status?: string;
    data?: NewsDashboardApiArticle[];
    count?: number;
    total?: number;
  };
  error?: string;
  timestamp?: number;
}

const DEFAULT_TIMEOUT = 20000;

const FALLBACK_IMAGES: Record<string, string> = {
  Stocks: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
  Commodities: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=1200&q=80",
  Forex: "https://images.unsplash.com/photo-1464817739973-0128fe77aaa1?auto=format&fit=crop&w=1200&q=80",
  Politics: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
  Housing: "https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1200&q=80",
  Energy: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=80",
  Technology: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&w=1200&q=80",
  Corporate: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
  Economy: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
  Government: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
  "Natural Disasters": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  Industry: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80",
  Inspirational: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
  Law: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
  Military: "https://images.unsplash.com/photo-1536010305525-dc48d2e4f057?auto=format&fit=crop&w=1200&q=80",
  Society: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
  Transportation: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80",
  Conflict: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
  International: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
  Crypto: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=1200&q=80",
  Sport: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80",
};

function getFallbackImage(category?: string | null) {
  if (category && FALLBACK_IMAGES[category]) {
    return FALLBACK_IMAGES[category];
  }
  return "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80";
}

// Helper function to remove [Content omitted] from any text
function removeContentOmitted(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\[Content omitted\]/gi, "").trim();
}

function extractSummary(story?: string | null) {
  if (!story) return "";
  const cleaned = removeContentOmitted(story);
  const paragraphs = cleaned.split("\n").map((p) => p.trim()).filter(Boolean);
  return paragraphs[0] || cleaned.slice(0, 200);
}

export interface TransformedNewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  timestamp: string;
  category: string;
  imageUrl: string;
  isFeatured?: boolean;
  content?: string;
  sentiment?: string;
  takeaways?: string[];
}

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `news-${Math.random().toString(36).slice(2, 11)}`;
};

function transformArticles(apiArticles: NewsDashboardApiArticle[]): TransformedNewsArticle[] {
  return apiArticles.map((article) => {
    const timestamp = article.datetimeLocal || article.datetime || new Date().toISOString();
    return {
      id: article.id ? String(article.id) : generateId(),
      title: article.headline || "Untitled Story",
      description: extractSummary(article.story),
      source: article.source || "Prime Market Terminal",
      timestamp,
      category: article.category || "General",
      imageUrl: getFallbackImage(article.category),
      isFeatured: article.Highlighted === 1,
      content: removeContentOmitted(article.story),
      sentiment: article.article_sentiment || undefined,
      takeaways: article.key_takeaways?.map((item) => item.takeaway).filter(Boolean),
    };
  });
}

export async function fetchNewsDashboard(
  params: FetchNewsDashboardParams,
  signal?: AbortSignal
): Promise<{
  success: boolean;
  data?: TransformedNewsArticle[];
  error?: string;
}> {
  const controller = !signal ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), DEFAULT_TIMEOUT) : undefined;

  try {
    const response = await fetch("/api/news/dashboard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
        category: params.category,
        article_sentiment: params.articleSentiment,
        published: params.published,
      }),
      signal: signal ?? controller?.signal,
    });

    if (!response.ok) {
      return {
        success: false,
        error: response.status === 401
          ? "Authentication required to view news dashboard."
          : `Failed to fetch news (${response.status})`,
      };
    }

    const result: NewsDashboardResponse = await response.json();

    if (!result.success || !result.data?.data) {
      return {
        success: false,
        error: result.error ?? "Failed to fetch news dashboard data",
      };
    }

    const transformed = transformArticles(result.data.data);

    return {
      success: true,
      data: transformed,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: "Request timed out. Please try again.",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export interface NewsDetailsResponse {
  success: boolean;
  data?: {
    status?: string;
    data?: NewsDetailsApiArticle;
  };
  error?: string;
  timestamp?: number;
}

export interface NewsDetailsItem {
  id: string;
  headline: string;
  description: string;
  source: string;
  timestamp: string;
  category: string;
  imageUrl: string;
  content: string;
  sentiment?: string;
  keyTakeaways?: string[];
  fullArticle?: string[];
  detailImage?: string;
  keywords?: string[];
  countries?: string[];
  currencies?: string[];
  stockTickers?: string[];
  companies?: string[];
  assetClasses?: string[];
}

function transformNewsDetails(apiArticle: NewsDetailsApiArticle): NewsDetailsItem {
  const timestamp = apiArticle.datetimeLocal || apiArticle.datetime || new Date().toISOString();
  
  // Split story into paragraphs and remove [Content omitted]
  const cleanedStory = removeContentOmitted(apiArticle.story);
  const fullArticle = cleanedStory
    ? cleanedStory
        .split("\n")
        .map((p) => p.trim())
        .filter((p) => p && !p.match(/^\[Content omitted\]$/i)) // Also filter out standalone [Content omitted] lines
    : [];

  // Extract keywords from tags (comma-separated)
  const keywords = apiArticle.tags
    ? apiArticle.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
    : [];

  // Extract countries
  const countries = apiArticle.Countries
    ? apiArticle.Countries.map((c) => c.name).filter(Boolean)
    : [];

  // Extract currencies (comma-separated or empty)
  const currencies = apiArticle.Currencies
    ? apiArticle.Currencies.split(",").map((c) => c.trim()).filter(Boolean)
    : [];

  // Extract stock tickers (comma-separated or empty)
  const stockTickers = apiArticle.Stock_Tickers
    ? apiArticle.Stock_Tickers.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  // Extract companies
  const companies = apiArticle.Companies
    ? apiArticle.Companies.map((c) => c.name).filter(Boolean)
    : [];

  // Extract asset classes (comma-separated or empty)
  const assetClasses = apiArticle.Asset_Classes
    ? apiArticle.Asset_Classes.split(",").map((a) => a.trim()).filter(Boolean)
    : [];

  // Extract key takeaways
  const keyTakeaways = apiArticle.key_takeaways
    ? apiArticle.key_takeaways.map((item) => item.takeaway).filter(Boolean)
    : [];

  return {
    id: String(apiArticle.id),
    headline: apiArticle.headline || "Untitled Story",
    description: extractSummary(apiArticle.story),
    source: apiArticle.source || "Prime Market Terminal",
    timestamp,
    category: apiArticle.category || "General",
    imageUrl: getFallbackImage(apiArticle.category),
    content: removeContentOmitted(apiArticle.story),
    sentiment: apiArticle.article_sentiment || undefined,
    keyTakeaways,
    fullArticle,
    detailImage: apiArticle.ImageName || getFallbackImage(apiArticle.category),
    keywords,
    countries,
    currencies,
    stockTickers,
    companies,
    assetClasses,
  };
}

export async function fetchNewsById(
  id: string | number,
  signal?: AbortSignal
): Promise<{
  success: boolean;
  data?: NewsDetailsItem;
  error?: string;
}> {
  const controller = !signal ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), DEFAULT_TIMEOUT) : undefined;

  try {
    const numericId = typeof id === "string" ? parseInt(id, 10) : id;
    
    if (isNaN(numericId)) {
      return {
        success: false,
        error: "Invalid news ID",
      };
    }

    const response = await fetch("/api/news/by-id", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: numericId }),
      signal: signal ?? controller?.signal,
    });

    if (!response.ok) {
      return {
        success: false,
        error: response.status === 401
          ? "Authentication required to view news details."
          : `Failed to fetch news details (${response.status})`,
      };
    }

    const result: NewsDetailsResponse = await response.json();

    if (!result.success || !result.data?.data) {
      return {
        success: false,
        error: result.error ?? "Failed to fetch news details",
      };
    }

    const transformed = transformNewsDetails(result.data.data);

    return {
      success: true,
      data: transformed,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: "Request timed out. Please try again.",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

