/**
 * Centralized LLM model instances via Vercel AI Gateway.
 *
 * All models are authenticated automatically using Vercel's OIDC token
 * (injected at runtime inside deployed Vercel Functions). No API keys needed.
 *
 * Usage:
 *   import { defaultModel, fastModel, reasoningModel } from '@/lib/ai-gateway';
 *   import { generateText } from 'ai';
 *
 *   const { text } = await generateText({
 *     model: defaultModel,
 *     prompt: 'Hello, world!',
 *   });
 */
import { gateway } from '@ai-sdk/gateway';

/**
 * Default model for most agentic work, chat, tool use, and content generation.
 * Claude Sonnet 4.6 — great balance of quality, speed, and cost.
 */
export const defaultModel = gateway('anthropic/claude-sonnet-4-6');

/**
 * Fast + cheap model for classification, routing, short outputs, and high-volume workloads.
 * Claude Haiku 4.5 — lowest latency and cost in the Claude family.
 */
export const fastModel = gateway('anthropic/claude-haiku-4-5');

/**
 * Highest-capability model for complex reasoning, long-form analysis,
 * and multi-step problem solving. Use sparingly — more expensive than the default.
 * Claude Opus 4.6.
 */
export const reasoningModel = gateway('anthropic/claude-opus-4-6');
