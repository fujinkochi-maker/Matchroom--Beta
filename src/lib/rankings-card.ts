const CARD_BG = "#1a1a1a";
const BORDER = "#2c2c2c";
const FG = "#fafafa";
const MUTED = "#a1a1a1";
const ACCENT = "#dc2626";
const GOLD = "#d4a017";
const GOLD_LIGHT = "#f0d060";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function rowY(index: number): number {
  return 145 + index * 44;
}

function renderRow(f: any, index: number, isChamp: boolean): string {
  const y = rowY(index);
  const bg = index % 2 === 0 ? "#141414" : CARD_BG;
  const rankDisplay = isChamp ? "C" : `#${index + 1}`;
  const rankColor = isChamp ? GOLD : ACCENT;
  const beltText = f.beltsHeld ? f.beltsHeld.split(",").filter(Boolean).join(" ") : "";

  return `
  <rect x="20" y="${y}" width="660" height="42" rx="4" fill="${bg}"/>
  <text x="45" y="${y + 27}" font-family="Inter,sans-serif" font-size="16" font-weight="700" fill="${rankColor}" text-anchor="middle">${esc(rankDisplay)}</text>
  <text x="80" y="${y + 27}" font-family="Inter,sans-serif" font-size="14" font-weight="600" fill="${FG}">${esc(f.displayName)}</text>
  <text x="80" y="${y + 40}" font-family="Inter,sans-serif" font-size="10" fill="${MUTED}">@${esc(f.username)}</text>
  <text x="400" y="${y + 27}" font-family="Inter,sans-serif" font-size="13" font-weight="600" fill="${FG}" text-anchor="middle">${f.wins}-${f.losses}-${f.draws}</text>
  <text x="520" y="${y + 27}" font-family="Inter,sans-serif" font-size="13" font-weight="600" fill="${f.streak?.endsWith("W") ? "#38a169" : f.streak?.endsWith("L") ? ACCENT : MUTED}" text-anchor="middle">${esc(f.streak || "—")}</text>
  ${beltText ? `<text x="620" y="${y + 27}" font-family="Inter,sans-serif" font-size="11" fill="${GOLD_LIGHT}" text-anchor="middle" font-weight="600">${esc(beltText)}</text>` : ""}
  ${isChamp ? `<rect x="18" y="${y + 2}" width="2" height="38" rx="1" fill="${GOLD}"/>` : ""}
  `;
}

const W = 700;

function headerSVG(title: string, subtitle: string, h: number): string {
  return `
  <defs>
    <linearGradient id="topBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${ACCENT}"/>
      <stop offset="100%" stop-color="#991b1b"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${h}" fill="#0f0f0f"/>
  <rect width="${W}" height="5" fill="url(#topBar)"/>
  <text x="350" y="42" font-family="Inter,sans-serif" font-size="24" font-weight="700" fill="${FG}" text-anchor="middle">${esc(title)}</text>
  <text x="350" y="62" font-family="Inter,sans-serif" font-size="12" fill="${MUTED}" text-anchor="middle">${esc(subtitle)}</text>
  <line x1="20" y1="80" x2="680" y2="80" stroke="${BORDER}" stroke-width="1" opacity="0.5"/>
  <text x="45" y="100" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="${MUTED}" text-anchor="middle">RANK</text>
  <text x="80" y="100" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="${MUTED}">FIGHTER</text>
  <text x="400" y="100" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="${MUTED}" text-anchor="middle">RECORD</text>
  <text x="520" y="100" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="${MUTED}" text-anchor="middle">STREAK</text>
  <text x="620" y="100" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="${MUTED}" text-anchor="middle">BELTS</text>
  `;
}

function calcOverall(f: any): number {
  return f.wins * 10 + f.kos * 5 - f.losses * 8;
}

const MAX_ROWS = 10;
const FIXED_H = 145 + MAX_ROWS * 44 + 30;

function renderEmptyRow(index: number): string {
  const y = rowY(index);
  const bg = index % 2 === 0 ? "#141414" : CARD_BG;
  return `<rect x="20" y="${y}" width="660" height="42" rx="4" fill="${bg}"/>`;
}

function svgFooter(H: number): string {
  return `
  <rect x="0" y="${H - 4}" width="${W}" height="4" fill="url(#topBar)"/>
  <text x="${W - 12}" y="${H - 10}" font-family="Inter,sans-serif" font-size="9" fill="#555" text-anchor="end">Matchroom Boxing Beta</text>
</svg>`;
}

export function renderDivisionRankingsSVG(division: string, fighters: any[]): string {
  const top = fighters.slice(0, MAX_ROWS);
  const rows: string[] = [];
  for (let i = 0; i < MAX_ROWS; i++) {
    if (i < top.length) {
      rows.push(renderRow(top[i], i, top[i].rank === 0));
    } else {
      rows.push(renderEmptyRow(i));
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${FIXED_H}" viewBox="0 0 ${W} ${FIXED_H}">
  ${headerSVG(`${division.toUpperCase()} RANKINGS`, "Top contenders in the division", FIXED_H)}
  ${rows.join("")}
  ${svgFooter(FIXED_H)}`;
}

export function renderP4PRankingsSVG(fighters: any[]): string {
  const champions = fighters.filter((f: any) => f.rank === 0)
    .sort((a: any, b: any) => {
      const aBelts = a.beltsHeld ? a.beltsHeld.split(",").filter(Boolean).length : 0;
      const bBelts = b.beltsHeld ? b.beltsHeld.split(",").filter(Boolean).length : 0;
      if (bBelts !== aBelts) return bBelts - aBelts;
      return b.wins - a.wins;
    });

  const contenders = fighters.filter((f: any) => f.rank !== 0)
    .sort((a: any, b: any) => calcOverall(b) - calcOverall(a));

  const top = [...champions, ...contenders].slice(0, MAX_ROWS);
  const rows: string[] = [];
  for (let i = 0; i < MAX_ROWS; i++) {
    if (i < top.length) {
      rows.push(renderRow(top[i], i, top[i].rank === 0));
    } else {
      rows.push(renderEmptyRow(i));
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${FIXED_H}" viewBox="0 0 ${W} ${FIXED_H}">
  ${headerSVG("POUND FOR POUND RANKINGS", "Top 10 fighters across all divisions", FIXED_H)}
  ${rows.join("")}
  ${svgFooter(FIXED_H)}`;
}
