import { describe, expect, it } from "vitest";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createMotionMaskSchema,
  createObjectMaskSchema,
  type MaskValidationMessages,
} from "./maskSchemas";

const messages: MaskValidationMessages = {
  idRequired: "Mask identifier required",
  idAlreadyExists: "Mask identifier already exists",
  nameRequired: "Mask name required",
  polygonMustBeFinished: "Finish the polygon before saving",
};

const options = {
  criteriaMode: "firstError" as const,
  fields: {},
  shouldUseNativeValidation: false,
};

const motionMask = {
  name: "synthetic_motion_zone",
  friendly_name: "Synthetic motion mask",
  enabled: true,
  isFinished: true,
};

const objectMask = {
  ...motionMask,
  objects: "person",
};

describe("motion mask schema used by the real privacy-mask editing UI", () => {
  const schema = createMotionMaskSchema(
    undefined,
    ["already_used_mask"],
    messages,
  );

  it("accepts a finished, enabled synthetic mask without changing its values", async () => {
    const result = await zodResolver(schema)(motionMask, {}, options);
    expect(result.errors).toEqual({});
    expect(result.values).toEqual(motionMask);
  });

  it("rejects duplicate mask identifiers using the localized field error", async () => {
    const result = await zodResolver(schema)(
      { ...motionMask, name: "already_used_mask" },
      {},
      options,
    );
    expect(result.errors.name?.message).toBe(messages.idAlreadyExists);
  });

  it("allows the same identifier when editing the corresponding existing mask", () => {
    const edit = createMotionMaskSchema(
      "already_used_mask",
      ["already_used_mask"],
      messages,
    );
    expect(edit.safeParse({ ...motionMask, name: "already_used_mask" }).success).toBe(true);
  });

  it("rejects unfinished polygons and empty friendly names", async () => {
    const result = await zodResolver(schema)(
      { ...motionMask, isFinished: false, friendly_name: "" },
      {},
      options,
    );
    expect(result.errors.isFinished?.message).toBe(messages.polygonMustBeFinished);
    expect(result.errors.friendly_name?.message).toBe(messages.nameRequired);
  });

  it("rejects blank IDs and nonboolean enabling flags", () => {
    expect(schema.safeParse({ ...motionMask, name: "" }).success).toBe(false);
    expect(schema.safeParse({ ...motionMask, enabled: "false" }).success).toBe(false);
  });
});

describe("object mask global/filter collision and privacy-validation rules", () => {
  const schema = createObjectMaskSchema(
    undefined,
    ["global_mask"],
    ["person_filter_mask", "car_filter_mask"],
    messages,
  );

  it("accepts a finished class-specific synthetic mask", async () => {
    const result = await zodResolver(schema)(objectMask, {}, options);
    expect(result.errors).toEqual({});
    expect(result.values).toEqual(objectMask);
  });

  it("rejects an ID already used by global object masking", async () => {
    const result = await zodResolver(schema)(
      { ...objectMask, name: "global_mask" },
      {},
      options,
    );
    expect(result.errors.name?.message).toBe(messages.idAlreadyExists);
  });

  it("rejects an ID used by an existing per-class filter mask", async () => {
    const result = await zodResolver(schema)(
      { ...objectMask, name: "person_filter_mask" },
      {},
      options,
    );
    expect(result.errors.name?.message).toBe(messages.idAlreadyExists);
  });

  it("permits editing the same existing object mask ID", () => {
    const edit = createObjectMaskSchema(
      "person_filter_mask",
      ["global_mask"],
      ["person_filter_mask"],
      messages,
    );
    expect(
      edit.safeParse({ ...objectMask, name: "person_filter_mask" }).success,
    ).toBe(true);
  });

  it("requires a finished polygon and a string class selector", async () => {
    const result = await zodResolver(schema)(
      { ...objectMask, isFinished: false, objects: "all_labels" },
      {},
      options,
    );
    expect(result.errors.isFinished?.message).toBe(messages.polygonMustBeFinished);
    expect(schema.safeParse({ ...objectMask, objects: 123 }).success).toBe(false);
  });
});
