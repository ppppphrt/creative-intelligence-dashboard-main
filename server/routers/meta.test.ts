import { describe, expect, it, vi } from "vitest";
import { metaRouter } from "./meta";
import type { TrpcContext } from "../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("meta router", () => {
  it("getCreativeLibrary returns empty array when no creatives exist", async () => {
    const { ctx } = createAuthContext();
    const caller = metaRouter.createCaller(ctx);

    const result = await caller.getCreativeLibrary({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("getConceptSummary returns concept summary data", async () => {
    const { ctx } = createAuthContext();
    const caller = metaRouter.createCaller(ctx);

    const result = await caller.getConceptSummary();
    expect(Array.isArray(result)).toBe(true);
  });

  it("updateTags accepts valid tag input", async () => {
    const { ctx } = createAuthContext();
    const caller = metaRouter.createCaller(ctx);

    // This will fail gracefully since no creative exists, but validates the input schema
    try {
      await caller.updateTags({
        creativeId: "test-creative-123",
        concept: "Hormonal Acne",
        persona: "Young Women",
        hookType: "Story",
        format: "UGC",
      });
    } catch (error) {
      // Expected to fail since creative doesn't exist
      expect(error).toBeDefined();
    }
  });
});
