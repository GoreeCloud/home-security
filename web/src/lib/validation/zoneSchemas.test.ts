import { describe, expect, it } from "vitest";
import { zodResolver } from "@hookform/resolvers/zod";
import { createZoneSchema, type ZoneValidationMessages } from "./zoneSchemas";

const messages: ZoneValidationMessages = {
  nameMinLength: "Zone ID must contain at least two characters",
  matchesCameraName: "Zone must not match a camera name",
  alreadyExists: "Zone ID already exists",
  noPeriod: "Zone ID must not contain periods",
  inertiaMin: "Inertia must be at least one",
  loiteringMin: "Loitering time cannot be negative",
  unfinishedPolygon: "Polygon must be finished",
  distanceMin: "Distance must be at least 0.1",
  distanceRequired: "All four distances must be specified",
  speedMin: "Speed threshold must be at least 0.1",
  speedLoiteringConflict: "Speed estimation conflicts with loitering time",
};

const schema = createZoneSchema(
  ["camera_front", "camera_back"],
  ["existing_zone", "another_zone"],
  messages,
);
const base = {
  name: "Synthetic Zone",
  friendly_name: "Synthetic friendly name",
  inertia: "3",
  loitering_time: "0",
  isFinished: true,
  objects: ["person"],
  enabled: true,
  speedEstimation: false,
};
const options = {
  criteriaMode: "firstError" as const,
  fields: {},
  shouldUseNativeValidation: false,
};

function issues(value: unknown): string[] {
  const result = schema.safeParse(value);
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.message);
}

describe("real zone polygon form Zod4/v5 input-output and safety contract", () => {
  it("preserves a valid finished synthetic polygon and coerces numeric UI strings", async () => {
    const parsed = await zodResolver(schema)(base, {}, options);
    expect(parsed.errors).toEqual({});
    expect(parsed.values).toMatchObject({
      name: "Synthetic_Zone",
      friendly_name: "Synthetic friendly name",
      inertia: 3,
      loitering_time: 0,
      isFinished: true,
      enabled: true,
      speedEstimation: false,
    });
    expect(base.name).toBe("Synthetic Zone");
  });

  it("uses existing enabled and speed defaults when omitted", () => {
    const { enabled: _enabled, speedEstimation: _speed, ...rest } = base;
    const result = schema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(true);
      expect(result.data.speedEstimation).toBe(false);
    }
  });

  it("trims ID whitespace and replaces multiple spaces with underscores", () => {
    const result = schema.safeParse({ ...base, name: "  New   Zone  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("New_Zone");
  });

  it("rejects a normalized zone ID containing only whitespace", () => {
    expect(issues({ ...base, name: "   " })).toContain(messages.nameMinLength);
  });

  it("rejects names that become a single character after trimming", () => {
    expect(issues({ ...base, name: " a " })).toContain(messages.nameMinLength);
  });

  it("rejects a zone name colliding with an existing camera", () => {
    expect(issues({ ...base, name: "camera_front" })).toContain(messages.matchesCameraName);
  });

  it("rejects an already-defined zone ID after name normalization", () => {
    expect(issues({ ...base, name: "existing zone" })).toContain(messages.alreadyExists);
  });

  it("rejects a zone ID with a period, without rejecting allowed periods in display names", () => {
    expect(issues({ ...base, name: "zone.one" })).toContain(messages.noPeriod);
    expect(issues({ ...base, friendly_name: "Friendly.Zone" })).toEqual([]);
  });

  it("rejects IDs shorter than two characters, including pre-trim short inputs", () => {
    expect(issues({ ...base, name: "x" })).toContain(messages.nameMinLength);
  });

  it("rejects empty friendly names, duplicate friendly names, and camera-name display collisions", () => {
    expect(issues({ ...base, friendly_name: "x" })).toContain(messages.nameMinLength);
    expect(issues({ ...base, friendly_name: "another_zone" })).toContain(messages.alreadyExists);
    expect(issues({ ...base, friendly_name: "camera_back" })).toContain(messages.matchesCameraName);
  });

  it("rejects whitespace-only zone display names", () => {
    expect(issues({ ...base, friendly_name: "   " })).toContain(messages.nameMinLength);
  });

  it("rejects display names with fewer than two nonwhitespace characters", () => {
    expect(issues({ ...base, friendly_name: " a " })).toContain(messages.nameMinLength);
  });

  it("rejects unfinished polygons before any save callback", async () => {
    const parsed = await zodResolver(schema)({ ...base, isFinished: false }, {}, options);
    expect(parsed.errors.isFinished?.message).toBe(messages.unfinishedPolygon);
  });

  it("rejects inertia below one and invalid numeric UI values", async () => {
    const low = await zodResolver(schema)({ ...base, inertia: "0" }, {}, options);
    expect(low.errors.inertia?.message).toBe(messages.inertiaMin);
    expect(schema.safeParse({ ...base, inertia: "not a number" }).success).toBe(false);
  });

  it("retains the imported blank-inertia union and optional blank distances", () => {
    const result = schema.safeParse({
      ...base,
      inertia: "",
      lineA: "",
      lineB: "",
      lineC: "",
      lineD: "",
      speed_threshold: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inertia).toBe("");
      expect(result.data.lineA).toBe("");
    }
  });

  it("rejects negative loitering time and permits zero", () => {
    expect(issues({ ...base, loitering_time: -1 })).toContain(messages.loiteringMin);
    expect(issues({ ...base, loitering_time: 0 })).toEqual([]);
  });

  it("requires all four positive distances when speed estimation is enabled", async () => {
    const parsed = await zodResolver(schema)({
      ...base, speedEstimation: true, lineA: 1, lineB: 2, lineC: 3,
    }, {}, options);
    expect(parsed.errors.speedEstimation?.message).toBe(messages.distanceRequired);
  });

  it("accepts all four distances at the minimum 0.1 while speed estimation is enabled", () => {
    const result = schema.safeParse({
      ...base, speedEstimation: true,
      lineA: "0.1", lineB: "0.1", lineC: "0.1", lineD: "0.1",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.lineA).toBe(0.1);
  });

  it("rejects too-small distances rather than coercing zero into a valid measurement", () => {
    expect(issues({
      ...base, speedEstimation: true, lineA: "0", lineB: 1, lineC: 1, lineD: 1,
    })).toContain(messages.distanceMin);
  });

  it("blocks simultaneous speed estimation and positive loitering time", async () => {
    const parsed = await zodResolver(schema)({
      ...base, speedEstimation: true, loitering_time: "5",
      lineA: 1, lineB: 2, lineC: 3, lineD: 4,
    }, {}, options);
    expect(parsed.errors.loitering_time?.message).toBe(messages.speedLoiteringConflict);
  });

  it("allows a positive loitering time when speed estimation is disabled", () => {
    expect(issues({ ...base, loitering_time: "5", speedEstimation: false })).toEqual([]);
  });

  it("rejects speed threshold below 0.1 and accepts the minimum", () => {
    expect(issues({ ...base, speed_threshold: "0.05" })).toContain(messages.speedMin);
    expect(issues({ ...base, speed_threshold: "0.1" })).toEqual([]);
  });

  it("preserves configured review flags and optional objects without widening types", () => {
    const result = schema.safeParse({
      ...base, objects: ["person", "car"], review_alerts: true, review_detections: false,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.review_alerts).toBe(true);
    expect(issues({ ...base, objects: [2] })).not.toEqual([]);
    expect(issues({ ...base, enabled: "true" })).not.toEqual([]);
  });
});
