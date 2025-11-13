/**
 * Branch Processor - Runs nested processors while preserving original message
 *
 * The branch processor executes a nested pipeline on a copy of the message,
 * then merges the result back into the original message's metadata.
 * This is useful for API enrichment patterns where you want to preserve
 * the original message content while adding enrichment data.
 *
 * Example use case: Enrich user data from external API without modifying original message
 */
import { Effect } from "effect";
import type { Processor, Message } from "../core/types.js";

export interface BranchProcessorConfig {
  readonly processors: readonly Processor<any, any>[];
}

/**
 * Create a branch processor
 * Executes nested processors on a copy of the message, merges result into metadata
 */
export const createBranchProcessor = (
  config: BranchProcessorConfig,
): Processor<any, any> => {
  return {
    name: "branch-processor",
    process: (originalMessage: Message): Effect.Effect<Message, any, any> => {
      return Effect.gen(function* () {
        // Create a copy of the message for branch processing
        // Use JSON parse/stringify for deep clone to ensure compatibility
        const branchMessage: Message = {
          ...originalMessage,
          metadata: { ...originalMessage.metadata },
          content: JSON.parse(JSON.stringify(originalMessage.content)),
        };

        // Execute nested processors sequentially on the branch
        let processedBranchMessage: Message = branchMessage;
        for (const processor of config.processors) {
          const result: Message | Message[] = yield* processor.process(
            processedBranchMessage,
          );
          // If processor returns array, take first message (branches don't split)
          processedBranchMessage = Array.isArray(result) ? result[0] : result;
        }

        // Merge the branch result into original message metadata
        // under "branchResult" key to avoid overwriting original data
        return {
          ...originalMessage,
          metadata: {
            ...originalMessage.metadata,
            branchResult: {
              content: processedBranchMessage.content,
              metadata: processedBranchMessage.metadata,
            },
          },
        };
      });
    },
  };
};
