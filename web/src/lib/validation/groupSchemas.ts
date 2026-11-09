import { z } from "zod";

export type GroupValidationMessages = {
  minLength: string;
  duplicate: string;
  noPeriod: string;
  invalidReservedName: string;
  iconRequired: string;
  invalidIcon: string;
};

/**
 * Original camera group form semantics with pre-save name normalization.
 * This validates group metadata only; it never grants camera access.
 */
export function createCameraGroupSchema(
  existingGroupNames: readonly string[],
  editingGroup: boolean,
  allowedIconNames: readonly string[],
  messages: GroupValidationMessages,
) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(2, { message: messages.minLength })
      .transform((value) => value.replace(/\s+/g, "_"))
      .refine(
        (value) => editingGroup || !existingGroupNames.includes(value),
        { message: messages.duplicate },
      )
      .refine((value) => !value.includes("."), {
        message: messages.noPeriod,
      })
      .refine((value) => value.toLowerCase() !== "default", {
        message: messages.invalidReservedName,
      }),
    cameras: z.array(z.string()),
    icon: z
      .string()
      .min(1, { message: messages.iconRequired })
      .refine((value) => allowedIconNames.includes(value), {
        message: messages.invalidIcon,
      }),
  });
}
