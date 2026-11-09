import { z } from "zod";

export type TriggerValidationMessages = {
  minLength: string;
  invalidCharacters: string;
  alreadyExists: string;
  requiredContent: string;
  minThreshold: string;
  maxThreshold: string;
};

/**
 * Retains the existing camera-scoped trigger creation/editing constraints.
 * This is schema-only; it never creates notifications or sends camera events.
 */
export function createTriggerSchema(
  currentTriggerName: string | undefined,
  currentFriendlyName: string | undefined,
  existingNames: readonly string[],
  existingFriendlyNames: readonly string[],
  messages: TriggerValidationMessages,
) {
  return z.object({
    enabled: z.boolean(),
    name: z
      .string()
      .min(2, messages.minLength)
      .regex(/^[a-zA-Z0-9_-]+$/, messages.invalidCharacters)
      .refine(
        (value) =>
          !existingNames.includes(value) || value === currentTriggerName,
        messages.alreadyExists,
      ),
    friendly_name: z
      .string()
      .min(2, messages.minLength)
      .refine(
        (value) =>
          !existingFriendlyNames.includes(value) ||
          value === currentFriendlyName,
        messages.alreadyExists,
      ),
    type: z.enum(["thumbnail", "description"]),
    data: z.string().min(1, messages.requiredContent),
    threshold: z
      .number()
      .min(0, messages.minThreshold)
      .max(1, messages.maxThreshold),
    actions: z.array(z.enum(["notification", "sub_label", "attribute"])),
  });
}
