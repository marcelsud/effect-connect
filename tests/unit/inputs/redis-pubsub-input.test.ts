import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect } from "effect";
import { createRedisPubSubInput } from "../../../src/inputs/redis-pubsub-input.js";

// Mock ioredis
vi.mock("ioredis", () => {
  return {
    default: vi.fn(() => ({
      subscribe: vi.fn().mockResolvedValue(null),
      psubscribe: vi.fn().mockResolvedValue(null),
      unsubscribe: vi.fn().mockResolvedValue(null),
      punsubscribe: vi.fn().mockResolvedValue(null),
      quit: vi.fn().mockResolvedValue("OK"),
      on: vi.fn(),
    })),
  };
});

describe("RedisPubSubInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Configuration", () => {
    it("should create input with channels", () => {
      const input = createRedisPubSubInput({
        host: "localhost",
        port: 6379,
        channels: ["events", "notifications"],
      });

      expect(input.name).toBe("redis-pubsub-input");
      expect(input.stream).toBeDefined();
      expect(input.close).toBeDefined();
    });

    it("should create input with patterns", () => {
      const input = createRedisPubSubInput({
        host: "localhost",
        port: 6379,
        patterns: ["events:*", "logs:*"],
      });

      expect(input).toBeDefined();
    });

    it("should create input with both channels and patterns", () => {
      const input = createRedisPubSubInput({
        host: "localhost",
        port: 6379,
        channels: ["global"],
        patterns: ["user:*"],
      });

      expect(input).toBeDefined();
    });

    it("should support connection options", () => {
      const input = createRedisPubSubInput({
        host: "localhost",
        port: 6379,
        channels: ["test"],
        password: "secret",
        db: 2,
      });

      expect(input).toBeDefined();
    });

    it("should support queue size configuration", () => {
      const input = createRedisPubSubInput({
        host: "localhost",
        port: 6379,
        channels: ["test"],
        queueSize: 50,
      });

      expect(input).toBeDefined();
    });
  });

  describe("Validation", () => {
    it("should fail when neither channels nor patterns provided", () => {
      expect(() =>
        createRedisPubSubInput({
          host: "localhost",
          port: 6379,
        }),
      ).toThrow(/requires at least one channel or pattern/);
    });

    it("should fail when channels is empty array", () => {
      expect(() =>
        createRedisPubSubInput({
          host: "localhost",
          port: 6379,
          channels: [],
        }),
      ).toThrow();
    });

    it("should fail when patterns is empty array", () => {
      expect(() =>
        createRedisPubSubInput({
          host: "localhost",
          port: 6379,
          patterns: [],
        }),
      ).toThrow();
    });

    it("should validate hostname format", () => {
      expect(() =>
        createRedisPubSubInput({
          host: "",
          port: 6379,
          channels: ["test"],
        }),
      ).toThrow();
    });

    it("should validate port range", () => {
      expect(() =>
        createRedisPubSubInput({
          host: "localhost",
          port: 99999,
          channels: ["test"],
        }),
      ).toThrow();
    });

    it("should validate channel names are non-empty", () => {
      expect(() =>
        createRedisPubSubInput({
          host: "localhost",
          port: 6379,
          channels: [""],
        }),
      ).toThrow();
    });
  });

  describe("Close", () => {
    it("should have close function", async () => {
      const input = createRedisPubSubInput({
        host: "localhost",
        port: 6379,
        channels: ["test"],
      });

      expect(input.close).toBeDefined();

      if (input.close) {
        await Effect.runPromise(input.close());
      }
    });
  });
});
