import { describe, expect, it } from "vitest";
import { formatDistance } from "./units";
import {
  acceptSegment,
  haversineM,
  stepsFromDistance,
  stepsFromMinutes,
  strideM,
} from "./walk";

describe("walk distance", () => {
  it("haversine matches a known distance", () => {
    // One degree of latitude ≈ 111.2 km.
    expect(haversineM(0, 0, 1, 0)).toBeCloseTo(111_195, -3);
    expect(haversineM(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
  });

  it("stride scales with height and has a fallback", () => {
    expect(strideM(180)).toBeCloseTo(0.75, 2);
    expect(strideM(150)).toBeCloseTo(0.62, 2);
    expect(strideM(undefined)).toBe(0.7);
  });

  it("estimates steps from distance", () => {
    // 1 km at 173 cm height → ~1393 steps.
    expect(stepsFromDistance(1000, 173)).toBe(1389);
    expect(stepsFromDistance(0, 173)).toBe(0);
  });

  it("estimates steps from time when GPS is unavailable", () => {
    expect(stepsFromMinutes(30)).toBe(3000);
    expect(stepsFromMinutes(0)).toBe(0);
  });
});

describe("GPS noise filter", () => {
  it("accepts a normal walking segment", () => {
    expect(acceptSegment(8, 6, 10)).toBe(true);
  });
  it("rejects poor accuracy, jitter, and vehicle-speed jumps", () => {
    expect(acceptSegment(8, 6, 80)).toBe(false); // bad fix
    expect(acceptSegment(0.5, 6, 10)).toBe(false); // standing still
    expect(acceptSegment(100, 6, 10)).toBe(false); // that's a car
  });
});

describe("distance formatting", () => {
  it("formats metric", () => {
    expect(formatDistance(850, "metric")).toBe("850 m");
    expect(formatDistance(2340, "metric")).toBe("2.34 km");
  });
  it("formats US", () => {
    expect(formatDistance(1609.344, "us")).toBe("1.00 mi");
    expect(formatDistance(100, "us")).toBe("328 ft");
  });
});
