import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0C447C 0%, #092f56 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 84, fontWeight: 900, letterSpacing: -2 }}>
          <span style={{ color: "#F0A400" }}>LinkPro</span>
          <span style={{ color: "#ffffff" }}>Media</span>
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 32, color: "#cdddef", fontWeight: 500 }}>
          Berita Terkini &amp; Terpercaya
        </div>
      </div>
    ),
    { ...size }
  );
}
