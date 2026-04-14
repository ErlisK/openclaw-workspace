import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DocsCI – Docs-Specific CI for API & SDK Teams";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0f172a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          <span style={{ fontSize: 80 }}>⚡</span>
          <span
            style={{
              fontSize: 96,
              fontWeight: 900,
              color: "white",
              letterSpacing: "-2px",
            }}
          >
            DocsCI
          </span>
        </div>
        <div
          style={{
            fontSize: 40,
            color: "#6366f1",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          Docs-Specific CI for API & SDK Teams
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 24,
            color: "#64748b",
          }}
        >
          snippetci.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
