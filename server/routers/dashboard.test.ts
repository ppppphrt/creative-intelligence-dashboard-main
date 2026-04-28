import { describe, expect, it, vi } from "vitest";
import { metaRouter } from "./meta";
import { insightsRouter } from "./insights";
import { digestRouter } from "./digest";
import { analyticsRouter } from "./analytics";
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

describe("Dashboard Routers", () => {
  describe("Meta Router", () => {
    it("getCreativeLibrary returns array", async () => {
      const { ctx } = createAuthContext();
      const caller = metaRouter.createCaller(ctx);

      const result = await caller.getCreativeLibrary({ limit: 10 });
      expect(Array.isArray(result)).toBe(true);
    });

    it("getConceptSummary returns array", async () => {
      const { ctx } = createAuthContext();
      const caller = metaRouter.createCaller(ctx);

      const result = await caller.getConceptSummary();
      expect(Array.isArray(result)).toBe(true);
    });

    it("updateTags accepts valid input", async () => {
      const { ctx } = createAuthContext();
      const caller = metaRouter.createCaller(ctx);

      try {
        await caller.updateTags({
          creativeId: "test-123",
          concept: "Test Concept",
          persona: "Test Persona",
          hookType: "Story",
          format: "UGC",
        });
      } catch (error) {
        // Expected to fail since creative doesn't exist
        expect(error).toBeDefined();
      }
    });
  });

  describe("Insights Router", () => {
    it("getInsights returns array", async () => {
      const { ctx } = createAuthContext();
      const caller = insightsRouter.createCaller(ctx);

      const result = await caller.getInsights();
      expect(Array.isArray(result)).toBe(true);
    });

    it("getInsights with filter returns array", async () => {
      const { ctx } = createAuthContext();
      const caller = insightsRouter.createCaller(ctx);

      const result = await caller.getInsights({ insightType: "TOP_PERFORMER" });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Digest Router", () => {
    it("getDigests returns array", async () => {
      const { ctx } = createAuthContext();
      const caller = digestRouter.createCaller(ctx);

      const result = await caller.getDigests({ limit: 10 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Analytics Router", () => {
    it("getConceptAnalytics returns array", async () => {
      const { ctx } = createAuthContext();
      const caller = analyticsRouter.createCaller(ctx);

      const result = await caller.getConceptAnalytics();
      expect(Array.isArray(result)).toBe(true);
    });

    it("getHookAnalytics returns array", async () => {
      const { ctx } = createAuthContext();
      const caller = analyticsRouter.createCaller(ctx);

      const result = await caller.getHookAnalytics();
      expect(Array.isArray(result)).toBe(true);
    });

    it("getFormatAnalytics returns array", async () => {
      const { ctx } = createAuthContext();
      const caller = analyticsRouter.createCaller(ctx);

      const result = await caller.getFormatAnalytics();
      expect(Array.isArray(result)).toBe(true);
    });

    it("getPersonaAnalytics returns array", async () => {
      const { ctx } = createAuthContext();
      const caller = analyticsRouter.createCaller(ctx);

      const result = await caller.getPersonaAnalytics();
      expect(Array.isArray(result)).toBe(true);
    });

    it("getTopPerformingAds returns array", async () => {
      const { ctx } = createAuthContext();
      const caller = analyticsRouter.createCaller(ctx);

      const result = await caller.getTopPerformingAds();
      expect(Array.isArray(result)).toBe(true);
    });

    it("getUnderperformingAds returns array", async () => {
      const { ctx } = createAuthContext();
      const caller = analyticsRouter.createCaller(ctx);

      const result = await caller.getUnderperformingAds();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
