import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Lythean Sem — Full-Stack Engineer in Phnom Penh";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 84,
          background: "linear-gradient(180deg, #0d1526 0%, #070c14 100%)",
          position: "relative",
        }}
      >
        {/* moon */}
        <div
          style={{
            position: "absolute",
            top: 84,
            right: 120,
            width: 120,
            height: 120,
            borderRadius: 9999,
            background: "#d3ddf0",
            boxShadow: "0 0 110px 50px rgba(90, 110, 165, 0.4)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
          {/* leaf seal */}
          <svg width="88" height="88" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="12" fill="#c44a20" />
            <path
              d="M 32 12 Q 47 28 35 52 Q 32 44 29 52 Q 17 28 32 12 Z"
              fill="#ece4d4"
              transform="rotate(24 32 32)"
            />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 68, color: "#ece4d4", fontWeight: 700 }}>
              Lythean Sem
            </div>
            <div style={{ fontSize: 26, color: "#8fa2b8", letterSpacing: 8 }}>
              FULL-STACK ENGINEER — PHNOM PENH
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
