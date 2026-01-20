export interface LatestStoriesApiStory {
  id?: number | string;
  datetime?: string;
  datetimeUTC?: string;
  timeAgo?: string;
  headline?: string | null;
  story?: string | null;
  category?: string | null;
  article_sentiment?: string | null;
  Published?: number;
}

export interface LatestStoriesApiResponse {
  status?: string;
  data?: LatestStoriesApiStory[];
  count?: number;
  error?: string;
}

export interface FetchLatestStoriesParams {
  limit?: number;
  offset?: number;
  category?: string;
  articleSentiment?: "Positive" | "Negative" | "Neutral";
  published?: number;
}

export interface LatestStoryItem {
  id: string;
  headline: string;
  timestamp: string;
  datetime?: string;
  category?: string;
  sentiment?: string;
  body?: string;
}

const DEFAULT_TIMEOUT = 20000;

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `story-${Math.random().toString(36).slice(2, 11)}`;
};

const formatTimestamp = (story: LatestStoriesApiStory) => {
  if (story.timeAgo) {
    return story.timeAgo;
  }

  const isoString = story.datetime || story.datetimeUTC;
  if (!isoString) {
    return "Moments ago";
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "Moments ago";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const transformStories = (apiStories: LatestStoriesApiStory[]): LatestStoryItem[] =>
  apiStories.map((story) => ({
    id: story.id ? String(story.id) : generateId(),
    headline: story.headline?.trim() || "Untitled Story",
    timestamp: formatTimestamp(story),
    datetime: story.datetime || story.datetimeUTC,
    category: story.category || "General",
    sentiment: story.article_sentiment || undefined,
    body: story.story || "",
  }));

export async function fetchLatestStories(
  params: FetchLatestStoriesParams,
  signal?: AbortSignal
): Promise<{
  success: boolean;
  data?: LatestStoryItem[];
  count?: number;
  error?: string;
}> {
  const controller = new AbortController();
  let timedOut = false;

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, DEFAULT_TIMEOUT);

  try {
    const response = await fetch("/api/news/latest-stories", {
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
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        success: false,
        error:
          response.status === 401
            ? "Authentication required to view latest stories."
            : `Failed to fetch latest stories (${response.status})`,
      };
    }

    const result: { success?: boolean; data?: LatestStoriesApiResponse; error?: string } = await response.json();
    const apiData = result.data;

    if (!apiData || !Array.isArray(apiData.data)) {
      return {
        success: false,
        error: result.error ?? "Invalid latest stories response",
      };
    }

    return {
      success: true,
      data: transformStories(apiData.data),
      count: apiData.count ?? apiData.data.length,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: timedOut ? "Request timed out. Please try again." : "Request was cancelled.",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}


