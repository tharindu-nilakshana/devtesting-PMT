import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_CONFIG } from "@/lib/api";

const ENDPOINT = "getLatestStories";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      limit = 50,
      offset = 0,
      category,
      article_sentiment,
      published,
    } = body ?? {};

    const cookieStore = await cookies();
    const token = cookieStore.get("pmt_auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const payload: Record<string, any> = {
      limit,
      offset,
    };

    if (category) {
      payload.category = category;
    }

    if (article_sentiment) {
      payload.article_sentiment = article_sentiment;
    }

    if (typeof published === "number") {
      payload.published = published;
    }

    const response = await fetch(`${API_CONFIG.UPSTREAM_API}${ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Latest Stories upstream error", response.status, errorText);
      return NextResponse.json(
        { success: false, error: "Failed to fetch latest stories" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Latest Stories API route error", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}


