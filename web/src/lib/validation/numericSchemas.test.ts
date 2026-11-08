import { describe, expect, it } from "vitest";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createOnvifPortSchema,
  createOptionalClassificationIntervalSchema,
  createOptionalZoneNumberSchema,
  createZoneInertiaSchema,
  hasPositiveZoneLoiteringTime,
} from "./numericSchemas";

const options = {
  criteriaMode: "firstError" as const,
  fields: {},
  shouldUseNativeValidation: false,
};

describe("camera ONVIF port coercion in the real schema builder", () => {
  const port = createOnvifPortSchema();

  it("accepts valid numeric text and emits a number for API submission", async () => {
    const schema = z.object({ onvifPort: port });
    const result = await zodResolver(schema)(
      { onvifPort: "8554" },
      {},
      options,
    );
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ onvifPort: 8554 });
  });

  it("supports omitted optional ports but rejects blank or invalid ports", () => {
    expect(port.parse(undefined)).toBeUndefined();
    expect(port.safeParse("").success).toBe(false);
    expect(port.safeParse("0").success).toBe(false);
    expect(port.safeParse("65536").success).toBe(false);
    expect(port.safeParse("not-a-number").success).toBe(false);
  });
});

describe("classification interval normalization", () => {
  const interval = createOptionalClassificationIntervalSchema("Positive interval required");

  it("preserves the imported blank, null and missing override behavior", () => {
    expect(interval.parse("")).toBeUndefined();
    expect(interval.parse(null)).toBeUndefined();
    expect(interval.parse(undefined)).toBeUndefined();
  });

  it("parses positive integer text but rejects zero, fractional and invalid text", () => {
    expect(interval.parse("30")).toBe(30);
    expect(interval.parse(3)).toBe(3);
    expect(interval.safeParse("0").success).toBe(false);
    expect(interval.safeParse("2.5").success).toBe(false);
    expect(interval.safeParse("missing").success).toBe(false);
  });
});

describe("zone numeric-or-blank field behavior", () => {
  it("accepts a valid inertia and preserves an empty field", () => {
    const inertia = createZoneInertiaSchema("Inertia must be positive");
    expect(inertia.parse("3")).toBe(3);
    expect(inertia.parse("")).toBe("");
    expect(inertia.safeParse("-1").success).toBe(false);
  });

  it("accepts positive distance values and preserves blank distance", () => {
    const distance = createOptionalZoneNumberSchema(0.1, "Distance required");
    expect(distance.parse("0.25")).toBe(0.25);
    expect(distance.parse("")).toBe("");
    expect(distance.parse(undefined)).toBeUndefined();
    expect(distance.safeParse("0").success).toBe(false);
  });

  it("warns only for positive, valid loitering time from raw form text", () => {
    expect(hasPositiveZoneLoiteringTime("10")).toBe(true);
    expect(hasPositiveZoneLoiteringTime(10)).toBe(true);
    expect(hasPositiveZoneLoiteringTime("0")).toBe(false);
    expect(hasPositiveZoneLoiteringTime("")).toBe(false);
    expect(hasPositiveZoneLoiteringTime(undefined)).toBe(false);
    expect(hasPositiveZoneLoiteringTime("invalid")).toBe(false);
    expect(hasPositiveZoneLoiteringTime("-1")).toBe(false);
  });

  it("preserves zero for the existing optional loitering threshold", () => {
    const loiter = createOptionalZoneNumberSchema(0, "Invalid loitering time");
    expect(loiter.parse("")).toBe(0);
    expect(loiter.parse("0")).toBe(0);
    expect(loiter.safeParse("-1").success).toBe(false);
  });
});
