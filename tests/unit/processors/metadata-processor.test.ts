import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { createMetadataProcessor } from "../../../src/processors/metadata-processor.js"
import { createMessage } from "../../../src/core/types.js"

describe("MetadataProcessor", () => {
  it("should add correlation ID to message", async () => {
    const processor = createMetadataProcessor({
      correlationIdField: "correlationId",
    })

    const message = createMessage({ test: "data" })

    const result = await Effect.runPromise(processor.process(message))

    expect(result.correlationId).toBeDefined()
    expect(result.metadata.correlationId).toBe(result.correlationId)
  })

  it("should preserve existing correlation ID", async () => {
    const processor = createMetadataProcessor({
      correlationIdField: "correlationId",
    })

    const existingCorrelationId = "existing-123"
    const message = createMessage({ test: "data" }, { correlationId: existingCorrelationId })

    const result = await Effect.runPromise(processor.process(message))

    expect(result.correlationId).toBe(existingCorrelationId)
    expect(result.metadata.correlationId).toBe(existingCorrelationId)
  })

  it("should add timestamp when configured", async () => {
    const processor = createMetadataProcessor({
      addTimestamp: true,
    })

    const message = createMessage({ test: "data" })

    const result = await Effect.runPromise(processor.process(message))

    expect(result.metadata.processedAt).toBeDefined()
    expect(typeof result.metadata.processedAt).toBe("string")
  })

  it("should add processedBy metadata", async () => {
    const processor = createMetadataProcessor()

    const message = createMessage({ test: "data" })

    const result = await Effect.runPromise(processor.process(message))

    expect(result.metadata.processedBy).toBe("metadata-processor")
  })
})
