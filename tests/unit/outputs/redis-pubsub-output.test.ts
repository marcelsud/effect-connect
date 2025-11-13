import { describe, it, expect } from "vitest";
import { createRedisPubSubOutput } from "../../../src/outputs/redis-pubsub-output.js";

describe("RedisPubSubOutput", () => {
  describe("Configuration Validation", () => {
    it("should create output with valid configuration", () => {
      expect(() =>
        createRedisPubSubOutput({
          host: "localhost",
          port: 6379,
          channel: "events",
        }),
      ).not.toThrow();
    });

    it("should support channel template interpolation", () => {
      expect(() =>
        createRedisPubSubOutput({
          host: "localhost",
          port: 6379,
          channel: "events:{{content.type}}",
        }),
      ).not.toThrow();
    });

    it("should support password authentication", () => {
      expect(() =>
        createRedisPubSubOutput({
          host: "localhost",
          port: 6379,
          channel: "events",
          password: "secret",
        }),
      ).not.toThrow();
    });

    it("should support database selection", () => {
      expect(() =>
        createRedisPubSubOutput({
          host: "localhost",
          port: 6379,
          channel: "events",
          db: 2,
        }),
      ).not.toThrow();
    });

    it("should support retry configuration", () => {
      expect(() =>
        createRedisPubSubOutput({
          host: "localhost",
          port: 6379,
          channel: "events",
          maxRetries: 5,
        }),
      ).not.toThrow();
    });

    it("should support connection pooling options", () => {
      expect(() =>
        createRedisPubSubOutput({
          host: "localhost",
          port: 6379,
          channel: "events",
          connectTimeout: 5000,
          commandTimeout: 3000,
          keepAlive: 15000,
          lazyConnect: true,
        }),
      ).not.toThrow();
    });
  });

  describe("Validation", () => {
    it("should fail with empty channel name", () => {
      expect(() =>
        createRedisPubSubOutput({
          host: "localhost",
          port: 6379,
          channel: "",
        }),
      ).toThrow();
    });

    it("should fail with invalid hostname", () => {
      expect(() =>
        createRedisPubSubOutput({
          host: "",
          port: 6379,
          channel: "events",
        }),
      ).toThrow();
    });

    it("should fail with invalid port", () => {
      expect(() =>
        createRedisPubSubOutput({
          host: "localhost",
          port: 99999,
          channel: "events",
        }),
      ).toThrow();
    });

    it("should fail with negative database number", () => {
      expect(() =>
        createRedisPubSubOutput({
          host: "localhost",
          port: 6379,
          channel: "events",
          db: -1,
        }),
      ).toThrow();
    });
  });
});
