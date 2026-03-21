import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't need auth
const PUBLIC_ROUTES = ["/login", "/api/auth"];

// Route → required role(s)
const ROUTE_ROLES: { prefix: string; roles: string[] }[] = [
  { prefix: "/superadmin", roles: ["superadmin"] },
  { prefix: "/principal",  roles: ["principal", "deputy"] },
  { prefix: "/deputy",     roles: ["deputy"] },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and static files
  if (
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Get session cookie (Firebase sets __session)
  const sessionCookie = request.cookies.get("__session")?.value;

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token server-side via API route
  try {
    const verifyRes = await fetch(
      new URL("/api/auth/verify", request.url).toString(),
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token: sessionCookie }),
      }
    );

    if (!verifyRes.ok) {
      throw new Error("Token verification failed");
    }

    const { role } = await verifyRes.json();

    // Check route-level role restrictions
    for (const route of ROUTE_ROLES) {
      if (pathname.startsWith(route.prefix)) {
        if (!route.roles.includes(role)) {
          // Redirect to appropriate dashboard
          return NextResponse.redirect(new URL(getDashboard(role), request.url));
        }
      }
    }

    // Root redirect → role dashboard
    if (pathname === "/") {
      return NextResponse.redirect(new URL(getDashboard(role), request.url));
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("__session");
    return response;
  }
}

function getDashboard(role: string): string {
  switch (role) {
    case "superadmin": return "/superadmin";
    case "principal":  return "/principal";
    case "deputy":     return "/deputy";
    default:           return "/login";
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
