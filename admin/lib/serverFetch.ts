import { cookies } from "next/headers";

const BACKEND_URL = process.env.API_URL || "http://api:5000";

// Server-side GET requests - direct to backend (no proxy)
export async function serverFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  // Get token from cookies for server-side requests
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  const headers = new Headers(options?.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const baseUrl = BACKEND_URL.replace(/\/$/, "");
  const fullPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}${fullPath}`;

  const response = await fetch(url, {
    ...options,
    headers,
    cache: "no-store", // Default: no cache, can be overridden with options
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}
