import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { createLoggingProcessor } from "../../../src/processors/logging-processor.js";
import { createMessage } from "../../../src/core/types.js";

describe("LoggingProcessor", () => {
  it("should pass through message unchanged", async () => {
    const processor = createLoggingProcessor({
      level: "info",
      includeContent: true,
    });

    const message = createMessage({ name: "test", value: 123 });

    const result = await Effect.runPromise(processor.process(message));

    expect(result).toEqual(message);
  });

  it("should process message with default config", async () => {
    const processor = createLoggingProcessor();

    const message = createMessage({ name: "test" });

    const result = await Effect.runPromise(processor.process(message));

    expect(result.id).toBe(message.id);
    expect(result.content).toEqual(message.content);
  });

  it("should process message with correlation ID", async () => {
    const processor = createLoggingProcessor({
      level: "debug",
    });

    const message = createMessage({ name: "test" }, {});
    message.correlationId = "test-correlation-123";

    const result = await Effect.runPromise(processor.process(message));

    expect(result.correlationId).toBe("test-correlation-123");
  });
});
