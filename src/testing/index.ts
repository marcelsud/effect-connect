/**
 * Testing Utilities for Effect Connect
 *
 * Provides test-only components for validating inputs, processors, and outputs
 * without N×N test explosion.
 */

export { createGenerateInput, type GenerateInputConfig, GenerateInputConfigSchema } from "./generate-input.js"
export { createCaptureOutput, type CaptureOutput, type CaptureOutputConfig } from "./capture-output.js"
export {
  createAssertProcessor,
  type AssertProcessorConfig,
  AssertProcessorConfigSchema,
  AssertProcessorError
} from "./assert-processor.js"
