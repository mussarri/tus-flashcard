import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const isLoginPage = request.nextUrl.pathname === "/login";

  // Allow API routes to be accessed, backend handles auth
  if (request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // If trying to access login page while authenticated, redirect to home
  if (isLoginPage && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If not authenticated and trying to access protected route, redirect to login
  if (!token && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (like images in public folder)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
