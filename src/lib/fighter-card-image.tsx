import type { Fighter } from "@/data/types";

const WIDTH = 600;
const HEIGHT = 300;

const ACCENT = "#dc2626";
const BG = "#0f0f0f";
const CARD_BG = "#1a1a1a";
const FG = "#ffffff";
const MUTED = "#a1a1a1";

export function FighterStatCard({ fighter }: { fighter: Fighter }) {
  const kos = Math.round((fighter.kos / Math.max(fighter.wins, 1)) * 100);

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: BG,
        color: FG,
        fontFamily: "Inter",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Accent bar */}
      <div style={{ height: 4, backgroundColor: ACCENT }} />

      <div
        style={{
          flex: 1,
          display: "flex",
          padding: "24px 28px",
          gap: 28,
        }}
      >
        {/* Left: avatar placeholder */}
        <div
          style={{
            width: 140,
            height: 180,
            backgroundColor: CARD_BG,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: "1px solid #2a2a2a",
          }}
        >
          <span style={{ fontSize: 48, fontWeight: 700, color: MUTED }}>
            {fighter.displayName
              .split(/\s+/)
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
        </div>

        {/* Right: info */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
          {/* Name + username */}
          <div>
            <div
              style={{ fontSize: 28, fontWeight: 800, letterSpacing: "0.02em", lineHeight: 1.1 }}
            >
              {fighter.displayName}
            </div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>@{fighter.username}</div>
          </div>

          {/* Division badge */}
          <div
            style={{
              display: "inline-flex",
              backgroundColor: ACCENT,
              padding: "2px 10px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              alignSelf: "flex-start",
            }}
          >
            {fighter.division}
          </div>

          {/* Rank / Champion */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: fighter.rank === 0 ? ACCENT : MUTED,
            }}
          >
            {fighter.rank === 0 ? "★ Champion" : `Ranked #${fighter.rank}`}
          </div>

          {/* Stats grid */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 4,
            }}
          >
            {[
              { label: "Wins", value: fighter.wins },
              { label: "Losses", value: fighter.losses },
              { label: "Draws", value: fighter.draws },
              { label: "KO %", value: `${kos}%` },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  backgroundColor: CARD_BG,
                  border: "1px solid #2a2a2a",
                  borderRadius: 6,
                  padding: "8px 14px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  minWidth: 60,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: MUTED,
                  }}
                >
                  {s.label}
                </span>
                <span style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Belts */}
          {fighter.beltsHeld && (
            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
              {fighter.beltsHeld.split(",").map((b) => (
                <div
                  key={b}
                  style={{
                    backgroundColor: ACCENT,
                    padding: "1px 8px",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    borderRadius: 3,
                  }}
                >
                  {b}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
