import { describe, expect, it } from "vitest";
import { decidePersonalAccess } from "./access";

const protectedConfig = {
  username: "hibi",
  password: "long-random-password",
  allowUnauthenticated: false,
};

function basic(username: string, password: string) {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

describe("personal access protection", () => {
  it("allows local development when explicitly configured as unauthenticated", () => {
    expect(
      decidePersonalAccess(null, {
        allowUnauthenticated: true,
      }),
    ).toBe("allow");
  });

  it("fails closed when production credentials are missing or partial", () => {
    expect(
      decidePersonalAccess(null, {
        allowUnauthenticated: false,
      }),
    ).toBe("misconfigured");
    expect(
      decidePersonalAccess(null, {
        username: "hibi",
        allowUnauthenticated: false,
      }),
    ).toBe("misconfigured");
  });

  it("challenges missing and incorrect credentials", () => {
    expect(decidePersonalAccess(null, protectedConfig)).toBe("unauthorized");
    expect(
      decidePersonalAccess(basic("hibi", "wrong"), protectedConfig),
    ).toBe("unauthorized");
  });

  it("accepts matching credentials including a colon in the password", () => {
    expect(
      decidePersonalAccess(basic("hibi", "long-random-password"), protectedConfig),
    ).toBe("allow");
    expect(
      decidePersonalAccess(basic("hibi", "pass:word"), {
        ...protectedConfig,
        password: "pass:word",
      }),
    ).toBe("allow");
  });
});
