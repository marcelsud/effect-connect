/**
 * Logging Processor - Logs messages passing through the pipeline
 */
import { Effect } from "effect"
import type { Processor, Message } from "../core/types.js"

export interface LoggingProcessorConfig {
  readonly level?: "debug" | "info" | "warn" | "error"
  readonly includeContent?: boolean
}

/**
 * Create a logging processor
 * Logs messages with structured information
 */
export const createLoggingProcessor = (
  config: LoggingProcessorConfig = {}
): Processor => {
  const level = config.level || "info"
  const includeContent = config.includeContent ?? true

  return {
    name: "logging-processor",
    process: (msg: Message): Effect.Effect<Message> => {
      const logData = {
        messageId: msg.id,
        correlationId: msg.correlationId,
        timestamp: msg.timestamp,
        metadata: msg.metadata,
        ...(includeContent ? { content: msg.content } : {}),
      }

      const logMessage = `Processing message: ${JSON.stringify(logData, null, 2)}`

      // Choose appropriate log level
      const logEffect =
        level === "debug"
          ? Effect.logDebug(logMessage)
          : level === "warn"
            ? Effect.logWarning(logMessage)
            : level === "error"
              ? Effect.logError(logMessage)
              : Effect.log(logMessage)

      return Effect.gen(function* () {
        yield* logEffect
        return msg
      })
    },
  }
}
