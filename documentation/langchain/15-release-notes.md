# What's new in v1

<Warning>
  **Alpha Notice:** These docs cover the [**v1-alpha**](/oss/javascript/releases/langchain-v1) release. Content is incomplete and subject to change.

  For the latest stable version, see the v0 [LangChain Python](https://python.langchain.com/docs/introduction/) or [LangChain JavaScript](https://js.langchain.com/docs/introduction/) docs.
</Warning>

**LangChain v1 is a focused, production-ready foundation for building agents.** We've streamlined the framework around three core improvements:

<CardGroup cols={1}>
  <Card title="createAgent" icon="robot" href="#create-agent" arrow>
    A new standard way to build agents in LangChain, replacing `createReactAgent` from LangGraph with a cleaner, more powerful API.
  </Card>

  <Card title="Standard content blocks" icon="cube" href="#standard-content-blocks" arrow>
    A new `contentBlocks` property that provides unified access to modern LLM features across all providers.
  </Card>

  <Card title="Simplified package" icon="sitemap" href="#simplified-package" arrow>
    The `langchain` package has been streamlined to focus on essential building blocks for agents, with legacy functionality moved to `@langchain/classic`.
  </Card>
</CardGroup>

To upgrade,

<CodeGroup>
  ```bash npm theme={null}
  npm install langchain@next @langchain/core@next
  ```

  ```bash pnpm theme={null}
  pnpm install langchain@next @langchain/core@next
  ```

  ```bash yarn theme={null}
  yarn add langchain@next @langchain/core@next
  ```

  ```bash bun theme={null}
  bun add langchain@next @langchain/core@next
  ```
</CodeGroup>

For a complete list of changes, see the [migration guide](/oss/javascript/migrate/langchain-v1).

## `createAgent`

`createAgent` is the standard way to build agents in LangChain 1.0. It provides a simpler interface than `createReactAgent` while offering greater customization potential by using middleware.

```ts  theme={null}
import { createAgent } from "langchain";

const agent = createAgent({
  model: "anthropic:claude-sonnet-4-5-20250929",
  tools: [getWeather],
  systemPrompt: "You are a helpful assistant.",
});

const result = await agent.invoke({
  messages: [
    { role: "user", content: "What is the weather in Tokyo?" },
  ],
});

console.log(result.content);
```

Under the hood, `createAgent` is built on the basic agent loop -- calling a model, letting it choose tools to execute, and then finishing when it calls no more tools:

<div style={{ display: "flex", justifyContent: "center" }}>
  <img src="https://mintcdn.com/langchain-5e9cc07a/Tazq8zGc0yYUYrDl/oss/images/core_agent_loop.png?fit=max&auto=format&n=Tazq8zGc0yYUYrDl&q=85&s=ac72e48317a9ced68fd1be64e89ec063" alt="Core agent loop diagram" height="300" className="rounded-lg" data-og-width="300" data-og-height="268" data-path="oss/images/core_agent_loop.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/Tazq8zGc0yYUYrDl/oss/images/core_agent_loop.png?w=280&fit=max&auto=format&n=Tazq8zGc0yYUYrDl&q=85&s=a4c4b766b6678ef52a6ed556b1a0b032 280w, https://mintcdn.com/langchain-5e9cc07a/Tazq8zGc0yYUYrDl/oss/images/core_agent_loop.png?w=560&fit=max&auto=format&n=Tazq8zGc0yYUYrDl&q=85&s=111869e6e99a52c0eff60a1ef7ddc49c 560w, https://mintcdn.com/langchain-5e9cc07a/Tazq8zGc0yYUYrDl/oss/images/core_agent_loop.png?w=840&fit=max&auto=format&n=Tazq8zGc0yYUYrDl&q=85&s=6c1e21de7b53bd0a29683aca09c6f86e 840w, https://mintcdn.com/langchain-5e9cc07a/Tazq8zGc0yYUYrDl/oss/images/core_agent_loop.png?w=1100&fit=max&auto=format&n=Tazq8zGc0yYUYrDl&q=85&s=88bef556edba9869b759551c610c60f4 1100w, https://mintcdn.com/langchain-5e9cc07a/Tazq8zGc0yYUYrDl/oss/images/core_agent_loop.png?w=1650&fit=max&auto=format&n=Tazq8zGc0yYUYrDl&q=85&s=9b0bdd138e9548eeb5056dc0ed2d4a4b 1650w, https://mintcdn.com/langchain-5e9cc07a/Tazq8zGc0yYUYrDl/oss/images/core_agent_loop.png?w=2500&fit=max&auto=format&n=Tazq8zGc0yYUYrDl&q=85&s=41eb4f053ed5e6b0ba5bad2badf6d755 2500w" />
</div>

For more information, see [Agents](/oss/javascript/langchain/agents).

### Middleware

Middleware is the defining feature of `createAgent`. It makes `createAgent` highly customizable, raising the ceiling for what you can build.

Great agents require [context engineering](/oss/javascript/langchain/context-engineering): getting the right information to the model at the right time. Middleware helps you control dynamic prompts, conversation summarization, selective tool access, state management, and guardrails through a composable abstraction.

#### Prebuilt middleware

LangChain provides a few [prebuilt middlewares](/oss/javascript/langchain/middleware#built-in-middleware) for common patterns, including:

* `summarizationMiddleware`: Condense conversation history when it gets too long
* `humanInTheLoopMiddleware`: Require approval for sensitive tool calls
* `piiRedactionMiddleware`: Redact sensitive information before sending to the model

```ts  theme={null}
import {
  createAgent,
  summarizationMiddleware,
  humanInTheLoopMiddleware,
  piiRedactionMiddleware,
} from "langchain";

const agent = createAgent({
  model: "anthropic:claude-sonnet-4-5-20250929",
  tools: [readEmail, sendEmail],
  middleware: [
    piiRedactionMiddleware({ patterns: ["email", "phone", "ssn"] }),
    summarizationMiddleware({
      model: "anthropic:claude-sonnet-4-5-20250929",
      maxTokensBeforeSummary: 500,
    }),
    humanInTheLoopMiddleware({
      interruptOn: {
        sendEmail: {
          allowedDecisions: ["approve", "edit", "reject"],
        },
      },
    }),
  ] as const,
});
```

#### Custom middleware

You can also build custom middleware to fit your specific needs.

Build custom middleware by implementing any of these hooks using the `createMiddleware` function:

| Hook            | When it runs             | Use cases                               |
| --------------- | ------------------------ | --------------------------------------- |
| `beforeAgent`   | Before calling the agent | Load memory, validate input             |
| `beforeModel`   | Before each LLM call     | Update prompts, trim messages           |
| `wrapModelCall` | Around each LLM call     | Intercept and modify requests/responses |
| `wrapToolCall`  | Around each tool call    | Intercept and modify tool execution     |
| `afterModel`    | After each LLM response  | Validate output, apply guardrails       |
| `afterAgent`    | After agent completes    | Save results, cleanup                   |

<img src="https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=eb4404b137edec6f6f0c8ccb8323eaf1" alt="Middleware flow diagram" data-og-width="500" width="500" data-og-height="560" height="560" data-path="oss/images/middleware_final.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?w=280&fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=483413aa87cf93323b0f47c0dd5528e8 280w, https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?w=560&fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=41b7dd647447978ff776edafe5f42499 560w, https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?w=840&fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=e9b14e264f68345de08ae76f032c52d4 840w, https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?w=1100&fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=ec45e1932d1279b1beee4a4b016b473f 1100w, https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?w=1650&fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=3bca5ebf8aa56632b8a9826f7f112e57 1650w, https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?w=2500&fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=437f141d1266f08a95f030c2804691d9 2500w" />

Example custom middleware:

```ts  theme={null}
import { createMiddleware } from "langchain";

const contextSchema = z.object({
  userExpertise: z.enum(["beginner", "expert"]).default("beginner"),
})

const expertiseBasedToolMiddleware = createMiddleware({
  wrapModelCall: async (request, handler) => {
    const userLevel = request.runtime.context.userExpertise;
    if (userLevel === "expert") {
      const tools = [advancedSearch, dataAnalysis];
      return handler(
        request.replace("openai:gpt-5", tools)
      );
    }
    const tools = [simpleSearch, basicCalculator];
    return handler(
      request.replace("openai:gpt-5-nano", tools)
    );
  },
});

const agent = createAgent({
  model: "anthropic:claude-sonnet-4-5-20250929",
  tools: [simpleSearch, advancedSearch, basicCalculator, dataAnalysis],
  middleware: [expertiseBasedToolMiddleware],
  contextSchema,
});
```

For more information, see [the complete middleware guide](/oss/javascript/langchain/middleware).

### Built on LangGraph

Because `createAgent` is built on LangGraph, you automatically get built in support for long running and reliable agents via:

<CardGroup cols={2}>
  <Card title="Persistence" icon="database">
    Conversations automatically persist across sessions with built-in checkpointing
  </Card>

  <Card title="Streaming" icon="water">
    Stream tokens, tool calls, and reasoning traces in real-time
  </Card>

  <Card title="Human-in-the-loop" icon="hand">
    Pause agent execution for human approval before sensitive actions
  </Card>

  <Card title="Time travel" icon="clock-rotate-left">
    Rewind conversations to any point and explore alternate paths and prompts
  </Card>
</CardGroup>

You don't need to learn LangGraph to use these features—they work out of the box.

### Structured output

`createAgent` has improved structured output generation:

* **Main loop integration**: Structured output is now generated in the main loop instead of requiring an additional LLM call
* **Structured output strategy**: Models can choose between calling tools or using provider-side structured output generation
* **Cost reduction**: Eliminates extra expense from additional LLM calls

```ts  theme={null}
import { createAgent } from "langchain";
import * as z from "zod";

const weatherSchema = z.object({
  temperature: z.number(),
  condition: z.string(),
});

const agent = createAgent({
  model: "openai:gpt-4o-mini",
  tools: [getWeather],
  responseFormat: weatherSchema,
});

const result = await agent.invoke({
  messages: [
    { role: "user", content: "What is the weather in Tokyo?" },
  ],
});

console.log(result.structuredResponse);
```

**Error handling**: Control error handling via the `handleErrors` parameter to `ToolStrategy`:

* **Parsing errors**: Model generates data that doesn't match desired structure
* **Multiple tool calls**: Model generates 2+ tool calls for structured output schemas

***

## Standard content blocks

<Note>
  1.0 Alpha releases are available for most packages. Only the following currently support new content blocks:

  * `langchain`
  * `@langchain/core`
  * `@langchain/anthropic`
  * `@langchain/openai`

  Broader support for content blocks will be rolled out during the alpha period and following stable release.
</Note>

### Benefits

* **Provider agnostic**: Access reasoning traces, citations, built-in tools (web search, code interpreters, etc.), and other features using the same API regardless of provider
* **Type safe**: Full type hints for all content block types
* **Backward compatible**: Standard content can be [loaded lazily](/oss/javascript/langchain/messages#standard-content-blocks), so there are no associated breaking changes

For more information, see our guide on [content blocks](/oss/javascript/langchain/messages#content)

***

## Simplified package

LangChain v1 streamlines the `langchain` package namespace to focus on essential building blocks for agents. The package exposes only the most useful and relevant functionality:

Most of these are re-exported from `@langchain/core` for convenience, which gives you a focused API surface for building agents.

### `@langchain/classic`

Legacy functionality has moved to [`@langchain/classic`](https://www.npmjs.com/package/@langchain/classic) to keep the core package lean and focused.

#### What's in `@langchain/classic`

* Legacy chains and chain implementations
* The indexing API
* [`@langchain/community`](https://www.npmjs.com/package/@langchain/community) exports
* Other deprecated functionality

If you use any of this functionality, install [`@langchain/classic`](https://www.npmjs.com/package/@langchain/classic):

<CodeGroup>
  ```bash npm theme={null}
  npm install @langchain/classic
  ```

  ```bash pnpm theme={null}
  pnpm install @langchain/classic
  ```

  ```bash yarn theme={null}
  yarn add @langchain/classic
  ```

  ```bash bun theme={null}
  bun add @langchain/classic
  ```
</CodeGroup>

Then update your imports:

```typescript  theme={null}
import { ... } from "langchain"; // [!code --]
import { ... } from "@langchain/classic"; // [!code ++]

import { ... } from "langchain/chains"; // [!code --]
import { ... } from "@langchain/classic/chains"; // [!code ++]
```

## Reporting issues

Please report any issues discovered with 1.0 on [GitHub](https://github.com/langchain-ai/langchainjs/issues) using the [`'v1'` label](https://github.com/langchain-ai/langchainjs/issues?q=state%3Aopen%20label%3Av1).

## Additional resources

<CardGroup cols={3}>
  <Card title="LangChain 1.0" icon="rocket" href="https://blog.langchain.com/langchain-langchain-1-0-alpha-releases/">
    Read the announcement
  </Card>

  <Card title="Middleware Guide" icon="puzzle-piece" href="https://blog.langchain.com/agent-middleware/">
    Deep dive into middleware
  </Card>

  <Card title="Agents Documentation" icon="book" href="/oss/javascript/langchain/agents" arrow>
    Full agent documentation
  </Card>

  <Card title="Message Content" icon="message" href="/oss/javascript/langchain/messages#content" arrow>
    New content blocks API
  </Card>

  <Card title="Migration guide" icon="arrow-right-arrow-left" href="/oss/javascript/migrate/langchain-v1" arrow>
    How to migrate to LangChain v1
  </Card>

  <Card title="GitHub" icon="github" href="https://github.com/langchain-ai/langchain">
    Report issues or contribute
  </Card>
</CardGroup>

## See also

* [Versioning](/oss/javascript/versioning) - Understanding version numbers
* [Release policy](/oss/javascript/release-policy) - Detailed release policies

***

<Callout icon="pen-to-square" iconType="regular">
  [Edit the source of this page on GitHub](https://github.com/langchain-ai/docs/edit/main/src/oss/javascript/releases/langchain-v1.mdx)
</Callout>
