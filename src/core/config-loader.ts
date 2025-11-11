/**
 * Configuration loader and validator using Effect Schema
 */
import { Effect, pipe } from "effect"
import { Schema as S } from "@effect/schema"
import * as yaml from "yaml"
import * as fs from "node:fs/promises"

/**
 * Custom errors for config loading
 */
export class FileReadError {
  readonly _tag = "FileReadError"
  constructor(readonly path: string, readonly cause: unknown) {}
}

export class YamlParseError {
  readonly _tag = "YamlParseError"
  constructor(readonly message: string, readonly cause?: unknown) {}
}

export class ConfigValidationError {
  readonly _tag = "ConfigValidationError"
  constructor(readonly message: string) {}
}

/**
 * Schema for AWS SQS Input configuration (Bento style)
 */
const AwsSqsInputSchema = S.Struct({
  url: S.String,
  region: S.optional(S.String),
  endpoint: S.optional(S.String),
  wait_time_seconds: S.optional(S.Number),
  max_number_of_messages: S.optional(S.Number),
})

/**
 * Schema for Redis Streams Input configuration (Bento style)
 */
const RedisStreamsInputSchema = S.Struct({
  url: S.String,  // redis://host:port format
  stream: S.String,
  mode: S.optional(S.Union(S.Literal("simple"), S.Literal("consumer-group"))),
  consumer_group: S.optional(S.String),
  consumer_name: S.optional(S.String),
  block_ms: S.optional(S.Number),
  count: S.optional(S.Number),
  start_id: S.optional(S.String),
})

/**
 * Input configuration - detects type by key
 */
const InputConfigSchema = S.Struct({
  aws_sqs: S.optional(AwsSqsInputSchema),
  redis_streams: S.optional(RedisStreamsInputSchema),
  // Future inputs can be added here:
  // http: S.optional(HttpInputSchema),
  // kafka: S.optional(KafkaInputSchema),
})

/**
 * Schema for Metadata Processor (Bento style)
 */
const MetadataProcessorSchema = S.Struct({
  correlation_id_field: S.optional(S.String),
  add_timestamp: S.optional(S.Boolean),
})

/**
 * Schema for Uppercase Processor (Bento style)
 */
const UppercaseProcessorSchema = S.Struct({
  fields: S.Array(S.String),
})

/**
 * Schema for Logging Processor (Bento style)
 */
const LogProcessorSchema = S.Struct({
  level: S.optional(S.Union(S.Literal("debug"), S.Literal("info"), S.Literal("warn"), S.Literal("error"))),
  include_content: S.optional(S.Boolean),
})

/**
 * Schema for Mapping Processor (JSONata-based transformations)
 */
const MappingProcessorSchema = S.Struct({
  expression: S.String,
})

/**
 * Processor configuration - each processor is an object with its type as key
 */
const ProcessorConfigSchema = S.Struct({
  metadata: S.optional(MetadataProcessorSchema),
  uppercase: S.optional(UppercaseProcessorSchema),
  log: S.optional(LogProcessorSchema),
  mapping: S.optional(MappingProcessorSchema),
  // Future processors can be added here:
  // filter: S.optional(FilterProcessorSchema),
})

/**
 * Schema for Redis Streams Output (Bento style)
 */
const RedisStreamsOutputSchema = S.Struct({
  url: S.String,
  stream: S.String,
  max_length: S.optional(S.Number),
})

/**
 * Schema for AWS SQS Output configuration (Bento style)
 */
const AwsSqsOutputSchema = S.Struct({
  url: S.String,
  region: S.optional(S.String),
  endpoint: S.optional(S.String),
  max_batch_size: S.optional(S.Number),
  delay_seconds: S.optional(S.Number),
})

/**
 * Output configuration - detects type by key
 */
const OutputConfigSchema = S.Struct({
  redis_streams: S.optional(RedisStreamsOutputSchema),
  aws_sqs: S.optional(AwsSqsOutputSchema),
  // Future outputs can be added here:
  // postgres: S.optional(PostgresOutputSchema),
  // http: S.optional(HttpOutputSchema),
})

/**
 * Complete pipeline configuration schema (Bento style)
 */
export const PipelineConfigSchema = S.Struct({
  input: InputConfigSchema,
  pipeline: S.optional(
    S.Struct({
      processors: S.optional(S.Array(ProcessorConfigSchema)),
    })
  ),
  output: OutputConfigSchema,
})

/**
 * TypeScript type inferred from schema
 */
export type PipelineConfig = S.Schema.Type<typeof PipelineConfigSchema>
export type InputConfig = S.Schema.Type<typeof InputConfigSchema>
export type ProcessorConfig = S.Schema.Type<typeof ProcessorConfigSchema>
export type OutputConfig = S.Schema.Type<typeof OutputConfigSchema>

/**
 * Interpolate environment variables in strings
 * Supports ${VAR_NAME} syntax
 */
export const interpolateEnvVars = (value: unknown): unknown => {
  if (typeof value === "string") {
    return value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
      return process.env[varName] || ""
    })
  }

  if (Array.isArray(value)) {
    return value.map(interpolateEnvVars)
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, interpolateEnvVars(v)])
    )
  }

  return value
}

/**
 * Load and parse YAML configuration file
 */
export const loadConfig = (
  path: string
): Effect.Effect<PipelineConfig, FileReadError | YamlParseError | ConfigValidationError> => {
  return Effect.gen(function* () {
    // Read file
    const content = yield* Effect.tryPromise({
      try: () => fs.readFile(path, "utf-8"),
      catch: (error) => new FileReadError(path, error),
    })

    // Parse YAML
    const rawConfig = yield* Effect.try({
      try: () => yaml.parse(content),
      catch: (error) =>
        new YamlParseError("Failed to parse YAML", error),
    })

    // Interpolate environment variables
    const interpolated = interpolateEnvVars(rawConfig)

    // Validate with schema
    const config = yield* pipe(
      S.decodeUnknown(PipelineConfigSchema)(interpolated),
      Effect.mapError(
        (error) =>
          new ConfigValidationError(
            `Schema validation failed: ${String(error)}`
          )
      )
    )

    return config
  })
}
