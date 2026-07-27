/**
 * Unit display — metric (kg, cm) or US (lb, ft/in).
 *
 * Storage NEVER changes: every store keeps kilograms and centimeters, so
 * switching units is purely cosmetic and instantly reversible. Only the
 * text shown and the numbers typed are converted at the screen edge.
 */

export type UnitSystem = "metric" | "us";

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

export const UNIT_OPTIONS: { value: UnitSystem; label: string; hint: string }[] = [
  { value: "us", label: "US", hint: "lb · ft/in" },
  { value: "metric", label: "Metric", hint: "kg · cm" },
];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ------------------------------------------------------------------- weight

export function kgToLb(kg: number): number {
  return round1(kg / KG_PER_LB);
}

export function lbToKg(lb: number): number {
  return round1(lb * KG_PER_LB);
}

export function weightUnit(u: UnitSystem): string {
  return u === "us" ? "lb" : "kg";
}

/** Canonical kg → the number shown on screen. */
export function displayWeight(kg: number, u: UnitSystem): number {
  return u === "us" ? kgToLb(kg) : round1(kg);
}

/** Typed text in the display unit → canonical kg, or null if not a number. */
export function parseWeight(text: string, u: UnitSystem): number | null {
  const n = parseFloat(text);
  if (!Number.isFinite(n) || n <= 0) return null;
  return u === "us" ? lbToKg(n) : round1(n);
}

// ------------------------------------------------------------------- length

export function cmToIn(cm: number): number {
  return round1(cm / CM_PER_IN);
}

export function inToCm(inches: number): number {
  return round1(inches * CM_PER_IN);
}

export function lengthUnit(u: UnitSystem): string {
  return u === "us" ? "in" : "cm";
}

export function displayLength(cm: number, u: UnitSystem): number {
  return u === "us" ? cmToIn(cm) : round1(cm);
}

export function parseLength(text: string, u: UnitSystem): number | null {
  const n = parseFloat(text);
  if (!Number.isFinite(n) || n <= 0) return null;
  return u === "us" ? inToCm(n) : round1(n);
}

// ------------------------------------------------------------------- height

export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalIn = Math.round(cm / CM_PER_IN);
  return { ft: Math.floor(totalIn / 12), inches: totalIn % 12 };
}

export function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * CM_PER_IN);
}

export function formatHeight(cm: number, u: UnitSystem): string {
  if (u === "us") {
    const { ft, inches } = cmToFtIn(cm);
    return `${ft}′${inches}″`;
  }
  return `${Math.round(cm)} cm`;
}
