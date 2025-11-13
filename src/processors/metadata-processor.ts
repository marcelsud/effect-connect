/**
 * Metadata Processor - Adds correlation ID and metadata to messages
 */
import { Effect } from "effect";
import type { Processor, Message } from "../core/types.js";

export interface MetadataProcessorConfig {
  readonly correlationIdField?: string;
  readonly addTimestamp?: boolean;
}

/**
 * Create a metadata processor
 * Adds correlation ID and additional metadata to messages
 */
export const createMetadataProcessor = (
  config: MetadataProcessorConfig = {},
): Processor => {
  const correlationIdField = config.correlationIdField || "correlationId";
  const addTimestamp = config.addTimestamp ?? true;

  return {
    name: "metadata-processor",
    process: (msg: Message): Effect.Effect<Message> => {
      return Effect.sync(() => {
        // Generate correlation ID if not present
        const correlationId =
          msg.correlationId ||
          (msg.metadata[correlationIdField] as string) ||
          crypto.randomUUID();

        // Build additional metadata
        const additionalMetadata: Record<string, unknown> = {
          [correlationIdField]: correlationId,
          processedBy: "metadata-processor",
        };

        if (addTimestamp) {
          additionalMetadata.processedAt = new Date().toISOString();
        }

        // Return enhanced message
        return {
          ...msg,
          correlationId: correlationId as string,
          metadata: {
            ...msg.metadata,
            ...additionalMetadata,
          },
        };
      });
    },
  };
};
