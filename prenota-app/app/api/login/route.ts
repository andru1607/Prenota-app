import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password || password !== process.env.APP_PASSWORD) {
      return NextResponse.json({ error: "Password errata" }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set("prenota_auth", process.env.APP_PASSWORD!, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });

    return res;
  } catch (err) {
    console.error("Errore login:", err);
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
}
