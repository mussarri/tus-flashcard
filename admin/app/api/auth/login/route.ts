import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const getApiBaseUrl = (): string => {
  const envUrl = process.env.BACKEND_URL || process.env.API_URL;

  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim().replace(/\/$/, "");
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      console.warn(`Invalid API_URL in env: ${envUrl}, using default`);
    }
  }

  // Default: local API in development, Docker service in other environments
  const defaultUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "http://api:5000";

  return defaultUrl;
};

const API_BASE_URL = getApiBaseUrl();

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Construct URL - ensure API_BASE_URL doesn't have trailing slash
    const baseUrl = API_BASE_URL.replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/auth/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || "Invalid credentials" },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Set cookie server-side securely
    const cookieStore = await cookies();
    cookieStore.set("auth_token", data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
