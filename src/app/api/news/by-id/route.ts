import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_CONFIG } from "@/lib/api";

const ENDPOINT = "getNewsById";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id } = body ?? {};

    if (!id) {
      return NextResponse.json(
        { success: false, error: "News ID is required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("pmt_auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_CONFIG.UPSTREAM_API}${ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("News By ID upstream error", response.status, errorText);
      return NextResponse.json(
        { success: false, error: "Failed to fetch news details" },
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
    console.error("News By ID API route error", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

