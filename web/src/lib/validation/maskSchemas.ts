import { z } from "zod";

export type MaskValidationMessages = {
  idRequired: string;
  idAlreadyExists: string;
  nameRequired: string;
  polygonMustBeFinished: string;
};

function maskNameSchema(
  currentlyEditedId: string | undefined,
  existingIds: readonly string[],
  messages: MaskValidationMessages,
) {
  return z
    .string()
    .min(1, { message: messages.idRequired })
    .refine(
      (value) =>
        (Boolean(currentlyEditedId) && value === currentlyEditedId) ||
        !existingIds.includes(value),
      { message: messages.idAlreadyExists },
    );
}

function maskCompletionSchema(messages: MaskValidationMessages) {
  return z.boolean().refine((value) => value === true, {
    message: messages.polygonMustBeFinished,
  });
}

/** Same constraints as the motion mask UI, with no camera/config dependencies. */
export function createMotionMaskSchema(
  currentlyEditedId: string | undefined,
  existingMotionMaskIds: readonly string[],
  messages: MaskValidationMessages,
) {
  return z.object({
    name: maskNameSchema(currentlyEditedId, existingMotionMaskIds, messages),
    friendly_name: z.string().min(1, { message: messages.nameRequired }),
    enabled: z.boolean(),
    isFinished: maskCompletionSchema(messages),
  });
}

/**
 * Object-mask IDs must not collide with global or per-class filter masks
 * for the same camera. The existing ID is allowed while editing.
 */
export function createObjectMaskSchema(
  currentlyEditedId: string | undefined,
  globalMaskIds: readonly string[],
  filterMaskIds: readonly string[],
  messages: MaskValidationMessages,
) {
  return z.object({
    name: maskNameSchema(
      currentlyEditedId,
      [...globalMaskIds, ...filterMaskIds],
      messages,
    ),
    friendly_name: z.string().min(1, { message: messages.nameRequired }),
    enabled: z.boolean(),
    objects: z.string(),
    isFinished: maskCompletionSchema(messages),
  });
}
