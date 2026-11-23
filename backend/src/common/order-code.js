import { randomInt } from "node:crypto";

/**
 * Generates the unified order code (`ORD<epoch_ms><3-digit_random>`) shared across
 * online checkout and in-store staff POS sales, matching the SePay memo pattern (`ORD\d+`).
 */
export function generateOrderCode() {
  return `ORD${Date.now()}${randomInt(100, 1000)}`;
}

