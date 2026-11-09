import { describe, expect, it } from "vitest";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTriggerSchema,
  type TriggerValidationMessages,
} from "./triggerSchemas";

const messages: TriggerValidationMessages = {
  minLength: "Trigger name must contain two characters",
  invalidCharacters: "Trigger name has illegal characters",
  alreadyExists: "Trigger name already exists",
  requiredContent: "Trigger content is required",
  minThreshold: "Threshold must be at least zero",
  maxThreshold: "Threshold must not exceed one",
};

const existingNames = ["existing_trigger", "another_trigger"];
const existingFriendlyNames = ["Existing trigger", "Another trigger"];

const create = (
  editName?: string,
  editFriendly?: string,
) =>
  createTriggerSchema(
    editName,
    editFriendly,
    existingNames,
    existingFriendlyNames,
    messages,
  );

const values = {
  enabled: true,
  name: "synthetic_trigger",
  friendly_name: "Synthetic trigger",
  type: "description" as const,
  data: "Synthetic noncamera description",
  threshold: 0.5,
  actions: ["notification", "sub_label"] as (
    | "notification"
    | "sub_label"
    | "attribute"
  )[],
};

const options = {
  criteriaMode: "firstError" as const,
  fields: {},
  shouldUseNativeValidation: false,
};

describe("real camera-scoped trigger dialog Zod4 form validation", () => {
  it("preserves a valid synthetic description trigger through resolver", async () => {
    const result = await zodResolver(create())(values, {}, options);
    expect(result.errors).toEqual({});
    expect(result.values).toEqual(values);
  });

  it("accepts a synthetic thumbnail trigger and all supported actions", () => {
    expect(
      create().safeParse({
        ...values,
        type: "thumbnail",
        actions: ["notification", "sub_label", "attribute"],
      }).success,
    ).toBe(true);
  });

  it("accepts empty notification/action selection as in the original UI", () => {
    expect(create().safeParse({ ...values, actions: [] }).success).toBe(true);
  });

  it("rejects trigger IDs shorter than two characters", async () => {
    const result = await zodResolver(create())(
      { ...values, name: "a" },
      {},
      options,
    );
    expect(result.errors.name?.message).toBe(messages.minLength);
  });

  it("rejects trigger IDs with whitespace and path characters", () => {
    for (const name of ["bad trigger", "bad/trigger", "bad.trigger", "a&b"]) {
      const parsed = create().safeParse({ ...values, name });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues.some((e) => e.message === messages.invalidCharacters)).toBe(true);
      }
    }
  });

  it("rejects camera-scoped duplicate internal IDs", async () => {
    const result = await zodResolver(create())(
      { ...values, name: "existing_trigger" },
      {},
      options,
    );
    expect(result.errors.name?.message).toBe(messages.alreadyExists);
  });

  it("allows an unchanged trigger ID when editing", () => {
    expect(
      create("existing_trigger", "Existing trigger").safeParse({
        ...values,
        name: "existing_trigger",
        friendly_name: "Existing trigger",
      }).success,
    ).toBe(true);
  });

  it("rejects duplicate friendly names for a different trigger", async () => {
    const result = await zodResolver(create())(
      { ...values, friendly_name: "Another trigger" },
      {},
      options,
    );
    expect(result.errors.friendly_name?.message).toBe(messages.alreadyExists);
  });

  it("requires two characters in a friendly name", async () => {
    const result = await zodResolver(create())(
      { ...values, friendly_name: "x" },
      {},
      options,
    );
    expect(result.errors.friendly_name?.message).toBe(messages.minLength);
  });

  it("rejects blank trigger content", async () => {
    const result = await zodResolver(create())(
      { ...values, data: "" },
      {},
      options,
    );
    expect(result.errors.data?.message).toBe(messages.requiredContent);
  });

  it("accepts the minimum and maximum threshold boundaries", () => {
    expect(create().safeParse({ ...values, threshold: 0 }).success).toBe(true);
    expect(create().safeParse({ ...values, threshold: 1 }).success).toBe(true);
  });

  it("rejects thresholds below zero and above one", async () => {
    const below = await zodResolver(create())(
      { ...values, threshold: -0.1 },
      {},
      options,
    );
    expect(below.errors.threshold?.message).toBe(messages.minThreshold);
    const above = await zodResolver(create())(
      { ...values, threshold: 1.01 },
      {},
      options,
    );
    expect(above.errors.threshold?.message).toBe(messages.maxThreshold);
  });

  it("rejects string thresholds to prevent silent Zod4 coercion changes", () => {
    expect(create().safeParse({ ...values, threshold: "0.5" }).success).toBe(false);
  });

  it("rejects illegal action and trigger type values", () => {
    expect(create().safeParse({ ...values, actions: ["external_command"] }).success).toBe(false);
    expect(create().safeParse({ ...values, type: "unknown" }).success).toBe(false);
    expect(create().safeParse({ ...values, enabled: "true" }).success).toBe(false);
  });
});
