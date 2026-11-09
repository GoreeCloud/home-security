import { z } from "zod";

export type ClassificationDefinitionMessages = {
  nameRequired: string;
  nameLength: string;
  nameOnlyNumbers: string;
  noneNotAllowed: string;
  classRequired: string;
  classesUnique: string;
  stateRequiresTwoClasses: string;
  objectLabelRequired: string;
  objectTypeRequired: string;
};

/**
 * Preserve the original state/object classifier creation rules, including
 * field-specific errors and case-insensitive duplicate class detection.
 */
export function createClassificationDefinitionSchema(
  messages: ClassificationDefinitionMessages,
) {
  return z
    .object({
      modelName: z
        .string()
        .min(1, messages.nameRequired)
        .max(64, messages.nameLength)
        .refine((value) => !/^\d+$/.test(value), {
          message: messages.nameOnlyNumbers,
        }),
      modelType: z.enum(["state", "object"]),
      objectLabel: z.string().optional(),
      objectType: z.enum(["sub_label", "attribute"]).optional(),
      classes: z
        .array(
          z.string().refine(
            (value) => value.trim().toLowerCase() !== "none",
            messages.noneNotAllowed,
          ),
        )
        .min(1, messages.classRequired)
        .refine(
          (classes) => classes.filter((value) => value.trim().length > 0).length >= 1,
          { message: messages.classRequired },
        )
        .refine(
          (classes) => {
            const nonEmpty = classes.filter((value) => value.trim().length > 0);
            return (
              new Set(nonEmpty.map((value) => value.toLowerCase())).size ===
              nonEmpty.length
            );
          },
          { message: messages.classesUnique },
        ),
    })
    .refine(
      (data) => {
        if (data.modelType === "state") {
          return data.classes.filter((value) => value.trim().length > 0).length >= 2;
        }
        return true;
      },
      { message: messages.stateRequiresTwoClasses, path: ["classes"] },
    )
    .refine(
      (data) => {
        if (data.modelType === "object") {
          return data.objectLabel !== undefined && data.objectLabel !== "";
        }
        return true;
      },
      { message: messages.objectLabelRequired, path: ["objectLabel"] },
    )
    .refine(
      (data) => {
        if (data.modelType === "object") {
          return data.objectType !== undefined;
        }
        return true;
      },
      { message: messages.objectTypeRequired, path: ["objectType"] },
    );
}
