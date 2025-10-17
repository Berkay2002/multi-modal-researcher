# Studio

<Warning>
  **Alpha Notice:** These docs cover the [**v1-alpha**](/oss/javascript/releases/langchain-v1) release. Content is incomplete and subject to change.

For the latest stable version, see the current [LangGraph Python](https://langchain-ai.github.io/langgraph/) or [LangGraph JavaScript](https://langchain-ai.github.io/langgraphjs/) docs.
</Warning>

This guide will walk you through how to use **Studio** to visualize, interact, and debug your agent locally.

Studio is our free-to-use, powerful agent IDE that integrates with [LangSmith](/langsmith/home) to enable tracing, evaluation, and prompt engineering. See exactly how your agent thinks, trace every decision, and ship smarter, more reliable agents.

<Frame>
  <iframe className="w-full aspect-video rounded-xl" src="https://www.youtube.com/embed/Mi1gSlHwZLM?si=zA47TNuTC5aH0ahd" title="Studio" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
</Frame>

## Prerequisites

Before you begin, ensure you have the following:

- An API key for [LangSmith](https://smith.langchain.com/settings) (free to sign up)

## Setup local LangGraph server

### 1. Install the LangGraph CLI

```shell theme={null}
# Python >= 3.11 is required.
pip install --upgrade "langgraph-cli[inmem]"
```

### 2. Prepare your agent

We'll use the following simple agent as an example:

```python title="agent.py" theme={null}
from langchain.agents import create_agent

model = ChatOpenAI(model="gpt-4o")

def send_email(to: str, subject: str, body: str):
    """Send an email"""
    email = {
        "to": to,
        "subject": subject,
        "body": body
    }
    # ... email sending logic

    return f"Email sent to {to}"

agent = create_agent(
    "openai:gpt-4o",
    tools=[send_email],
    prompt="You are an email assistant. Always use the send_email tool.",
)
```

### 3. Environment variables

Create a `.env` file in the root of your project and fill in the necessary API keys. We'll need to set the `LANGSMITH_API_KEY` environment variable to the API key you get from [LangSmith](https://smith.langchain.com/settings).

<Warning>
  Be sure not to commit your `.env` to version control systems such as Git!
</Warning>

```bash .env theme={null}
LANGSMITH_API_KEY=lsv2...
```

### 4. Create a LangGraph config file

Inside your app's directory, create a configuration file `langgraph.json`:

```json title="langgraph.json" theme={null}
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./src/agent.py:agent"
  },
  "env": ".env"
}
```

[`create_agent`](https://reference.langchain.com/python/langchain/agents/#langchain.agents.create_agent) automatically returns a compiled LangGraph graph that we can pass to the `graphs` key in our configuration file.

<Info>
  See the [LangGraph configuration file reference](/langsmith/cli#configuration-file) for detailed explanations of each key in the JSON object of the configuration file.
</Info>

So far, our project structure looks like this:

```bash theme={null}
my-app/
├── src
│   └── agent.py
├── .env
└── langgraph.json
```

### 5. Install dependencies

In the root of your new LangGraph app, install the dependencies:

<CodeGroup>
  ```shell pip theme={null}
  pip install -e .
  ```

```shell uv theme={null}
uv sync
```

</CodeGroup>

### 6. View your agent in Studio

Start your LangGraph server:

```shell theme={null}
langgraph dev
```

<Warning>
  Safari blocks `localhost` connections to Studio. To work around this, run the above command with `--tunnel` to access Studio via a secure tunnel.
</Warning>

Your agent will be accessible via API (`http://127.0.0.1:2024`) and the Studio UI `https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024`:

<Frame>
    <img src="https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=ebd259e9fa24af7d011dfcc568f74be2" alt="Agent view in the Studio UI" data-og-width="2836" width="2836" data-og-height="1752" height="1752" data-path="oss/images/studio_create-agent.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?w=280&fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=cf9c05bdd08661d4d546c540c7a28cbe 280w, https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?w=560&fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=484b2fd56957d048bd89280ce97065a0 560w, https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?w=840&fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=92991302ac24604022ab82ac22729f68 840w, https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?w=1100&fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=ed366abe8dabc42a9d7c300a591e1614 1100w, https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?w=1650&fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=d5865d3c4b0d26e9d72e50d474547a63 1650w, https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?w=2500&fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=6b254add2df9cc3c10ac0c2bcb3a589c 2500w" />
</Frame>

Studio makes each step of your agent easily observable. Replay any input and inspect the exact prompt, tool arguments, return values, and token/latency metrics. If a tool throws an exception, Studio records it with surrounding state so you can spend less time debugging.

Keep your dev server running, edit prompts or tool signatures, and watch Studio hot-reload. Re-run the conversation thread from any step to verify behavior changes. See [Manage threads](/langsmith/use-studio#edit-thread-history) for more details.

As your agent grows, the same view scales from a single-tool demo to multi-node graphs, keeping decisions legible and reproducible.

<Tip>
  For an in-depth look at Studio, check out the [overview page](/langsmith/studio).
</Tip>

---

<Callout icon="pen-to-square" iconType="regular">
  [Edit the source of this page on GitHub](https://github.com/langchain-ai/docs/edit/main/src/oss/langgraph/studio.mdx)
</Callout>
