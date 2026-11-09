import { z } from "zod";

/** ONVIF ports arrive as text from the camera wizard, and leave as numbers. */
export function createOnvifPortSchema() {
  return z.coerce.number<number | string>().int().min(1).max(65535).optional();
}

/** Blank or null intervals remove the classifier interval override. */
export function createOptionalClassificationIntervalSchema(message: string) {
  return z
    .union([
      z.literal(""),
      z.null(),
      z.coerce
        .number<number | string>({ message })
        .int(message)
        .positive(message),
    ])
    .optional()
    .transform((value) =>
      value === "" || value === null ? undefined : value,
    );
}

/** Zone inertia is mandatory; a blank field is kept as an empty string. */
export function createZoneInertiaSchema(message: string) {
  return z.coerce
    .number<number | string>()
    .min(1, { message })
    .or(z.literal(""));
}

/** Match the zone schema's parsed numeric semantics before showing UI warnings. */
export function hasPositiveZoneLoiteringTime(
  value: string | number | undefined,
): boolean {
  const result = createOptionalZoneNumberSchema(0, "invalid").safeParse(value);
  return result.success && typeof result.data === "number" && result.data > 0;
}

/** Optional zone distances and speed thresholds use a numeric-or-blank UI. */
export function createOptionalZoneNumberSchema(
  minimum: number,
  message: string,
) {
  return z.coerce
    .number<number | string>()
    .min(minimum, { message })
    .optional()
    .or(z.literal(""));
}
