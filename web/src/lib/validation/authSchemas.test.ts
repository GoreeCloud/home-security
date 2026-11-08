import { describe, expect, it } from "vitest";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createLoginSchema,
  createRoleSchema,
  createUserSchema,
} from "./authSchemas";

const options = {
  criteriaMode: "firstError" as const,
  fields: {},
  shouldUseNativeValidation: false,
};

const messages = {
  usernameRequired: "Username required",
  usernameOnlyInclude: "Username contains invalid symbols",
  usernameOnlyDots: "Username cannot be only dots",
  passwordLength: "Password too short",
  confirmPasswordRequired: "Confirm password",
  passwordMismatch: "Passwords do not match",
};

const validUser = {
  user: "demo.user",
  password: "SyntheticP@ss123",
  confirmPassword: "SyntheticP@ss123",
  role: "viewer",
};

describe("login validation and actual React Hook Form resolver", () => {
  const schema = createLoginSchema("Username required", "Password required");

  it("rejects blank username and password and preserves field-specific messages", async () => {
    const parsed = schema.safeParse({ user: "", password: "" });
    expect(parsed.success).toBe(false);
    const resolved = await zodResolver(schema)(
      { user: "", password: "" },
      {},
      options,
    );
    expect(resolved.values).toEqual({});
    expect(resolved.errors.user?.message).toBe("Username required");
    expect(resolved.errors.password?.message).toBe("Password required");
  });

  it("accepts a synthetic login and does not expose its password in errors", async () => {
    const data = { user: "demo.user", password: "SyntheticP@ss123" };
    const resolved = await zodResolver(schema)(data, {}, options);
    expect(resolved.errors).toEqual({});
    expect(resolved.values).toEqual(data);
  });
});

describe("user creation schema and resolver", () => {
  const schema = createUserSchema(messages);

  it("accepts a synthetic user and role", async () => {
    const result = await zodResolver(schema)(validUser, {}, options);
    expect(result.errors).toEqual({});
    expect(result.values).toEqual(validUser);
  });

  it("rejects an invalid username without exposing unrelated fields", async () => {
    const result = await zodResolver(schema)(
      { ...validUser, user: "bad/user" },
      {},
      options,
    );
    expect(result.errors.user?.message).toBe(messages.usernameOnlyInclude);
    expect(result.errors.password).toBeUndefined();
  });

  it("rejects usernames made only from dots", () => {
    const result = schema.safeParse({ ...validUser, user: "..." });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["user"]);
      expect(result.error.issues[0]?.message).toBe(messages.usernameOnlyDots);
    }
  });

  it("rejects a short password with an original localized error", async () => {
    const result = await zodResolver(schema)(
      { ...validUser, password: "short" },
      {},
      options,
    );
    expect(result.errors.password?.message).toBe(messages.passwordLength);
  });

  it("rejects missing confirmation and password mismatch on the correct field", async () => {
    const missing = await zodResolver(schema)(
      { ...validUser, confirmPassword: "" },
      {},
      options,
    );
    expect(missing.errors.confirmPassword?.message).toBe(
      messages.confirmPasswordRequired,
    );

    const mismatch = await zodResolver(schema)(
      { ...validUser, confirmPassword: "DifferentP@ss123" },
      {},
      options,
    );
    expect(mismatch.errors.confirmPassword?.message).toBe(
      messages.passwordMismatch,
    );
  });
});

describe("role creation schema and resolver", () => {
  const schema = createRoleSchema(["admin", "viewer"], {
    roleRequired: "Role required",
    roleOnlyInclude: "Role contains invalid symbols",
    roleExists: "Role already exists",
    camerasRequired: "Choose at least one camera",
  });

  it("allows a new role with a selected camera", async () => {
    const data = { role: "person.viewer", cameras: ["camera-example"] };
    const result = await zodResolver(schema)(data, {}, options);
    expect(result.values).toEqual(data);
    expect(result.errors).toEqual({});
  });

  it("rejects duplicate roles and reports the role field", async () => {
    const result = await zodResolver(schema)(
      { role: "admin", cameras: ["camera-example"] },
      {},
      options,
    );
    expect(result.errors.role?.message).toBe("Role already exists");
  });

  it("rejects roles with illegal symbols and no cameras", async () => {
    const result = await zodResolver(schema)(
      { role: "new/role", cameras: [] },
      {},
      options,
    );
    expect(result.errors.role?.message).toBe("Role contains invalid symbols");
    expect(result.errors.cameras?.message).toBe("Choose at least one camera");
  });
});
