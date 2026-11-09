import { describe, expect, it } from "vitest";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createClassificationDefinitionSchema,
  type ClassificationDefinitionMessages,
} from "./classificationSchemas";

const messages: ClassificationDefinitionMessages = {
  nameRequired: "Model name required",
  nameLength: "Model name must be at most 64 characters",
  nameOnlyNumbers: "Model name cannot consist only of numbers",
  noneNotAllowed: "None cannot be a model class",
  classRequired: "At least one nonempty class is required",
  classesUnique: "Class names must be unique",
  stateRequiresTwoClasses: "State models need two classes",
  objectLabelRequired: "Object models need a label",
  objectTypeRequired: "Object models need a type",
};

const schema = createClassificationDefinitionSchema(messages);
const options = {
  criteriaMode: "firstError" as const,
  fields: {},
  shouldUseNativeValidation: false,
};

const stateModel = {
  modelName: "Synthetic State Model",
  modelType: "state" as const,
  classes: ["moving", "stationary"],
};

const objectModel = {
  modelName: "Synthetic Object Model",
  modelType: "object" as const,
  objectLabel: "person",
  objectType: "sub_label" as const,
  classes: ["employee"],
};

describe("classification wizard step-one schema and actual form resolver", () => {
  it("accepts a valid state classifier without altering its fields", async () => {
    const result = await zodResolver(schema)(stateModel, {}, options);
    expect(result.errors).toEqual({});
    expect(result.values).toEqual(stateModel);
  });

  it("accepts a valid synthetic object classifier", async () => {
    const result = await zodResolver(schema)(objectModel, {}, options);
    expect(result.errors).toEqual({});
    expect(result.values).toEqual(objectModel);
  });

  it("rejects a missing model name with its localized error", async () => {
    const result = await zodResolver(schema)(
      { ...stateModel, modelName: "" },
      {},
      options,
    );
    expect(result.errors.modelName?.message).toBe(messages.nameRequired);
  });

  it("enforces the 64-character model name limit", () => {
    const result = schema.safeParse({
      ...stateModel,
      modelName: "A".repeat(65),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((e) => e.message === messages.nameLength)).toBe(true);
    }
  });

  it("rejects all-numeric model names", async () => {
    const result = await zodResolver(schema)(
      { ...stateModel, modelName: "123456" },
      {},
      options,
    );
    expect(result.errors.modelName?.message).toBe(messages.nameOnlyNumbers);
  });

  it("rejects class identifiers whose trimmed value is none", () => {
    const result = schema.safeParse({
      ...stateModel,
      classes: ["moving", " none "],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((e) => e.message === messages.noneNotAllowed)).toBe(true);
    }
  });

  it("requires a class selection, even for object classifiers", async () => {
    const result = await zodResolver(schema)(
      { ...objectModel, classes: [] },
      {},
      options,
    );
    expect(result.errors.classes?.message).toBe(messages.classRequired);
  });

  it("rejects all-empty class arrays", () => {
    const result = schema.safeParse({
      ...stateModel,
      classes: [" ", ""],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((e) => e.message === messages.classRequired)).toBe(true);
    }
  });

  it("rejects duplicate classes ignoring capitalization", async () => {
    const result = await zodResolver(schema)(
      { ...stateModel, classes: ["moving", "MOVING"] },
      {},
      options,
    );
    expect(result.errors.classes?.message).toBe(messages.classesUnique);
  });

  it("requires at least two nonblank classes for state classifiers", async () => {
    const result = await zodResolver(schema)(
      { ...stateModel, classes: ["moving"] },
      {},
      options,
    );
    expect(result.errors.classes?.message).toBe(messages.stateRequiresTwoClasses);
  });

  it("does not impose the two-class state rule on object classifiers", () => {
    expect(schema.safeParse(objectModel).success).toBe(true);
  });

  it("requires an object label for object classification", async () => {
    const result = await zodResolver(schema)(
      { ...objectModel, objectLabel: "" },
      {},
      options,
    );
    expect(result.errors.objectLabel?.message).toBe(messages.objectLabelRequired);
  });

  it("requires the sublabel/attribute type for object classification", async () => {
    const result = await zodResolver(schema)(
      { ...objectModel, objectType: undefined },
      {},
      options,
    );
    expect(result.errors.objectType?.message).toBe(messages.objectTypeRequired);
  });

  it("rejects an unsupported model type and object classifier subtype", () => {
    expect(schema.safeParse({ ...stateModel, modelType: "invalid" }).success).toBe(false);
    expect(schema.safeParse({ ...objectModel, objectType: "unknown" }).success).toBe(false);
  });
});
