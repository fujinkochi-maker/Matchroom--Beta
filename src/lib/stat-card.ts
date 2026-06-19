import type { Fighter } from "@/data/types";

const BG = "#0f0f0f";
const CARD_BG = "#1a1a1a";
const BORDER = "#2c2c2c";
const FG = "#fafafa";
const MUTED = "#a1a1a1";
const ACCENT = "#dc2626";
const SURFACE = "#141414";
const GOLD = "#d4a017";
const GOLD_LIGHT = "#f0d060";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getChampionTitle(beltsHeld: string): string {
  const count = beltsHeld ? beltsHeld.split(",").filter(Boolean).length : 0;
  if (count === 0) return "Champion";
  if (count === 4) return "Undisputed";
  if (count >= 2) return "Unified Champion";
  return "World Champion";
}

export function renderStatCard(fighter: Fighter): string {
  const wins = fighter.wins;
  const losses = fighter.losses;
  const draws = fighter.draws;
  const kos = fighter.kos;
  const total = wins + losses + draws;
  const koPct = wins > 0 ? Math.round((kos / wins) * 100) : 0;
  const winPct = total > 0 ? Math.round((wins / total) * 100) : 0;

  const isChamp = fighter.rank === 0;
  const championTitle = isChamp && fighter.beltsHeld ? getChampionTitle(fighter.beltsHeld) : "";

  const beltList = fighter.beltsHeld ? fighter.beltsHeld.split(",").filter(Boolean) : [];
  const initials = fighter.displayName
    .split(/\s+/)
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const streakLabel = fighter.streak
    ? fighter.streak.endsWith("W")
      ? "Wins"
      : fighter.streak.endsWith("L")
        ? "Losses"
        : "Draws"
    : null;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">

  <defs>
    <linearGradient id="topBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${ACCENT}"/>
      <stop offset="100%" stop-color="#991b1b"/>
    </linearGradient>
    <linearGradient id="goldBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${GOLD}"/>
      <stop offset="50%" stop-color="${GOLD_LIGHT}"/>
      <stop offset="100%" stop-color="${GOLD}"/>
    </linearGradient>
  </defs>

  <rect width="800" height="500" fill="${BG}"/>

  <rect width="800" height="5" fill="url(#topBar)"/>

  <rect x="24" y="24" width="130" height="130" rx="65" fill="${CARD_BG}" stroke="${BORDER}" stroke-width="1"/>
  ${
    fighter.image
      ? `<pattern id="avatarFill" patternUnits="userSpaceOnUse" width="128" height="128">
      <image href="${escapeXml(fighter.image)}" width="128" height="128" preserveAspectRatio="xMidYMid slice"/>
    </pattern>
    <circle cx="89" cy="89" r="63" fill="url(#avatarFill)" stroke="${BORDER}" stroke-width="1.5"/>`
      : `<text x="89" y="105" font-family="Inter,sans-serif" font-size="44" font-weight="700" fill="${MUTED}" text-anchor="middle">${escapeXml(initials)}</text>`
  }

  <text x="174" y="50" font-family="Inter,sans-serif" font-size="28" font-weight="700" fill="${FG}">${escapeXml(fighter.displayName)}</text>
  ${fighter.nickname ? `<text x="174" y="72" font-family="Inter,sans-serif" font-size="14" font-style="italic" fill="${MUTED}">"${escapeXml(fighter.nickname)}"</text>` : ""}

  <text x="174" y="${fighter.nickname ? 90 : 74}" font-family="Inter,sans-serif" font-size="11" fill="${MUTED}">@${escapeXml(fighter.username)}</text>

  <rect x="174" y="${fighter.nickname ? 104 : 88}" width="110" height="22" rx="3" fill="${ACCENT}"/>
  <text x="229" y="${(fighter.nickname ? 104 : 88) + 15}" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="${FG}" text-anchor="middle">${escapeXml(fighter.division || "UNASSIGNED")}</text>

  <rect x="292" y="${fighter.nickname ? 104 : 88}" width="70" height="22" rx="3" fill="${isChamp ? ACCENT : SURFACE}" stroke="${isChamp ? "none" : BORDER}" stroke-width="1"/>
  <text x="327" y="${(fighter.nickname ? 104 : 88) + 15}" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="${FG}" text-anchor="middle">${isChamp ? escapeXml(championTitle.toUpperCase()) : `#${fighter.rank}`}</text>

  ${
    beltList.length > 0
      ? beltList
          .map(
            (b, i) => `
    <rect x="${174 + i * 58}" y="${(fighter.nickname ? 104 : 88) + 30}" width="54" height="20" rx="3" fill="url(#goldBar)" stroke="#b8860b" stroke-width="0.5"/>
    <text x="${201 + i * 58}" y="${(fighter.nickname ? 104 : 88) + 44}" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="#2c1810" text-anchor="middle">${escapeXml(b)}</text>
  `,
          )
          .join("")
      : ""
  }

  ${
    fighter.bio
      ? `
    <text x="174" y="${(fighter.nickname ? 104 : 88) + 56 + (beltList.length > 0 ? 24 : 0)}" font-family="Inter,sans-serif" font-size="10" fill="${MUTED}">"${escapeXml(fighter.bio.length > 70 ? fighter.bio.slice(0, 67) + "..." : fighter.bio)}"</text>
  `
      : ""
  }

  <rect x="24" y="172" width="752" height="1" fill="${BORDER}" opacity="0.5"/>

  <text x="400" y="198" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="${MUTED}" text-anchor="middle">PROFESSIONAL RECORD</text>

  <text x="160" y="248" font-family="Inter,sans-serif" font-size="48" font-weight="700" fill="#38a169" text-anchor="middle">${wins}</text>
  <text x="400" y="248" font-family="Inter,sans-serif" font-size="48" font-weight="700" fill="#e53e3e" text-anchor="middle">${losses}</text>
  <text x="640" y="248" font-family="Inter,sans-serif" font-size="48" font-weight="700" fill="${MUTED}" text-anchor="middle">${draws}</text>

  <text x="160" y="262" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="${MUTED}" text-anchor="middle">WINS</text>
  <text x="400" y="262" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="${MUTED}" text-anchor="middle">LOSSES</text>
  <text x="640" y="262" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="${MUTED}" text-anchor="middle">DRAWS</text>

  ${
    total > 0
      ? `
    <line x1="100" y1="276" x2="700" y2="276" stroke="${BORDER}" stroke-width="1" opacity="0.3"/>
    <rect x="100" y="278" width="${(wins / total) * 600}" height="3" rx="1.5" fill="#38a169"/>
    <rect x="${100 + (wins / total) * 600}" y="278" width="${(losses / total) * 600}" height="3" rx="1.5" fill="#e53e3e"/>
  `
      : ""
  }

  <rect x="24" y="296" width="174" height="48" rx="4" fill="${CARD_BG}" stroke="${BORDER}" stroke-width="1"/>
  <text x="111" y="314" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="${MUTED}" text-anchor="middle">KO PERCENTAGE</text>
  <text x="111" y="334" font-family="Inter,sans-serif" font-size="20" font-weight="700" fill="${FG}" text-anchor="middle">${koPct}%</text>

  <rect x="210" y="296" width="95" height="48" rx="4" fill="${CARD_BG}" stroke="${BORDER}" stroke-width="1"/>
  <text x="257" y="314" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="${MUTED}" text-anchor="middle">TOTAL</text>
  <text x="257" y="334" font-family="Inter,sans-serif" font-size="20" font-weight="700" fill="${FG}" text-anchor="middle">${total}</text>

  <rect x="317" y="296" width="95" height="48" rx="4" fill="${CARD_BG}" stroke="${BORDER}" stroke-width="1"/>
  <text x="364" y="314" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="${MUTED}" text-anchor="middle">KNOCKOUTS</text>
  <text x="364" y="334" font-family="Inter,sans-serif" font-size="20" font-weight="700" fill="${FG}" text-anchor="middle">${kos}</text>

  <rect x="424" y="296" width="95" height="48" rx="4" fill="${CARD_BG}" stroke="${BORDER}" stroke-width="1"/>
  <text x="471" y="314" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="${MUTED}" text-anchor="middle">WIN RATE</text>
  <text x="471" y="334" font-family="Inter,sans-serif" font-size="20" font-weight="700" fill="${FG}" text-anchor="middle">${winPct}%</text>

  <rect x="531" y="296" width="95" height="48" rx="4" fill="${CARD_BG}" stroke="${BORDER}" stroke-width="1"/>
  <text x="578" y="314" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="${MUTED}" text-anchor="middle">STREAK</text>
  <text x="578" y="334" font-family="Inter,sans-serif" font-size="20" font-weight="700" fill="${ACCENT}" text-anchor="middle">${escapeXml(fighter.streak || "—")}</text>

  <rect x="638" y="296" width="138" height="48" rx="4" fill="${CARD_BG}" stroke="${BORDER}" stroke-width="1"/>
  <text x="707" y="314" font-family="Inter,sans-serif" font-size="9" font-weight="700" fill="${MUTED}" text-anchor="middle">STANCE</text>
  <text x="707" y="334" font-family="Inter,sans-serif" font-size="20" font-weight="700" fill="${FG}" text-anchor="middle">${escapeXml(fighter.stance || "—")}</text>

  <rect x="24" y="356" width="752" height="1" fill="${BORDER}" opacity="0.5"/>

  ${
    isChamp
      ? `
    <rect x="24" y="372" width="752" height="50" rx="4" fill="${GOLD}" opacity="0.08" stroke="${GOLD}" stroke-width="1" stroke-dasharray="4 2"/>
    <text x="400" y="390" font-family="Inter,sans-serif" font-size="15" font-weight="700" fill="${GOLD_LIGHT}" text-anchor="middle">${escapeXml(championTitle.toUpperCase())}</text>
    ${
      beltList.length > 0
        ? `
    <text x="400" y="405" font-family="Inter,sans-serif" font-size="10" fill="${MUTED}" text-anchor="middle">${beltList.length} belt${beltList.length > 1 ? "s" : ""} held — ${beltList.join(" • ")}</text>
  `
        : ""
    }
  `
      : `
    <text x="400" y="385" font-family="Inter,sans-serif" font-size="12" font-weight="700" fill="${MUTED}" text-anchor="middle">RANKED</text>
    <text x="400" y="407" font-family="Inter,sans-serif" font-size="24" font-weight="700" fill="${ACCENT}" text-anchor="middle">#${fighter.rank} in the world</text>
  `
  }

  ${fighter.region ? `<text x="400" y="440" font-family="Inter,sans-serif" font-size="10" fill="${MUTED}" text-anchor="middle">${escapeXml(fighter.region)}</text>` : ""}

  <rect x="0" y="496" width="800" height="4" fill="url(#topBar)"/>
  <text x="788" y="486" font-family="Inter,sans-serif" font-size="9" fill="#555" text-anchor="end">Matchroom Boxing Beta</text>
</svg>`;
}
