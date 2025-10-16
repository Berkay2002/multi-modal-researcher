import type {
  Content,
  GenerateContentRequest,
  GenerationConfig,
} from "@google/generative-ai";
import { Buffer } from "node:buffer";
import { Configuration } from "../configuration";
import { writeWaveFile } from "./audio";
import { createChatModel, getGenerativeModel } from "./google";

type AudioGenerationConfig = GenerationConfig & {
  responseModalities?: ["AUDIO"];
};

type PrebuiltVoiceConfig = {
  prebuiltVoiceConfig: {
    voiceName: string;
  };
};

type SpeakerVoiceConfig = {
  speaker: string;
  voiceConfig: PrebuiltVoiceConfig;
};

type MultiSpeakerVoiceConfig = {
  speakerVoiceConfigs: SpeakerVoiceConfig[];
};

type SpeechConfig = {
  multiSpeakerVoiceConfig: MultiSpeakerVoiceConfig;
};

type AudioGenerateContentRequest = GenerateContentRequest & {
  generationConfig?: AudioGenerationConfig;
  speechConfig: SpeechConfig;
};

type PodcastDiscussionArgs = {
  topic: string;
  searchText: string;
  videoText: string;
  searchSourcesText: string;
  videoUrl: string | null;
  filename?: string;
  configuration?: Configuration;
};

type PodcastDiscussionResult = {
  script: string;
  filename: string;
};

type ResearchReportArgs = {
  topic: string;
  searchText: string;
  videoText: string;
  searchSourcesText: string;
  videoUrl: string | null;
  configuration?: Configuration;
};

type ResearchReportResult = {
  report: string;
  synthesis: string;
};

const sanitizeTopicForFilename = (topic: string): string => {
  const normalized = topic.replace(/[^a-zA-Z0-9 \-_]/g, " ").trim();
  const fallback = normalized.length > 0 ? normalized : "podcast";
  return `research_podcast_${fallback.replace(/\s+/g, "_")}.wav`;
};

const buildPodcastPrompt = (args: PodcastDiscussionArgs): string => {
  return [
    `Create a natural, engaging podcast conversation between Dr. Sarah (research expert) and Mike (curious interviewer) about "${args.topic}".`,
    "",
    "Use this research content:",
    "",
    "SEARCH FINDINGS:",
    args.searchText,
    "",
    "VIDEO INSIGHTS:",
    args.videoText,
    "",
    "Format as a dialogue with:",
    "- Mike introducing the topic and asking questions",
    "- Dr. Sarah explaining key concepts and insights",
    "- Natural back-and-forth discussion (5-7 exchanges)",
    "- Mike asking follow-up questions",
    "- Dr. Sarah synthesizing the main takeaways",
    "- Keep it conversational and accessible (3-4 minutes when spoken)",
    "",
    "Format exactly like this:",
    "Mike: [opening question]",
    "Dr. Sarah: [expert response]",
    "Mike: [follow-up]",
    "Dr. Sarah: [explanation]",
    "[continue...]",
  ].join("\n");
};

const buildTtsPrompt = (script: string): string => {
  return `TTS the following conversation between Mike and Dr. Sarah:\n${script}`;
};

const createAudioRequest = (
  prompt: string,
  configuration: Configuration,
): AudioGenerateContentRequest => {
  const generationConfig: AudioGenerationConfig = {
    responseModalities: ["AUDIO"],
  };

  const speechConfig: SpeechConfig = {
    multiSpeakerVoiceConfig: {
      speakerVoiceConfigs: [
        {
          speaker: "Mike",
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: configuration.mikeVoice,
            },
          },
        },
        {
          speaker: "Dr. Sarah",
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: configuration.sarahVoice,
            },
          },
        },
      ],
    },
  };

  const contents: Content[] = [
    {
      role: "user",
      parts: [
        {
          text: prompt,
        },
      ],
    },
  ];

  return {
    contents,
    generationConfig,
    speechConfig,
  };
};

const generatePodcastScript = async (
  args: PodcastDiscussionArgs,
  configuration: Configuration,
): Promise<string> => {
  const model = createChatModel({
    model: configuration.synthesisModel,
    temperature: configuration.podcastScriptTemperature,
  });

  const prompt = buildPodcastPrompt(args);
  const response = await model.invoke(prompt);
  return response.text.trim();
};

const generatePodcastAudio = async (
  script: string,
  filePath: string,
  configuration: Configuration,
): Promise<void> => {
  const model = getGenerativeModel({
    model: configuration.ttsModel,
  });

  const request = createAudioRequest(buildTtsPrompt(script), configuration);
  const response = await model.generateContent(request);
  const candidate = response.response.candidates?.[0];
  const part = candidate?.content?.parts?.find(
    (item) => "inlineData" in item && item.inlineData?.data,
  );

  const audioData = part?.inlineData?.data;
  if (!audioData) {
    throw new Error("Google Generative AI did not return audio data.");
  }

  const audioBuffer = Buffer.from(audioData, "base64");
  await writeWaveFile(filePath, audioBuffer, {
    channels: configuration.ttsChannels,
    sampleRate: configuration.ttsRate,
    sampleWidth: configuration.ttsSampleWidth,
  });
};

export const createPodcastDiscussion = async (
  args: PodcastDiscussionArgs,
): Promise<PodcastDiscussionResult> => {
  const configuration = args.configuration ?? new Configuration();
  const fileName = args.filename ?? sanitizeTopicForFilename(args.topic);

  const script = await generatePodcastScript(args, configuration);
  await generatePodcastAudio(script, fileName, configuration);

  return {
    script,
    filename: fileName,
  };
};

export const createResearchReport = async (
  args: ResearchReportArgs,
): Promise<ResearchReportResult> => {
  const configuration = args.configuration ?? new Configuration();
  const model = createChatModel({
    model: configuration.synthesisModel,
    temperature: configuration.synthesisTemperature,
  });

  const prompt = [
    `You are a research analyst. I have gathered information about "${args.topic}" from two sources:`,
    "",
    "SEARCH RESULTS:",
    args.searchText,
    "",
    "VIDEO CONTENT:",
    args.videoText,
    "",
    "Please create a comprehensive synthesis that:",
    "1. Identifies key themes and insights from both sources",
    "2. Highlights any complementary or contrasting perspectives",
    "3. Provides an overall analysis of the topic based on this multi-modal research",
    "4. Keep it concise but thorough (3-4 paragraphs)",
    "",
    "Focus on creating a coherent narrative that brings together the best insights from both sources.",
  ].join("\n");

  const response = await model.invoke(prompt);
  const synthesis = response.text.trim();

  const reportLines = [
    `# Research Report: ${args.topic}`,
    "",
    "## Executive Summary",
    "",
    synthesis,
    "",
    "## Video Source",
    `- **URL**: ${args.videoUrl ?? "No video provided"}`,
    "",
    "## Additional Sources",
    args.searchSourcesText || "Sources unavailable.",
    "",
    "---",
    "*Report generated using multi-modal AI research combining web search and video analysis*",
  ];

  return {
    report: reportLines.join("\n"),
    synthesis,
  };
};
