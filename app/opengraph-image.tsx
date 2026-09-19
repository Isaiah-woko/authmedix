import { ImageResponse } from "next/og";

export const alt = "AuthMedix — zero-trust clinical access";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          backgroundColor: "#F7F8FA",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 20,
              backgroundColor: "#2B3A67",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ color: "#0E7C7B", fontSize: 64, fontWeight: 700 }}>+</div>
          </div>
          <div style={{ fontSize: 72, fontWeight: 700, color: "#161B22" }}>AuthMedix</div>
        </div>
        <div style={{ marginTop: 32, fontSize: 34, color: "#5B6472", lineHeight: 1.4 }}>
          Zero standing access to patient records. Every view is granted, scoped to one
          patient, and time-bound.
        </div>
      </div>
    ),
    { ...size }
  );
}