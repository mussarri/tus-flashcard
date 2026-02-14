import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Get backend API URL from environment or use localhost for development
const getApiBaseUrl = (): string => {
  // Try NEXT_PUBLIC_API_URL first (accessible on client), then API_URL (server only)
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;

  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim().replace(/\/$/, "");
    // Validate it's an absolute URL
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      console.warn(`Invalid API_URL in env: ${envUrl}, using default`);
    }
  }
  
  // Default to localhost backend for development
  const defaultUrl = "http://localhost:3001";
  console.log(`Using default backend URL: ${defaultUrl}`);
  return defaultUrl;
};

const API_BASE_URL = getApiBaseUrl();
console.log(`Proxy configured to forward requests to: ${API_BASE_URL}`);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> | { path: string[] } },
) {
  const resolvedParams = await Promise.resolve(params);
  return handleProxyRequest(request, resolvedParams.path, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> | { path: string[] } },
) {
  const resolvedParams = await Promise.resolve(params);
  return handleProxyRequest(request, resolvedParams.path, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> | { path: string[] } },
) {
  const resolvedParams = await Promise.resolve(params);
  return handleProxyRequest(request, resolvedParams.path, "PUT");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> | { path: string[] } },
) {
  const resolvedParams = await Promise.resolve(params);
  return handleProxyRequest(request, resolvedParams.path, "PATCH");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> | { path: string[] } },
) {
  const resolvedParams = await Promise.resolve(params);
  return handleProxyRequest(request, resolvedParams.path, "DELETE");
}

async function handleProxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string,
) {
  try {
    // Validate API_BASE_URL is set
    if (!API_BASE_URL || API_BASE_URL.trim().length === 0) {
      throw new Error("API_BASE_URL is not configured");
    }

    // Join path segments and remove any leading/trailing slashes
    const path = pathSegments.join("/").replace(/^\/+|\/+$/g, "");

    if (!path) {
      throw new Error("Path segments are empty");
    }

    // Construct URL - ensure API_BASE_URL doesn't have trailing slash
    const baseUrl = API_BASE_URL.replace(/\/$/, "");
    const fullPath = path.startsWith("/") ? path : `/${path}`;
    const urlString = `${baseUrl}${fullPath}`;

    // Validate URL before creating
    let url: URL;
    try {
      url = new URL(urlString);
    } catch (urlError) {
      console.error("Failed to construct URL:", {
        baseUrl,
        path,
        urlString,
        apiBaseUrl: API_BASE_URL,
      });
      throw new Error(
        `Invalid URL: ${urlString}. API_BASE_URL: ${API_BASE_URL}`,
      );
    }

    // Copy query parameters
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    // Get JWT token from HttpOnly cookie (server-side)
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    // Prepare headers
    const headers: HeadersInit = {};

    // Add Authorization header if token exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Get request body for POST/PUT/PATCH
    let body: BodyInit | undefined;
    const contentType = request.headers.get("content-type");

    if (["POST", "PUT", "PATCH"].includes(method)) {
      if (contentType?.includes("multipart/form-data")) {
        // Handle file uploads - FormData
        body = await request.formData();
        // Don't set Content-Type header for FormData, browser will set it with boundary
      } else if (contentType?.includes("application/json")) {
        // Handle JSON
        headers["Content-Type"] = "application/json";
        try {
          body = await request.text();
        } catch {
          // No body
        }
      } else {
        // Try to get as text for other content types
        try {
          body = await request.text();
        } catch {
          // No body
        }
      }
    }

    // Forward request to backend

    const response = await fetch(url.toString(), {
      method,
      headers,
      body,
    });

    // Check if response is an image or other binary content
    if (
      contentType &&
      (contentType.startsWith("image/") ||
        contentType.startsWith("application/octet-stream") ||
        contentType.startsWith("application/pdf"))
    ) {
      // Return binary content directly
      const blob = await response.blob();
      return new NextResponse(blob, {
        status: response.status,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Get response data as JSON
    const data = await response.json().catch(() => ({}));

    // Return response with same status
    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 },
    );
  }
}
