import { describe, it, expect, beforeAll } from "vitest";
import { Effect, Stream } from "effect";
import { createMessage } from "../../src/core/types.js";
import { createMetadataProcessor } from "../../src/processors/metadata-processor.js";
import { createUppercaseProcessor } from "../../src/processors/uppercase-processor.js";
import { createLoggingProcessor } from "../../src/processors/logging-processor.js";
import { create, run } from "../../src/core/pipeline.js";
import type { Message, Output } from "../../src/core/types.js";

describe("E2E: SQS to Redis Pipeline", () => {
  it("should process messages through complete pipeline", async () => {
    // Create mock input with test messages
    const testMessages = [
      createMessage({ name: "alice", age: 30 }),
      createMessage({ name: "bob", age: 25 }),
      createMessage({ name: "charlie", age: 35 }),
    ];

    const mockInput = {
      name: "mock-input",
      stream: Stream.fromIterable(testMessages),
    };

    // Create processors
    const metadataProcessor = createMetadataProcessor({
      correlationIdField: "correlationId",
      addTimestamp: true,
    });

    const uppercaseProcessor = createUppercaseProcessor({
      fields: ["name"],
    });

    const loggingProcessor = createLoggingProcessor({
      level: "info",
      includeContent: true,
    });

    // Create mock output that collects messages
    const processedMessages: Message[] = [];
    const mockOutput: Output = {
      name: "mock-output",
      send: (msg: Message) =>
        Effect.sync(() => {
          processedMessages.push(msg);
        }),
    };

    // Create and run pipeline
    const pipeline = create({
      name: "test-pipeline",
      input: mockInput,
      processors: [metadataProcessor, uppercaseProcessor, loggingProcessor],
      output: mockOutput,
    });

    const result = await Effect.runPromise(run(pipeline));

    // Assertions
    expect(result.success).toBe(true);
    expect(result.stats.processed).toBe(3);
    expect(result.stats.failed).toBe(0);
    expect(processedMessages).toHaveLength(3);

    // Check first message transformations
    const firstMessage = processedMessages[0];
    expect(firstMessage.content.name).toBe("ALICE"); // uppercase applied
    expect(firstMessage.content.age).toBe(30); // unchanged
    expect(firstMessage.correlationId).toBeDefined(); // metadata added
    expect(firstMessage.metadata.correlationId).toBeDefined();
    expect(firstMessage.metadata.processedAt).toBeDefined();
    expect(firstMessage.metadata.processedBy).toBe("metadata-processor");
    expect(firstMessage.metadata.uppercasedFields).toEqual(["name"]);

    // Check all messages have uppercase names
    expect(processedMessages[0].content.name).toBe("ALICE");
    expect(processedMessages[1].content.name).toBe("BOB");
    expect(processedMessages[2].content.name).toBe("CHARLIE");
  });

  it("should handle errors gracefully", async () => {
    const testMessages = [createMessage({ name: "test" })];

    const mockInput = {
      name: "mock-input",
      stream: Stream.fromIterable(testMessages),
    };

    // Output that always fails
    const mockOutput: Output = {
      name: "failing-output",
      send: () => Effect.fail(new Error("Output error")),
    };

    const pipeline = create({
      name: "failing-pipeline",
      input: mockInput,
      processors: [],
      output: mockOutput,
    });

    const result = await Effect.runPromise(run(pipeline));

    expect(result.success).toBe(false);
    expect(result.stats.failed).toBe(1);
    expect(result.stats.processed).toBe(0);
    expect(result.errors).toBeDefined();
  });
});
