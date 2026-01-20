import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_CONFIG } from "@/lib/api";

const UPSTREAM = API_CONFIG.UPSTREAM_API;

type TabKey = "all" | "analyst-files" | "real-time-news" | "event-calendar";

interface BaseNotification {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  icon: "chart" | "file" | "alert" | "info";
  isNew?: boolean;
  metadata?: Record<string, string | number | null | undefined>;
}

interface AllNotificationsResponse {
  count?: number;
  notifications?: Array<{
    id: number | string;
    title: string;
    description?: string;
    created_at?: string;
    notification_type?: string;
    is_read?: number;
    AnalysisDetails?: string;
    institute?: string;
    source_id?: number;
    time_diff_seconds?: number;
  }>;
}

interface NewsApiResponse {
  Status?: string;
  NewsData?: Array<{
    id?: number;
    Title?: string;
    Content?: string;
    newsdate?: string;
    Important?: string;
    Source?: string;
  }>;
}

interface CalendarApiResponse {
  events?: Array<{
    event_id?: number;
    event_title?: string;
    event_country?: string;
    event_impact?: number;
    actual?: string | number | null;
    Actual?: string | number | null;
    event_actual?: string | number | null;
    forecast?: string | number | null;
    Forecast?: string | number | null;
    event_forecast?: string | number | null;
    previous?: string | number | null;
    Previous?: string | number | null;
    event_previous?: string | number | null;
    updated_on?: string;
    [key: string]: unknown;
  }>;
}

const ALL_NOTIFICATION_TYPES = [
  "smart_bias",
  "s3_file",
  "posts",
  "analyst_report",
  "admin",
  "risk_sentiment",
];

const ANALYST_NOTIFICATION_TYPES = ["s3_file", "analyst_report", "analyst_files"];

const NEWS_SECTION_NAMES =
  "DAX,CAC,SMI,US Equities,Asian Equities,FTSE 100,European Equities,Global Equities,UK Equities,EUROSTOXX,US Equity Plus,US Data,Swiss Data,EU Data,Canadian Data,Other Data,UK Data,Other Central Banks,BoC,RBNZ,RBA,SNB,BoJ,BoE,ECB,PBoC,Fed,Bank Research,Fixed Income,Geopolitical,Rating Agency comments,Global News,Market Analysis,FX Flows,Asian News,Economic Commentary,Brexit,Energy & Power,Metals,Ags & Softs,Crypto,Emerging Markets,US Election,Trade,Newsquawk Update";

const notificationTypeIconMap: Record<string, BaseNotification["icon"]> = {
  analyst_report: "chart",
  analyst_files: "file",
  s3_file: "file",
  smart_bias: "chart",
  posts: "info",
  admin: "info",
  risk_sentiment: "alert",
  news_ticker: "alert",
  economic_event: "alert",
};

