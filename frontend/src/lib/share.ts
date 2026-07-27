/**
 * Share cards — step 8. Body-free by construction: the card data type has
 * no field for weight, measurements, or calories, so nothing about a body
 * can ever leak onto a card. What gets celebrated is showing up: streaks,
 * sessions, movement, stickers.
 */

import { type Sticker } from "./rewards";

export interface ShareCardData {
  headline: string;
  subline: string;
  stats: { value: string; label: string }[];
  emojis: string[];
  dateLabel: string;
}

export interface ShareInputs {
  streakWeeks: number;
  sessionCount: number;
  weekSessions: number;
  weekCardioMin: number;
  weekSteps: number;
  stickers: Sticker[];
}

/** Pick the proudest true sentence. Never guilt, never bodies. */
export function buildCardData(inputs: ShareInputs, dateLabel: string): ShareCardData {
  const { streakWeeks, sessionCount, weekSessions, weekCardioMin, weekSteps } = inputs;

  const headline =
    streakWeeks >= 2
      ? `${streakWeeks} weeks showing up`
      : sessionCount >= 1
        ? `${sessionCount} ${sessionCount === 1 ? "session" : "sessions"} logged`
        : "Day one";

  const subline =
    streakWeeks >= 2
      ? "Full, light, minimum, rest — every kind of day counted."
      : sessionCount >= 1
        ? "Every kind of day counts."
        : "The plan adapts to me — not the other way around.";

  const stats: ShareCardData["stats"] = [];
  if (weekSessions > 0)
    stats.push({
      value: String(weekSessions),
      label: weekSessions === 1 ? "session this week" : "sessions this week",
    });
  if (weekCardioMin > 0)
    stats.push({ value: String(weekCardioMin), label: "cardio minutes" });
  if (weekSteps > 0)
    stats.push({ value: weekSteps.toLocaleString(), label: "steps" });
  if (stats.length === 0 && sessionCount > 0)
    stats.push({
      value: String(sessionCount),
      label: sessionCount === 1 ? "session so far" : "sessions so far",
    });

  return {
    headline,
    subline,
    stats: stats.slice(0, 3),
    emojis: inputs.stickers.filter((s) => s.earned).map((s) => s.emoji).slice(0, 8),
    dateLabel,
  };
}

// ------------------------------------------------------------------- canvas

// The card always renders in the light palette — it leaves the app, so it
// shouldn't depend on the viewer's theme.
const PAPER = "#F1F3EF";
const CARD = "#FFFFFF";
const INK = "#171E1A";
const MOSS = "#3E6B4F";
const MIST = "#DDE2DA";

export const CARD_W = 1080;
export const CARD_H = 1350;

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function drawCard(canvas: HTMLCanvasElement, data: ShareCardData): void {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const display = `"Familjen Grotesk Variable", "Familjen Grotesk", system-ui, sans-serif`;
  const body = `"Public Sans Variable", "Public Sans", system-ui, sans-serif`;
  const mono = `"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace`;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Inner card
  rounded(ctx, 60, 60, CARD_W - 120, CARD_H - 120, 48);
  ctx.fillStyle = CARD;
  ctx.fill();
  ctx.strokeStyle = MIST;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Eyebrow
  ctx.fillStyle = "rgba(23,30,26,0.45)";
  ctx.font = `600 34px ${body}`;
  ctx.textAlign = "left";
  ctx.fillText("A D A P T I V E   F I T N E S S", 140, 190);

  // Moss accent bar
  rounded(ctx, 140, 230, 120, 14, 7);
  ctx.fillStyle = MOSS;
  ctx.fill();

  // Headline
  ctx.fillStyle = INK;
  ctx.font = `700 96px ${display}`;
  wrapText(ctx, data.headline, 140, 380, CARD_W - 280, 108);

  // Subline
  ctx.fillStyle = "rgba(23,30,26,0.6)";
  ctx.font = `400 42px ${body}`;
  wrapText(ctx, data.subline, 140, 570, CARD_W - 280, 58);

  // Stats row
  const statTop = 730;
  const gap = 30;
  const n = Math.max(data.stats.length, 1);
  const tileW = (CARD_W - 280 - gap * (n - 1)) / n;
  data.stats.forEach((s, i) => {
    const x = 140 + i * (tileW + gap);
    rounded(ctx, x, statTop, tileW, 220, 32);
    ctx.fillStyle = PAPER;
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = `500 72px ${mono}`;
    ctx.textAlign = "center";
    ctx.fillText(s.value, x + tileW / 2, statTop + 105);
    ctx.fillStyle = "rgba(23,30,26,0.5)";
    ctx.font = `400 30px ${body}`;
    wrapText(ctx, s.label, x + tileW / 2, statTop + 160, tileW - 40, 36, "center");
  });

  // Sticker row
  if (data.emojis.length > 0) {
    ctx.font = `72px ${body}`;
    ctx.textAlign = "center";
    const total = data.emojis.length;
    const spread = Math.min(110, (CARD_W - 320) / total);
    const startX = CARD_W / 2 - (spread * (total - 1)) / 2;
    data.emojis.forEach((e, i) => {
      ctx.fillText(e, startX + i * spread, 1090);
    });
  }

  // Footer
  ctx.fillStyle = "rgba(23,30,26,0.4)";
  ctx.font = `400 32px ${body}`;
  ctx.textAlign = "left";
  ctx.fillText(data.dateLabel, 140, 1210);
  ctx.textAlign = "right";
  ctx.fillText("no numbers that aren't mine", CARD_W - 140, 1210);
  ctx.textAlign = "left";
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: "left" | "center" = "left",
) {
  ctx.textAlign = align;
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
  ctx.textAlign = "left";
}
