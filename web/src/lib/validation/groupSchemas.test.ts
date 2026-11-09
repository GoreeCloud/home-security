import { describe, expect, it } from "vitest";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCameraGroupSchema,
  type GroupValidationMessages,
} from "./groupSchemas";

const messages: GroupValidationMessages = {
  minLength: "Group name must be at least two characters",
  duplicate: "Group name already exists",
  noPeriod: "Group name must not contain periods",
  invalidReservedName: "Reserved group name",
  iconRequired: "You must select an icon.",
  invalidIcon: "Invalid icon",
};

const existing = ["Living_Room", "office"];
const icons = ["LuHouse", "LuVideo"];
const schema = (editing = false) =>
  createCameraGroupSchema(existing, editing, icons, messages);

const values = {
  name: "Synthetic_Group",
  cameras: ["camera_example_1"],
  icon: "LuHouse",
};

const options = {
  criteriaMode: "firstError" as const,
  fields: {},
  shouldUseNativeValidation: false,
};

describe("camera-group form validation using Zod4 and actual resolver", () => {
  it("preserves valid camera-group metadata", async () => {
    const result = await zodResolver(schema())(values, {}, options);
    expect(result.errors).toEqual({});
    expect(result.values).toEqual(values);
  });

  it("normalizes interior whitespace before submission", async () => {
    const raw = { ...values, name: "  Living   Room  " };
    const editing = schema(true);
    const result = await zodResolver(editing)(raw, {}, options);
    expect(result.errors).toEqual({});
    expect(result.values.name).toBe("Living_Room");
    expect(raw.name).toBe("  Living   Room  ");
  });

  it("normalizes a multiline input into underscore-separated IDs", () => {
    const result = schema().safeParse({
      ...values,
      name: "Synthetic\tGroup\nTwo",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Synthetic_Group_Two");
  });

  it("rejects a new duplicate after whitespace normalization", async () => {
    const result = await zodResolver(schema())(
      { ...values, name: "Living Room" },
      {},
      options,
    );
    expect(result.errors.name?.message).toBe(messages.duplicate);
  });

  it("allows an unchanged group identifier in editing mode", () => {
    expect(schema(true).safeParse({ ...values, name: "Living_Room" }).success).toBe(true);
  });

  it("rejects case-insensitive reserved default group identifiers", async () => {
    const result = await zodResolver(schema())(
      { ...values, name: "DEFAULT" },
      {},
      options,
    );
    expect(result.errors.name?.message).toBe(messages.invalidReservedName);
  });

  it("rejects periods and names shorter than two characters", async () => {
    const tooShort = await zodResolver(schema())(
      { ...values, name: "x" },
      {},
      options,
    );
    expect(tooShort.errors.name?.message).toBe(messages.minLength);
    const dotted = await zodResolver(schema())(
      { ...values, name: "front.door" },
      {},
      options,
    );
    expect(dotted.errors.name?.message).toBe(messages.noPeriod);
  });

  it("rejects blank icon names using the original message", async () => {
    const result = await zodResolver(schema())(
      { ...values, icon: "" },
      {},
      options,
    );
    expect(result.errors.icon?.message).toBe(messages.iconRequired);
  });

  it("rejects icons not present in the approved selectable icon names", async () => {
    const result = await zodResolver(schema())(
      { ...values, icon: "LuUnknown" },
      {},
      options,
    );
    expect(result.errors.icon?.message).toBe(messages.invalidIcon);
  });

  it("accepts a second valid icon name without normalization", () => {
    expect(schema().safeParse({ ...values, icon: "LuVideo" }).success).toBe(true);
  });

  it("preserves empty camera groups as permitted by the original form", () => {
    expect(schema().safeParse({ ...values, cameras: [] }).success).toBe(true);
  });

  it("rejects invalid camera ID types and non-string names", () => {
    expect(schema().safeParse({ ...values, cameras: [123] }).success).toBe(false);
    expect(schema().safeParse({ ...values, name: 3 }).success).toBe(false);
  });
});
