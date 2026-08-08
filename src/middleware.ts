import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * Batas pemakaian endpoint AI per pengguna. Tiap panggilan memakai kuota
 * Groq yang terbatas, jadi satu akun yang macet dalam loop (atau iseng)
 * bisa menghabiskan kuota seluruh redaksi. Dipasang di middleware supaya
 * SEMUA route di /api/admin/ai/* ikut terlindungi otomatis — termasuk yang
 * ditambahkan nanti — tanpa perlu diingat satu per satu.
 */
const AI_MAKS_PANGGILAN = 30;
const AI_JENDELA_MS = 60 * 1000;

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  const isLoginPage = req.nextUrl.pathname === "/admin/login";
  const isApiAdmin = req.nextUrl.pathname.startsWith("/api/admin");
  const isApiAi = req.nextUrl.pathname.startsWith("/api/admin/ai");

  // Izinkan akses ke halaman login
  if (isLoginPage) {
    // Jika sudah login, redirect ke dashboard
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  // Proteksi route /admin/* dan /api/admin/*
  if ((isAdminRoute || isApiAdmin) && !isLoggedIn) {
    if (isApiAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Sudah lolos pemeriksaan sesi di atas, jadi kuota dihitung per akun —
  // bukan per IP, supaya satu kantor redaksi yang berbagi IP tidak saling
  // menghabiskan jatah
  if (isApiAi && isLoggedIn) {
    const identitas = req.auth?.user?.email ?? req.auth?.user?.id ?? "anon";
    if (!checkRateLimit(`ai:${identitas}`, AI_MAKS_PANGGILAN, AI_JENDELA_MS)) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan AI. Tunggu sebentar lalu coba lagi." },
        { status: 429 }
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
