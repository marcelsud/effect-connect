import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { createBranchProcessor } from "../../../src/processors/branch-processor.js";
import { createMetadataProcessor } from "../../../src/processors/metadata-processor.js";
import { createMappingProcessor } from "../../../src/processors/mapping-processor.js";
import { createMessage } from "../../../src/core/types.js";

describe("BranchProcessor", () => {
  it("should preserve original message content", async () => {
    const originalContent = { orderId: "123", amount: 100 };
    const message = createMessage(originalContent);

    const branchProcessor = createBranchProcessor({
      processors: [
        createMetadataProcessor({ addTimestamp: true }),
      ],
    });

    const result = await Effect.runPromise(branchProcessor.process(message));

    // Original content should be unchanged
    expect(result.content).toEqual(originalContent);
    expect(result.id).toBe(message.id);
  });

  it("should execute nested processors and merge result into metadata", async () => {
    const message = createMessage({ orderId: "123", amount: 100 });

    const branchProcessor = createBranchProcessor({
      processors: [
        createMetadataProcessor({ addTimestamp: true }),
        createMappingProcessor({
          expression: "$",  // Return entire content as-is
        }),
      ],
    });

    const result = await Effect.runPromise(branchProcessor.process(message));

    // Original content preserved
    expect(result.content).toEqual({ orderId: "123", amount: 100 });

    // Branch result added to metadata
    expect(result.metadata.branchResult).toBeDefined();
    // Branch should have enriched metadata
    expect(result.metadata.branchResult.metadata.processedAt).toBeDefined();
    // Branch content should be preserved
    expect(result.metadata.branchResult.content).toEqual({ orderId: "123", amount: 100 });
  });

  it("should run multiple nested processors sequentially", async () => {
    const message = createMessage({ value: 10 });

    const branchProcessor = createBranchProcessor({
      processors: [
        createMetadataProcessor(),
        createMetadataProcessor({ addTimestamp: true }),
      ],
    });

    const result = await Effect.runPromise(branchProcessor.process(message));

    // Original unchanged
    expect(result.content).toEqual({ value: 10 });

    // Branch should have both metadata processors applied
    expect(result.metadata.branchResult.metadata.processedBy).toBe("metadata-processor");
    expect(result.metadata.branchResult.metadata.processedAt).toBeDefined();
  });

  it("should isolate branch processing from original message metadata", async () => {
    const message = createMessage(
      { value: 1 },
      { existingMetadata: "original" },
    );

    const branchProcessor = createBranchProcessor({
      processors: [
        createMetadataProcessor({
          addTimestamp: true,
        }),
      ],
    });

    const result = await Effect.runPromise(branchProcessor.process(message));

    // Original metadata preserved
    expect(result.metadata.existingMetadata).toBe("original");

    // Original metadata should NOT have processedAt
    expect(result.metadata.processedAt).toBeUndefined();

    // Branch result should have processedAt in its metadata
    expect(result.metadata.branchResult.metadata.processedAt).toBeDefined();
  });
});