function stripHtml(value?: string): string {
  if (!value) return "";
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function ensureStringId(id: number | string | undefined): string {
  if (typeof id === "number") return id.toString();
  if (typeof id === "string" && id.length > 0) return id;
  return randomUUID();
}

function toDisplayString(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return value.toString();
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "—";
}

function pickFieldValue(item: Record<string, unknown>, candidates: string[]): string | number | null | undefined {
  for (const candidate of candidates) {
    const value = item?.[candidate];
    if (value !== undefined && value !== null && value !== "") {
      return value as string | number | null | undefined;
    }
  }

  const entries = Object.keys(item ?? {});
  for (const candidate of candidates) {
    const lowerCandidate = candidate.toLowerCase();
    const matchKey = entries.find((entry) => entry.toLowerCase() === lowerCandidate);
    if (matchKey) {
      const value = item?.[matchKey];
      if (value !== undefined && value !== null && value !== "") {
        return value as string | number | null | undefined;
      }
    }
  }

  return undefined;
}

function transformAllNotifications(response: AllNotificationsResponse): BaseNotification[] {
  const items = Array.isArray(response.notifications) ? response.notifications : [];

  return items
    .map((item) => {
      const id = ensureStringId(item.id);
      
      // Format S3 file notifications as "New Research File from {BankName}"
      let title = item.title || "Untitled";
      if (item.notification_type === "s3_file" && item.institute) {
        const bankName = typeof item.institute === "string" ? item.institute : String(item.institute);
        title = `New Research File from ${bankName}`;
      }
      
      const description =
        stripHtml(item.description) ||
        stripHtml(item.AnalysisDetails) ||
        "No description provided.";
      const createdAt = item.created_at || new Date().toISOString();
      const icon = notificationTypeIconMap[item.notification_type ?? ""] ?? "info";
      const isNew = item.is_read === 0 || item.is_read === undefined;

      return {
        id,
        title,
        description,
        createdAt,
        icon,
        isNew,
        metadata: {
          notification_type: item.notification_type,
          institute: item.institute,
          source_id: item.source_id,
          time_diff_seconds: item.time_diff_seconds,
        },
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function transformNews(response: NewsApiResponse): BaseNotification[] {
  const items = Array.isArray(response.NewsData) ? response.NewsData : [];

  return items
    .map((item) => {
      const id = ensureStringId(item.id);
      const title = item.Title || "News Update";
      const description = stripHtml(item.Content) || "No description provided.";
      const createdAt = item.newsdate || new Date().toISOString();
      const importance = item.Important?.toLowerCase?.() ?? "";
      const icon: BaseNotification["icon"] =
        importance === "important" || importance === "highlighted" ? "alert" : "info";

      return {
        id,
        title,
        description,
        createdAt,
        icon,
        metadata: {
          importance: item.Important,
          source: item.Source,
        },
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function transformCalendar(response: CalendarApiResponse): BaseNotification[] {
  const items = Array.isArray(response.events) ? response.events : [];

  return items
    .map((item) => {
      const actualValue = pickFieldValue(item, [
        "event_actual",
        "actual",
        "Actual",
        "actual_value",
        "ActualValue",
        "actualValue",
      ]);
      const forecastValue = pickFieldValue(item, [
        "event_forecast",
        "forecast",
        "Forecast",
        "forecast_value",
        "ForecastValue",
        "forecastValue",
      ]);
      const previousValue = pickFieldValue(item, [
        "event_previous",
        "previous",
        "Previous",
        "previous_value",
        "PreviousValue",
        "previousValue",
      ]);

      const id = ensureStringId(item.event_id);
      const title = item.event_title || "Economic Event";
      const country = item.event_country || "Global";
      const impact = typeof item.event_impact === "number" ? item.event_impact : null;
      const description = "";
      const createdAt = item.updated_on || new Date().toISOString();

      return {
        id,
        title,
        description,
        createdAt,
        icon: "alert" as const,
        metadata: {
          country,
          impact,
          actual: actualValue,
          forecast: forecastValue,
          previous: previousValue,
        },
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function fetchFromUpstream(endpoint: string, body: unknown, token: string) {
  const url = new URL(endpoint, UPSTREAM).toString();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upstream API returned ${response.status}: ${errorText}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const tab = (body?.tab ?? "all") as TabKey;

    if (!["all", "analyst-files", "real-time-news", "event-calendar"].includes(tab)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid tab specified.",
          data: null,
        },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const authToken = cookieStore.get("pmt_auth_token")?.value;

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required", data: null },
        { status: 401 },
      );
    }

    let notifications: BaseNotification[] = [];

    switch (tab) {
      case "all": {
        const response = (await fetchFromUpstream(
          "getAllNotifications",
          { types: ALL_NOTIFICATION_TYPES },
          authToken,
        )) as AllNotificationsResponse;
        notifications = transformAllNotifications(response);
        break;
      }
      case "analyst-files": {
        const response = (await fetchFromUpstream(
          "getAllNotifications",
          { types: ANALYST_NOTIFICATION_TYPES },
          authToken,
        )) as AllNotificationsResponse;
      notifications = transformAllNotifications(response).filter(
        (item) => item.metadata?.notification_type !== "s3_file",
      );
        break;
      }
      case "real-time-news": {
        const response = (await fetchFromUpstream(
          "getRealtimeNewsTicker",
          {
            GetRealtimeNewsTickerNew: 0,
            SectionNames: NEWS_SECTION_NAMES,
            NewsPriority: "Important,Rumour,Highlighted,Normal",
            Page: body?.page ?? 1,
            PageSize: 50,
            IsNotificationContext: "true",
          },
          authToken,
        )) as NewsApiResponse;
        notifications = transformNews(response);
        break;
      }
      case "event-calendar": {
        const response = (await fetchFromUpstream(
          "getEconomicEventsNotifications",
          {},
          authToken,
        )) as CalendarApiResponse;
        notifications = transformCalendar(response);
        break;
      }
      default:
        notifications = [];
    }

    return NextResponse.json({
      success: true,
      data: { notifications },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[Notifications API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        data: null,
      },
      { status: 500 },
    );
  }
}


