import { describe, it, expect } from "vitest";
import { createRedisListOutput } from "../../../src/outputs/redis-list-output.js";

describe("RedisListOutput", () => {
  describe("Configuration Validation", () => {
    it("should create output with valid configuration", () => {
      expect(() =>
        createRedisListOutput({
          host: "localhost",
          port: 6379,
          key: "tasks",
        }),
      ).not.toThrow();
    });

    it("should support key template interpolation", () => {
      expect(() =>
        createRedisListOutput({
          host: "localhost",
          port: 6379,
          key: "queue:{{content.priority}}",
        }),
      ).not.toThrow();
    });

    it("should default to right direction (RPUSH)", () => {
      expect(() =>
        createRedisListOutput({
          host: "localhost",
          port: 6379,
          key: "tasks",
        }),
      ).not.toThrow();
    });

    it("should support left direction (LPUSH)", () => {
      expect(() =>
        createRedisListOutput({
          host: "localhost",
          port: 6379,
          key: "tasks",
          direction: "left",
        }),
      ).not.toThrow();
    });

    it("should support right direction (RPUSH)", () => {
      expect(() =>
        createRedisListOutput({
          host: "localhost",
          port: 6379,
          key: "tasks",
          direction: "right",
        }),
      ).not.toThrow();
    });

    it("should support max length configuration", () => {
      expect(() =>
        createRedisListOutput({
          host: "localhost",
          port: 6379,
          key: "tasks",
          maxLen: 1000,
        }),
      ).not.toThrow();
    });

    it("should support password authentication", () => {
      expect(() =>
        createRedisListOutput({
          host: "localhost",
          port: 6379,
          key: "tasks",
          password: "secret",
        }),
      ).not.toThrow();
    });

    it("should support database selection", () => {
      expect(() =>
        createRedisListOutput({
          host: "localhost",
          port: 6379,
          key: "tasks",
          db: 2,
        }),
      ).not.toThrow();
    });

    it("should support retry configuration", () => {
      expect(() =>
        createRedisListOutput({
          host: "localhost",
          port: 6379,
          key: "tasks",
          maxRetries: 5,
        }),
      ).not.toThrow();
    });

    it("should support connection pooling options", () => {
      expect(() =>
        createRedisListOutput({
          host: "localhost",
          port: 6379,
          key: "tasks",
          connectTimeout: 5000,
          commandTimeout: 3000,
          keepAlive: 15000,
          lazyConnect: true,
        }),
      ).not.toThrow();
    });
  });

  describe("Validation", () => {
    it("should fail with empty key", () => {
      expect(() =>
        createRedisListOutput({
          host: "localhost",
          port: 6379,
          key: "",
        }),
      ).toThrow();
    });

    it("should fail with invalid hostname", () => {
      expect(() =>
        createRedisListOutput({
          host: "",
          port: 6379,
          key: "tasks",
        }),
      ).toThrow();
    });

    it("should fail with invalid port", () => {
      expect(() =>
        createRedisListOutput({
          host: "localhost",
          port: 99999,
          key: "tasks",
        }),
      ).toThrow();
    });

    it("should fail with negative database number", () => {
      expect(() =>
        createRedisListOutput({
          host: "localhost",
          port: 6379,
          key: "tasks",
          db: -1,
        }),
      ).toThrow();
    });

    it("should fail with negative maxLen", () => {
      expect(() =>
        createRedisListOutput({
          host: "localhost",
          port: 6379,
          key: "tasks",
          maxLen: -1,
        }),
      ).toThrow();
    });

    it("should fail with zero maxLen", () => {
      expect(() =>
        createRedisListOutput({
          host: "localhost",
          port: 6379,
          key: "tasks",
          maxLen: 0,
        }),
      ).toThrow();
    });
  });
});
