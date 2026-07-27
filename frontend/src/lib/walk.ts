/**
 * Walk tracking — the closest a web app can get to a pedometer.
 *
 * Honest constraints: iOS gives web apps no access to the Health app or
 * the motion coprocessor, and suspends them in the background. So the
 * tracker works while the app is open: GPS distance when it's available,
 * a time-based estimate when it isn't. Manual entry always remains.
 */

/** Great-circle distance between two coordinates, in meters. */
export function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Walking stride length from height (~0.415 × height), with a sane
    default when height is unknown. */
export function strideM(heightCm?: number): number {
  if (!heightCm || heightCm < 100) return 0.7;
  return Math.round(heightCm * 0.415) / 100;
}

/** Steps from GPS distance. */
export function stepsFromDistance(meters: number, heightCm?: number): number {
  if (meters <= 0) return 0;
  return Math.round(meters / strideM(heightCm));
}

/** Fallback when GPS isn't available: a relaxed walking cadence
    (~100 steps/min) — deliberately conservative. */
export const FALLBACK_CADENCE = 100;

export function stepsFromMinutes(minutes: number): number {
  if (minutes <= 0) return 0;
  return Math.round(minutes * FALLBACK_CADENCE);
}

/** GPS noise filter: ignore fixes with poor accuracy and jumps that are
    implausible for walking (> ~2.5 m/s sustained between fixes). */
export function acceptSegment(
  meters: number,
  seconds: number,
  accuracyM: number,
): boolean {
  if (accuracyM > 40) return false;
  if (meters < 1) return false; // standing still / jitter
  if (seconds <= 0) return false;
  return meters / seconds <= 2.5;
}
