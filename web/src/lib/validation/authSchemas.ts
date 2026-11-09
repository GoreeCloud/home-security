import { z } from "zod";

/** Source-of-truth login validation, independent of UI and network behavior. */
export function createLoginSchema(
  usernameRequired: string,
  passwordRequired: string,
) {
  return z.object({
    user: z.string().min(1, usernameRequired),
    password: z.string().min(1, passwordRequired),
  });
}

export type CreateUserMessages = {
  usernameRequired: string;
  usernameOnlyInclude: string;
  usernameOnlyDots: string;
  passwordLength: string;
  confirmPasswordRequired: string;
  passwordMismatch: string;
};

export function createUserSchema(messages: CreateUserMessages) {
  return z
    .object({
      user: z
        .string()
        .min(1, messages.usernameRequired)
        .regex(/^[A-Za-z0-9._]+$/, { message: messages.usernameOnlyInclude })
        .regex(/[^.]/, { message: messages.usernameOnlyDots }),
      password: z.string().min(12, messages.passwordLength),
      confirmPassword: z.string().min(1, messages.confirmPasswordRequired),
      role: z.string().min(1),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: messages.passwordMismatch,
      path: ["confirmPassword"],
    });
}

export type CreateRoleMessages = {
  roleRequired: string;
  roleOnlyInclude: string;
  roleExists: string;
  camerasRequired: string;
};

export function createRoleSchema(
  existingRoles: readonly string[],
  messages: CreateRoleMessages,
) {
  return z.object({
    role: z
      .string()
      .min(1, messages.roleRequired)
      .regex(/^[A-Za-z0-9._]+$/, { message: messages.roleOnlyInclude })
      .refine((role) => !existingRoles.includes(role), {
        message: messages.roleExists,
      }),
    cameras: z.array(z.string()).min(1, messages.camerasRequired),
  });
}

export type SetPasswordMessages = {
  passwordLength: string;
  oldPasswordRequired: string;
  passwordsDoNotMatch: string;
};

/** Self-service password changes require proof of the current password. */
export function createPasswordChangeSchema(messages: SetPasswordMessages) {
  return z
    .object({
      oldPassword: z.string().min(1, messages.oldPasswordRequired),
      password: z.string().min(12, messages.passwordLength),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: messages.passwordsDoNotMatch,
      path: ["confirmPassword"],
    });
}

/** Administrative password resets do not require the user's old password. */
export function createPasswordResetSchema(messages: SetPasswordMessages) {
  return z
    .object({
      password: z.string().min(12, messages.passwordLength),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: messages.passwordsDoNotMatch,
      path: ["confirmPassword"],
    });
}

/** Runtime UI branch delegates to the same explicitly typed, tested schemas. */
export function createSetPasswordSchema(
  requireOldPassword: boolean,
  messages: SetPasswordMessages,
) {
  return requireOldPassword
    ? createPasswordChangeSchema(messages)
    : createPasswordResetSchema(messages);
}

/** A role must retain at least one camera selection. */
export function createRoleCameraAccessSchema(requiredMessage: string) {
  return z.object({
    cameras: z.array(z.string()).min(1, requiredMessage),
  });
}
