/**
 * Main entry point - exports public API
 */

// Core
export * from "./core/types.js"
export * from "./core/pipeline.js"
export * from "./core/config-loader.js"
export * from "./core/pipeline-builder.js"
export * from "./core/dlq.js"
export * from "./core/errors.js"
export * from "./core/metrics.js"
export * from "./core/validation.js"

// Inputs
export * from "./inputs/sqs-input.js"
export * from "./inputs/redis-streams-input.js"
export * from "./inputs/http-input.js"

// Processors
export * from "./processors/metadata-processor.js"
export * from "./processors/uppercase-processor.js"
export * from "./processors/logging-processor.js"
export * from "./processors/mapping-processor.js"

// Outputs
export * from "./outputs/redis-streams-output.js"
export * from "./outputs/sqs-output.js"
export * from "./outputs/http-output.js"

// Testing Utilities (for building tests and examples)
export * from "./testing/index.js"
