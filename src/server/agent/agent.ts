import type { RunnableConfig } from "@langchain/core/runnables";
import type { Content } from "@google/generative-ai";
import { END, START, StateGraph } from "@langchain/langgraph";
import { Configuration, type ConfigurationOptions } from "./configuration";
import { createPodcastDiscussion, createResearchReport } from "./utils/content";
import { extractGeminiResponse } from "./utils/gemini";
import { createChatModel, getGenerativeModel } from "./utils/google";
import {
  ResearchInputAnnotation,
  ResearchOutputAnnotation,
  ResearchStateAnnotation,
  type ResearchState,
} from "./utils/state";

const toNullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const inferMimeType = (rawUrl: string): string => {
  try {
    const url = new URL(rawUrl);
    const extension = url.pathname.split(".").pop()?.toLowerCase();
    if (!extension) {
      return "application/octet-stream";
    }

    switch (extension) {
      case "mp4":
        return "video/mp4";
      case "mov":
        return "video/quicktime";
      case "webm":
        return "video/webm";
      case "mkv":
        return "video/x-matroska";
      default:
        return "application/octet-stream";
    }
  } catch {
    return "application/octet-stream";
  }
};

const buildGenerativeVideoRequest = (
  topic: string,
  videoUrl: string,
): { contents: Content[] } => ({
  contents: [
    {
      role: "user",
      parts: [
        {
          fileData: {
            fileUri: videoUrl,
            mimeType: inferMimeType(videoUrl),
          },
        },
        {
          text: `Based on the video content, give me an overview of this topic: ${topic}`,
        },
      ],
    },
  ],
});

const searchResearchNode = async (
  state: ResearchState,
  config?: RunnableConfig<ConfigurationOptions>,
) => {
  const configuration = Configuration.fromRunnableConfig(config);
  const model = createChatModel({
    model: configuration.searchModel,
    temperature: configuration.searchTemperature,
  });

  const response = await model.invoke(
    `Research this topic and give me an overview: ${state.topic}`,
    {
      tools: [
        {
          googleSearchRetrieval: {},
        },
      ],
    },
  );

  const { text, sourcesText } = extractGeminiResponse(response);

  return {
    searchText: toNullable(text),
    searchSourcesText: toNullable(sourcesText ?? ""),
  };
};

const analyzeVideoNode = async (
  state: ResearchState,
  config?: RunnableConfig<ConfigurationOptions>,
) => {
  const videoUrl = state.videoUrl;
  if (!videoUrl) {
    return {
      videoText: "No video provided for analysis.",
    };
  }

  const configuration = Configuration.fromRunnableConfig(config);
  const model = getGenerativeModel({
    model: configuration.videoModel,
  });

  const request = buildGenerativeVideoRequest(state.topic, videoUrl);
  const response = await model.generateContent(request);

  let videoSummary = "";
  try {
    videoSummary = response.response.text().trim();
  } catch {
    const candidate = response.response.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const textSegments = parts
      .map((part) =>
        "text" in part && typeof part.text === "string" ? part.text : "",
      )
      .filter((segment) => segment.length > 0);
    videoSummary = textSegments.join("\n").trim();
  }

  return {
    videoText: videoSummary || "The video analysis did not return any text.",
  };
};

const createReportNode = async (
  state: ResearchState,
  config?: RunnableConfig<ConfigurationOptions>,
) => {
  const configuration = Configuration.fromRunnableConfig(config);
  const { report, synthesis } = await createResearchReport({
    topic: state.topic,
    searchText: state.searchText ?? "",
    videoText: state.videoText ?? "",
    searchSourcesText: state.searchSourcesText ?? "",
    videoUrl: state.videoUrl ?? null,
    configuration,
  });

  return {
    report,
    synthesisText: synthesis,
  };
};

const createPodcastNode = async (
  state: ResearchState,
  config?: RunnableConfig<ConfigurationOptions>,
) => {
  const configuration = Configuration.fromRunnableConfig(config);
  const { script, filename } = await createPodcastDiscussion({
    topic: state.topic,
    searchText: state.searchText ?? "",
    videoText: state.videoText ?? "",
    searchSourcesText: state.searchSourcesText ?? "",
    videoUrl: state.videoUrl ?? null,
    configuration,
  });

  return {
    podcastScript: script,
    podcastFilename: filename,
  };
};

const shouldAnalyzeVideo = (state: ResearchState) => {
  return state.videoUrl ? "analyze_video" : "create_report";
};

export const createResearchGraph = () => {
  const graph = new StateGraph({
    stateSchema: ResearchStateAnnotation,
    input: ResearchInputAnnotation,
    output: ResearchOutputAnnotation,
  });

  graph.addNode("search_research", searchResearchNode);
  graph.addNode("analyze_video", analyzeVideoNode);
  graph.addNode("create_report", createReportNode);
  graph.addNode("create_podcast", createPodcastNode);
  graph.addEdge(START, "search_research");
  graph.addConditionalEdges("search_research", shouldAnalyzeVideo, {
    analyze_video: "analyze_video",
    create_report: "create_report",
  });
  graph.addEdge("analyze_video", "create_report");
  graph.addEdge("create_report", "create_podcast");
  graph.addEdge("create_podcast", END);

  return graph;
};

export const createCompiledGraph = () => {
  return createResearchGraph().compile();
};
