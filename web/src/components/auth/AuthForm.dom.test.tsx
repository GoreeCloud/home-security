import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserAuthForm } from "./AuthForm";

const api = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    post: api.post,
    get: api.get,
    isAxiosError: () => false,
  },
}));

// Do not query any real backend, authenticate, render notification portals,
// or read user-specific translation and documentation settings.
vi.mock("swr", () => ({ default: () => ({ data: undefined }) }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/hooks/use-doc-domain", () => ({
  useDocDomain: () => ({ getLocaleDocUrl: () => "/docs" }),
}));
vi.mock("@/context/auth-context", async () => {
  const React = await import("react");
  return {
    AuthContext: React.createContext({ login: () => {} }),
  };
});
vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => null,
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("real login form DOM validation with synthetic, network-free inputs", () => {
  let root: ReturnType<typeof createRoot>;
  let element: HTMLDivElement;

  beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    api.post.mockReset();
    api.get.mockReset();
    element = document.createElement("div");
    document.body.appendChild(element);
    root = createRoot(element);
    await act(async () => {
      root.render(<UserAuthForm />);
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    element.remove();
  });

  it("renders two readable field errors and blocks an empty authentication request", async () => {
    const form = element.querySelector("form");
    expect(form).not.toBeNull();
    expect(element.querySelectorAll("input")).toHaveLength(2);

    await act(async () => {
      form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const alerts = Array.from(element.querySelectorAll('[role="alert"]'));
    expect(alerts.map((el) => el.textContent)).toEqual([
      "form.errors.usernameRequired",
      "form.errors.passwordRequired",
    ]);
    const inputs = Array.from(element.querySelectorAll("input"));
    expect(inputs.map((input) => input.getAttribute("aria-invalid"))).toEqual([
      "true",
      "true",
    ]);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalled();
  });
});
