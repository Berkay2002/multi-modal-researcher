# Multi-Modal Researcher

This project is a simple research and podcast generation workflow that uses LangGraph with the unique capabilities of Google's Gemini 2.5 model family. It combines three useful features of the Gemini 2.5 model family. You can pass a research topic and, optionally, a YouTube video URL. The system will then perform research on the topic using search, analyze the video, combine the insights, and generate a report with citations as well as a short podcast on the topic for you. It takes advantage of a few of Gemini's native capabilities:

- 🎥 [Video understanding and native YouTube tool](https://developers.googleblog.com/en/gemini-2-5-video-understanding/): Integrated processing of YouTube videos
- 🔍 [Google search tool](https://developers.googleblog.com/en/gemini-2-5-thinking-model-updates/): Native Google Search tool integration with real-time web results
- 🎙️ [Multi-speaker text-to-speech](https://ai.google.dev/gemini-api/docs/speech-generation): Generate natural conversations with distinct speaker voices

![mutli-modal-researcher](https://github.com/user-attachments/assets/85067de9-3c36-47b8-ae06-29b00746036f)

## Quick Start

### Prerequisites

- Node.js 18+
- npm (bundled with Node.js)
- Google Gemini API key

### Setup

1. **Clone and navigate to the project**:
```bash
git clone https://github.com/langchain-ai/multi-modal-researcher
cd multi-modal-researcher
```

2. **Set up environment variables**:
```bash
cp .env.example .env
```
Edit `.env` and [add your Google Gemini API key](https://ai.google.dev/gemini-api/docs/api-key):
```bash
GEMINI_API_KEY=your_api_key_here
```

3. **Install dependencies**:
```bash
npm install
```

4. **Run the LangGraph development server**:
```bash
npm run dev:langgraph
```

5. **Access the application**:

LangGraph will open in your browser.

```bash
╦  ┌─┐┌┐┌┌─┐╔═╗┬─┐┌─┐┌─┐┬ ┬
║  ├─┤││││ ┬║ ╦├┬┘├─┤├─┘├─┤
╩═╝┴ ┴┘└┘└─┘╚═╝┴└─┴ ┴┴  ┴ ┴

- 🚀 API: http://127.0.0.1:2024
- 🎨 Studio UI: https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024
- 📚 API Docs: http://127.0.0.1:2024/docs
```

6. Pass a `topic` and optionally a `video_url`.

Example:
* `topic`: Give me an overview of the idea that LLMs are like a new kind of operating system.
* `video_url`: https://youtu.be/LCEmiRjPEtQ?si=raeMN2Roy5pESNG2

<img width="1604" alt="Screenshot 2025-06-24 at 5 13 31 PM" src="https://github.com/user-attachments/assets/6407e802-8932-4cfb-bdf9-5af96050ee1f" />

Result:

[🔍 See the example report](./example/report/karpathy_os.md)

[▶️ Download the example podcast](./example/audio/karpathy_os.wav)

## Architecture

The system implements a LangGraph workflow with the following nodes:

1. **Search Research Node**: Performs web search using Gemini's Google Search integration
2. **Analyze Video Node**: Analyzes YouTube videos when provided (conditional)
3. **Create Report Node**: Synthesizes findings into a comprehensive markdown report
4. **Create Podcast Node**: Generates a 2-speaker podcast discussion with TTS audio

### Workflow

```
START → search_research → [analyze_video?] → create_report → create_podcast → END
```

The workflow conditionally includes video analysis if a YouTube URL is provided, otherwise proceeds directly to report generation.

### Output

The system generates:

- **Research Report**: Comprehensive markdown report with executive summary and sources
- **Podcast Script**: Natural dialogue between Dr. Sarah (expert) and Mike (interviewer)  
- **Audio File**: Multi-speaker TTS audio file (`research_podcast_*.wav`)

## Configuration

The system supports runtime configuration through the `Configuration` class:

### Model Settings
- `search_model`: Model for web search (default: "gemini-2.5-flash")
- `synthesis_model`: Model for report synthesis (default: "gemini-2.5-flash")
- `video_model`: Model for video analysis (default: "gemini-2.5-flash")
- `tts_model`: Model for text-to-speech (default: "gemini-2.5-flash-preview-tts")

### Temperature Settings
- `search_temperature`: Factual search queries (default: 0.0)
- `synthesis_temperature`: Balanced synthesis (default: 0.3)
- `podcast_script_temperature`: Creative dialogue (default: 0.4)

### TTS Settings
- `mike_voice`: Voice for interviewer (default: "Kore")
- `sarah_voice`: Voice for expert (default: "Puck")
- Audio format settings for output quality

## Project Structure

```
├── src/
│   ├── app/                           # Next.js UI (optional companion)
│   └── server/agent/
│       ├── agent.ts                   # LangGraph workflow definition
│       ├── configuration.ts           # Runtime configuration class
│       └── utils/                     # Gemini helpers, synthesis, audio
├── langgraph.json                     # LangGraph deployment configuration
├── package.json                       # Project dependencies and scripts
└── .env                               # Environment variables
```

## Key Components

### State Management

- **ResearchInputAnnotation** / **ResearchOutputAnnotation**: Input/output schemas defined with LangGraph annotations
- **ResearchStateAnnotation**: Complete state including intermediate results used throughout the workflow

### Utility Functions

- **extractGeminiResponse()**: Normalizes Gemini model output and supporting sources
- **createPodcastDiscussion()**: Generates scripted dialogue and audio metadata
- **createResearchReport()**: Synthesizes multi-modal research into a detailed markdown report
- **getGenerativeModel() / createChatModel()**: Configure Gemini models for video and search tasks

## Deployment

The application is configured for deployment on:

- **Local Development**: Using LangGraph CLI with in-memory storage
- **LangGraph Platform**: Production deployment with persistent storage
- **Self-Hosted**: Using Docker containers

## Dependencies

Core dependencies managed via `package.json`:

- `@langchain/langgraph` - Workflow orchestration and deployment helpers
- `@langchain/google-genai` - Gemini API bindings
- `langchain` - LangChain integrations and tools
- `next`, `react`, `react-dom` - Optional Next.js UI
- `typescript` and `@types/*` - TypeScript tooling

## License

MIT License - see LICENSE file for details.
