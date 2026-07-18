import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/supabase";

import { getSupabasePublicEnv } from "./env";

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach(({ name, value }) => {
    target.cookies.set(name, value);
  });
  target.headers.set("Cache-Control", "private, no-store, max-age=0");
  return target;
}

function safeAdminNextPath(value: string) {
  return value.startsWith("/admin") && !value.startsWith("//")
    ? value
    : "/admin";
}

export async function updateAdminSession(request: NextRequest) {
  let response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store, max-age=0");

  const { publishableKey, url } = getSupabasePublicEnv();
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next();
        response.headers.set("Cache-Control", "private, no-store, max-age=0");
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const subject = !error && typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  const isLogin = request.nextUrl.pathname === "/admin/login";

  if (!subject) {
    if (isLogin) {
      return response;
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    loginUrl.searchParams.set(
      "next",
      safeAdminNextPath(`${request.nextUrl.pathname}${request.nextUrl.search}`),
    );
    return copyCookies(response, NextResponse.redirect(loginUrl));
  }

  if (isLogin) {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = "/admin";
    adminUrl.search = "";
    return copyCookies(response, NextResponse.redirect(adminUrl));
  }

  return response;
}
