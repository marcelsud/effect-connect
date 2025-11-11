/**
 * Pipeline Builder - Constructs pipeline from configuration
 */
import { Effect } from "effect"
import type { PipelineConfig, InputConfig, ProcessorConfig, OutputConfig } from "./config-loader.js"
import type { Pipeline, Input, Processor, Output } from "./types.js"
import { createSqsInput } from "../inputs/sqs-input.js"
import { createRedisStreamsInput } from "../inputs/redis-streams-input.js"
import { createMetadataProcessor } from "../processors/metadata-processor.js"
import { createUppercaseProcessor } from "../processors/uppercase-processor.js"
import { createLoggingProcessor } from "../processors/logging-processor.js"
import { createMappingProcessor } from "../processors/mapping-processor.js"
import { createRedisStreamsOutput } from "../outputs/redis-streams-output.js"
import { createSqsOutput } from "../outputs/sqs-output.js"

export class BuildError {
  readonly _tag = "BuildError"
  constructor(readonly message: string) {}
}

/**
 * Build input from configuration (Bento style)
 */
const buildInput = (config: InputConfig): Effect.Effect<Input<any>, BuildError> => {
  if (config.aws_sqs) {
    return Effect.succeed(
      createSqsInput({
        queueUrl: config.aws_sqs.url,
        region: config.aws_sqs.region,
        endpoint: config.aws_sqs.endpoint,
        waitTimeSeconds: config.aws_sqs.wait_time_seconds,
        maxMessages: config.aws_sqs.max_number_of_messages,
      })
    )
  }

  if (config.redis_streams) {
    // Parse redis URL (redis://host:port or redis://localhost:6379)
    const url = config.redis_streams.url
    let host = "localhost"
    let port = 6379
    let password: string | undefined
    let db: number | undefined

    try {
      const urlObj = new URL(url)
      host = urlObj.hostname || "localhost"
      port = urlObj.port ? parseInt(urlObj.port, 10) : 6379
      password = urlObj.password || undefined
      // Extract db from pathname if present (redis://host:port/2)
      const pathMatch = urlObj.pathname.match(/^\/(\d+)/)
      if (pathMatch) {
        db = parseInt(pathMatch[1], 10)
      }
    } catch {
      // If URL parsing fails, keep defaults
    }

    return Effect.succeed(
      createRedisStreamsInput({
        host,
        port,
        stream: config.redis_streams.stream,
        password,
        db,
        mode: config.redis_streams.mode,
        consumerGroup: config.redis_streams.consumer_group,
        consumerName: config.redis_streams.consumer_name,
        blockMs: config.redis_streams.block_ms,
        count: config.redis_streams.count,
        startId: config.redis_streams.start_id,
      })
    )
  }

  return Effect.fail(new BuildError("No valid input configuration found"))
}

/**
 * Build processor from configuration (Bento style)
 */
const buildProcessor = (config: ProcessorConfig): Effect.Effect<Processor<any>, BuildError> => {
  if (config.metadata) {
    return Effect.succeed(
      createMetadataProcessor({
        correlationIdField: config.metadata.correlation_id_field,
        addTimestamp: config.metadata.add_timestamp,
      })
    )
  }

  if (config.uppercase) {
    if (!config.uppercase.fields) {
      return Effect.fail(new BuildError("Uppercase processor requires 'fields' configuration"))
    }
    return Effect.succeed(
      createUppercaseProcessor({
        fields: config.uppercase.fields,
      })
    )
  }

  if (config.log) {
    return Effect.succeed(
      createLoggingProcessor({
        level: config.log.level,
        includeContent: config.log.include_content,
      })
    )
  }

  if (config.mapping) {
    return Effect.succeed(
      createMappingProcessor({
        expression: config.mapping.expression,
      })
    )
  }

  return Effect.fail(new BuildError("No valid processor configuration found"))
}

/**
 * Build output from configuration (Bento style)
 */
const buildOutput = (config: OutputConfig): Effect.Effect<Output<any>, BuildError> => {
  if (config.redis_streams) {
    // Parse redis URL (redis://host:port or redis://localhost:6379)
    const url = config.redis_streams.url
    let host = "localhost"
    let port = 6379
    let password: string | undefined
    let db: number | undefined

    try {
      const urlObj = new URL(url)
      host = urlObj.hostname || "localhost"
      port = urlObj.port ? parseInt(urlObj.port, 10) : 6379
      password = urlObj.password || undefined
      // Extract db from pathname if present (redis://host:port/2)
      const pathMatch = urlObj.pathname.match(/^\/(\d+)/)
      if (pathMatch) {
        db = parseInt(pathMatch[1], 10)
      }
    } catch {
      // If URL parsing fails, keep defaults
    }

    return Effect.succeed(
      createRedisStreamsOutput({
        host,
        port,
        stream: config.redis_streams.stream,
        maxLen: config.redis_streams.max_length,
        password,
        db,
      })
    )
  }

  if (config.aws_sqs) {
    return Effect.succeed(
      createSqsOutput({
        queueUrl: config.aws_sqs.url,
        region: config.aws_sqs.region,
        endpoint: config.aws_sqs.endpoint,
        maxBatchSize: config.aws_sqs.max_batch_size,
        delaySeconds: config.aws_sqs.delay_seconds,
      })
    )
  }

  return Effect.fail(new BuildError("No valid output configuration found"))
}

/**
 * Build complete pipeline from configuration (Bento style)
 */
export const buildPipeline = (config: PipelineConfig): Effect.Effect<Pipeline<any>, BuildError> => {
  return Effect.gen(function* () {
    const input = yield* buildInput(config.input)

    const processorConfigs = config.pipeline?.processors || []
    const processors = yield* Effect.forEach(
      processorConfigs,
      buildProcessor,
      { concurrency: 1 }
    )

    const output = yield* buildOutput(config.output)

    // Generate name from input and output types
    const inputType = config.input.aws_sqs ? "aws_sqs" :
                     config.input.redis_streams ? "redis_streams" :
                     "unknown"
    const outputType = config.output.redis_streams ? "redis_streams" :
                      config.output.aws_sqs ? "aws_sqs" :
                      "unknown"

    return {
      name: `${inputType}-to-${outputType}`,
      input,
      processors,
      output,
    }
  })
}
