import { describe, expect, it } from "vitest";
import { currencyPair, formatMinor, isCurrency, multiplyMinor, parseMinor } from "../../../backend/domain/money";

describe("fixed-precision money", () => {
  it("parses decimal amounts as integer minor units", () => {
    expect(parseMinor("0.01")).toBe(1n);
    expect(parseMinor("2500")).toBe(250000n);
    expect(parseMinor("999999999999.99")).toBe(99999999999999n);
    expect(parseMinor(14.3)).toBe(1430n);
  });

  it.each(["0", "-1", "1.001", "1e3", "1,25", "1000000000000"])(
    "rejects invalid input %s",
    (input) => expect(() => parseMinor(input)).toThrow()
  );

  it("formats signed minor units without floating point", () => {
    expect(formatMinor("250001")).toBe("2500.01");
    expect(formatMinor("-5")).toBe("-0.05");
  });

  it("applies deterministic sandbox FX fixtures with integer rounding", () => {
    const pair = currencyPair("USD", "COP");
    expect(pair.displayRate).toBe("4100.00000000");
    expect(multiplyMinor(123n, pair.numerator, pair.denominator)).toBe(504300n);
    expect(multiplyMinor(100n, 1n, 3n)).toBe(33n);
  });

  it("supports only the currencies enabled for the first sandbox release", () => {
    expect(isCurrency("USD")).toBe(true);
    expect(isCurrency("COP")).toBe(true);
    expect(isCurrency("CRC")).toBe(true);
    expect(isCurrency("EUR")).toBe(false);
  });
});
