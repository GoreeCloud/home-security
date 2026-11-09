import { z } from "zod";
import {
  createOptionalZoneNumberSchema,
  createZoneInertiaSchema,
} from "./numericSchemas";

export type ZoneValidationMessages = {
  nameMinLength: string;
  matchesCameraName: string;
  alreadyExists: string;
  noPeriod: string;
  inertiaMin: string;
  loiteringMin: string;
  unfinishedPolygon: string;
  distanceMin: string;
  distanceRequired: string;
  speedMin: string;
  speedLoiteringConflict: string;
};

/**
 * Retains ZoneEditPane input/output coercion and cross-field rules, with
 * additional post-normalization length validation for blank/short zone IDs
 * and whitespace-only friendly labels. No backend mutation occurs here.
 */
export function createZoneSchema(
  enabledCameraNames: readonly string[],
  otherPolygonNames: readonly string[],
  messages: ZoneValidationMessages,
) {
  const zoneId = z
    .string()
    .min(2, { message: messages.nameMinLength })
    .transform((value) => value.trim().replace(/\s+/g, "_"))
    .refine((value) => value.length >= 2, { message: messages.nameMinLength })
    .refine((value) => !enabledCameraNames.includes(value), {
      message: messages.matchesCameraName,
    })
    .refine((value) => !otherPolygonNames.includes(value), {
      message: messages.alreadyExists,
    })
    .refine((value) => !value.includes("."), {
      message: messages.noPeriod,
    });

  const friendlyName = z
    .string()
    .min(2, { message: messages.nameMinLength })
    .refine((value) => value.trim().length >= 2, { message: messages.nameMinLength })
    .refine((value) => !enabledCameraNames.includes(value), {
      message: messages.matchesCameraName,
    })
    .refine((value) => !otherPolygonNames.includes(value), {
      message: messages.alreadyExists,
    });

  return z
    .object({
      name: zoneId,
      friendly_name: friendlyName,
      enabled: z.boolean().default(true),
      inertia: createZoneInertiaSchema(messages.inertiaMin),
      loitering_time: createOptionalZoneNumberSchema(0, messages.loiteringMin),
      isFinished: z.boolean().refine((value) => value === true, {
        message: messages.unfinishedPolygon,
      }),
      objects: z.array(z.string()).optional(),
      review_alerts: z.boolean().default(false).optional(),
      review_detections: z.boolean().default(false).optional(),
      speedEstimation: z.boolean().default(false),
      lineA: createOptionalZoneNumberSchema(0.1, messages.distanceMin),
      lineB: createOptionalZoneNumberSchema(0.1, messages.distanceMin),
      lineC: createOptionalZoneNumberSchema(0.1, messages.distanceMin),
      lineD: createOptionalZoneNumberSchema(0.1, messages.distanceMin),
      speed_threshold: createOptionalZoneNumberSchema(0.1, messages.speedMin),
    })
    .refine(
      (data) => {
        if (data.speedEstimation) {
          return !!data.lineA && !!data.lineB && !!data.lineC && !!data.lineD;
        }
        return true;
      },
      { message: messages.distanceRequired, path: ["speedEstimation"] },
    )
    .refine(
      (data) => !(
        data.speedEstimation &&
        data.loitering_time &&
        data.loitering_time > 0
      ),
      { message: messages.speedLoiteringConflict, path: ["loitering_time"] },
    );
}
