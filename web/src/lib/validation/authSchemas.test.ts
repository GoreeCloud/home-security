import { describe, expect, it } from "vitest";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createLoginSchema,
  createRoleSchema,
  createUserSchema,
  createSetPasswordSchema,
  createRoleCameraAccessSchema,
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

describe("self-service password change schema", () => {
  const schema = createSetPasswordSchema(true, {
    passwordLength: "New password is too short",
    oldPasswordRequired: "Current password is required",
    passwordsDoNotMatch: "New passwords do not match",
  });

  it("accepts the existing password and a matching synthetic new password", async () => {
    const values = {
      oldPassword: "OldSyntheticP@ss123",
      password: "NewSyntheticP@ss123",
      confirmPassword: "NewSyntheticP@ss123",
    };
    const result = await zodResolver(schema)(values, {}, options);
    expect(result.errors).toEqual({});
    expect(result.values).toEqual(values);
  });

  it("requires the existing password for self-service changes", async () => {
    const result = await zodResolver(schema)(
      {
        oldPassword: "",
        password: "NewSyntheticP@ss123",
        confirmPassword: "NewSyntheticP@ss123",
      },
      {},
      options,
    );
    expect(result.errors.oldPassword?.message).toBe(
      "Current password is required",
    );
  });

  it("rejects mismatched confirmation without leaking synthetic password values", async () => {
    const result = await zodResolver(schema)(
      {
        oldPassword: "OldSyntheticP@ss123",
        password: "NewSyntheticP@ss123",
        confirmPassword: "AnotherSyntheticP@ss123",
      },
      {},
      options,
    );
    expect(result.errors.confirmPassword?.message).toBe(
      "New passwords do not match",
    );
    expect(JSON.stringify(result.errors)).not.toContain("NewSyntheticP@ss123");
  });
});

describe("administrative password reset schema", () => {
  const schema = createSetPasswordSchema(false, {
    passwordLength: "New password is too short",
    oldPasswordRequired: "Current password is required",
    passwordsDoNotMatch: "New passwords do not match",
  });

  it("accepts a matching new password without an old-password field", async () => {
    const values = {
      password: "ResetSyntheticP@ss123",
      confirmPassword: "ResetSyntheticP@ss123",
    };
    const result = await zodResolver(schema)(values, {}, options);
    expect(result.errors).toEqual({});
    expect(result.values).toEqual(values);
  });

  it("rejects too-short passwords even during administrative resets", async () => {
    const result = await zodResolver(schema)(
      { password: "short", confirmPassword: "short" },
      {},
      options,
    );
    expect(result.errors.password?.message).toBe("New password is too short");
  });
});

describe("role camera-access selection schema", () => {
  const schema = createRoleCameraAccessSchema("Choose at least one camera");

  it("requires at least one camera to remain selected", async () => {
    const result = await zodResolver(schema)(
      { cameras: [] },
      {},
      options,
    );
    expect(result.errors.cameras?.message).toBe("Choose at least one camera");
  });

  it("accepts a synthetic camera assignment without any live device", async () => {
    const data = { cameras: ["camera-example"] };
    const result = await zodResolver(schema)(data, {}, options);
    expect(result.values).toEqual(data);
    expect(result.errors).toEqual({});
  });

  it("rejects non-string camera identifiers", () => {
    expect(schema.safeParse({ cameras: [123] }).success).toBe(false);
  });
});
