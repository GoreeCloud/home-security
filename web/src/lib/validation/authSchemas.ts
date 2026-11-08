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
