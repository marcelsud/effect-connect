import { describe, it, expect } from "vitest";
import { createSqsInput } from "../../../src/inputs/sqs-input.js";
import { createSqsOutput } from "../../../src/outputs/sqs-output.js";
import { createRedisStreamsInput } from "../../../src/inputs/redis-streams-input.js";
import { createRedisStreamsOutput } from "../../../src/outputs/redis-streams-output.js";

describe("Configuration Validation", () => {
  describe("SQS Input", () => {
    it("should accept valid configuration", () => {
      expect(() =>
        createSqsInput({
          queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue",
          region: "us-east-1",
          maxMessages: 10,
        }),
      ).not.toThrow();
    });

    it("should reject empty queue URL", () => {
      expect(() =>
        createSqsInput({
          queueUrl: "",
          region: "us-east-1",
        }),
      ).toThrow(/Invalid SQS Input configuration/);
    });

    it("should reject invalid max messages", () => {
      expect(() =>
        createSqsInput({
          queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue",
          maxMessages: 15, // Max is 10
        }),
      ).toThrow(/Invalid SQS Input configuration/);
    });

    it("should reject negative wait time", () => {
      expect(() =>
        createSqsInput({
          queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue",
          waitTimeSeconds: -1,
        }),
      ).toThrow(/Invalid SQS Input configuration/);
    });

    it("should reject wait time > 20", () => {
      expect(() =>
        createSqsInput({
          queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue",
          waitTimeSeconds: 25,
        }),
      ).toThrow(/Invalid SQS Input configuration/);
    });

    it("should accept LocalStack endpoint", () => {
      expect(() =>
        createSqsInput({
          queueUrl: "http://localhost:4566/000000000000/test-queue",
          endpoint: "http://localhost:4566",
          region: "us-east-1",
        }),
      ).not.toThrow();
    });

    it("should accept valid max attempts", () => {
      expect(() =>
        createSqsInput({
          queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue",
          maxAttempts: 5,
        }),
      ).not.toThrow();
    });

    it("should reject invalid max attempts", () => {
      expect(() =>
        createSqsInput({
          queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue",
          maxAttempts: 15, // Max is 10
        }),
      ).toThrow(/Invalid SQS Input configuration/);
    });

    it("should accept valid timeouts", () => {
      expect(() =>
        createSqsInput({
          queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue",
          connectionTimeout: 5000,
          requestTimeout: 10000,
        }),
      ).not.toThrow();
    });

    it("should reject negative connection timeout", () => {
      expect(() =>
        createSqsInput({
          queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue",
          connectionTimeout: -100,
        }),
      ).toThrow(/Invalid SQS Input configuration/);
    });
  });

  describe("SQS Output", () => {
    it("should accept valid configuration", () => {
      expect(() =>
        createSqsOutput({
          queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue",
          region: "us-east-1",
          maxBatchSize: 5,
        }),
      ).not.toThrow();
    });

    it("should reject empty queue URL", () => {
      expect(() =>
        createSqsOutput({
          queueUrl: "",
          region: "us-east-1",
        }),
      ).toThrow(/Invalid SQS Output configuration/);
    });

    it("should reject invalid batch size", () => {
      expect(() =>
        createSqsOutput({
          queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue",
          maxBatchSize: 15, // Max is 10
        }),
      ).toThrow(/Invalid SQS Output configuration/);
    });

    it("should reject negative delay seconds", () => {
      expect(() =>
        createSqsOutput({
          queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue",
          delaySeconds: -1,
        }),
      ).toThrow(/Invalid SQS Output configuration/);
    });

    it("should reject delay seconds > 900", () => {
      expect(() =>
        createSqsOutput({
          queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue",
          delaySeconds: 1000,
        }),
      ).toThrow(/Invalid SQS Output configuration/);
    });

    it("should accept valid batch timeout", () => {
      expect(() =>
        createSqsOutput({
          queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue",
          maxBatchSize: 10,
          batchTimeout: 5000,
        }),
      ).not.toThrow();
    });

    it("should reject negative batch timeout", () => {
      expect(() =>
        createSqsOutput({
          queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue",
          batchTimeout: -100,
        }),
      ).toThrow(/Invalid SQS Output configuration/);
    });
  });

  describe("Redis Streams Input", () => {
    it("should accept valid configuration", () => {
      expect(() =>
        createRedisStreamsInput({
          host: "localhost",
          port: 6379,
          stream: "test-stream",
        }),
      ).not.toThrow();
    });

    it("should reject empty host", () => {
      expect(() =>
        createRedisStreamsInput({
          host: "",
          port: 6379,
          stream: "test-stream",
        }),
      ).toThrow(/Invalid Redis Streams Input configuration/);
    });

    it("should reject invalid port (too high)", () => {
      expect(() =>
        createRedisStreamsInput({
          host: "localhost",
          port: 70000,
          stream: "test-stream",
        }),
      ).toThrow(/Invalid Redis Streams Input configuration/);
    });

    it("should reject invalid port (zero)", () => {
      expect(() =>
        createRedisStreamsInput({
          host: "localhost",
          port: 0,
          stream: "test-stream",
        }),
      ).toThrow(/Invalid Redis Streams Input configuration/);
    });

    it("should reject empty stream name", () => {
      expect(() =>
        createRedisStreamsInput({
          host: "localhost",
          port: 6379,
          stream: "",
        }),
      ).toThrow(/Invalid Redis Streams Input configuration/);
    });

    it("should accept valid consumer group config", () => {
      expect(() =>
        createRedisStreamsInput({
          host: "localhost",
          port: 6379,
          stream: "test-stream",
          mode: "consumer-group",
          consumerGroup: "my-group",
          consumerName: "consumer-1",
        }),
      ).not.toThrow();
    });

    it("should reject negative block timeout", () => {
      expect(() =>
        createRedisStreamsInput({
          host: "localhost",
          port: 6379,
          stream: "test-stream",
          blockMs: -100,
        }),
      ).toThrow(/Invalid Redis Streams Input configuration/);
    });

    it("should accept valid connection timeouts", () => {
      expect(() =>
        createRedisStreamsInput({
          host: "localhost",
          port: 6379,
          stream: "test-stream",
          connectTimeout: 5000,
          commandTimeout: 3000,
          keepAlive: 30000,
        }),
      ).not.toThrow();
    });
  });

  describe("Redis Streams Output", () => {
    it("should accept valid configuration", () => {
      expect(() =>
        createRedisStreamsOutput({
          host: "localhost",
          port: 6379,
          stream: "output-stream",
        }),
      ).not.toThrow();
    });

    it("should reject empty host", () => {
      expect(() =>
        createRedisStreamsOutput({
          host: "",
          port: 6379,
          stream: "output-stream",
        }),
      ).toThrow(/Invalid Redis Streams Output configuration/);
    });

    it("should reject invalid port", () => {
      expect(() =>
        createRedisStreamsOutput({
          host: "localhost",
          port: -1,
          stream: "output-stream",
        }),
      ).toThrow(/Invalid Redis Streams Output configuration/);
    });

    it("should reject empty stream name", () => {
      expect(() =>
        createRedisStreamsOutput({
          host: "localhost",
          port: 6379,
          stream: "",
        }),
      ).toThrow(/Invalid Redis Streams Output configuration/);
    });

    it("should accept valid maxLen", () => {
      expect(() =>
        createRedisStreamsOutput({
          host: "localhost",
          port: 6379,
          stream: "output-stream",
          maxLen: 1000,
        }),
      ).not.toThrow();
    });

    it("should reject negative maxLen", () => {
      expect(() =>
        createRedisStreamsOutput({
          host: "localhost",
          port: 6379,
          stream: "output-stream",
          maxLen: -1,
        }),
      ).toThrow(/Invalid Redis Streams Output configuration/);
    });

    it("should accept valid connection config", () => {
      expect(() =>
        createRedisStreamsOutput({
          host: "localhost",
          port: 6379,
          stream: "output-stream",
          connectTimeout: 5000,
          maxRetries: 5,
          lazyConnect: true,
        }),
      ).not.toThrow();
    });
  });
});
