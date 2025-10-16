import type { AIMessage } from "@langchain/core/messages";
import type {
  GroundingChunk,
  GroundingMetadata,
  GroundingSupport,
} from "@google/generative-ai";

export type SourceSummary = {
  index: number;
  title: string;
  uri: string;
};

export type SupportSummary = {
  snippet: string;
  sourceNumbers: number[];
};

export type GeminiExtraction = {
  text: string;
  sourcesText: string;
  sources: SourceSummary[];
  supports: SupportSummary[];
};

type GroundingChunkLike = Partial<GroundingChunk> & {
  web?: GroundingChunk["web"];
};

type GroundingSupportLike = Partial<GroundingSupport> & {
  groundingChunckIndices?: number[];
  groundingChunkIndices?: number[];
};

const toSourceSummary = (
  chunk: GroundingChunkLike,
  index: number,
): SourceSummary | null => {
  const title = chunk.web?.title ?? "";
  const uri = chunk.web?.uri ?? "";

  if (!title && !uri) {
    return null;
  }

  return {
    index: index + 1,
    title: title || "No title",
    uri: uri || "No URI",
  };
};

const toSupportSummary = (
  support: GroundingSupportLike,
): SupportSummary | null => {
  const indices =
    support.groundingChunkIndices ??
    support.groundingChunckIndices ??
    undefined;
  if (!indices || indices.length === 0) {
    return null;
  }

  const snippetText = typeof support.segment === "string" ? support.segment : "";
  const trimmed = snippetText.trim();
  if (!trimmed) {
    return null;
  }

  return {
    snippet: trimmed.length > 100 ? `${trimmed.slice(0, 100)}...` : trimmed,
    sourceNumbers: indices.map((value) => value + 1),
  };
};

const extractGroundingMetadata = (
  message: AIMessage,
): Partial<GroundingMetadata> | null => {
  const metadata = message.response_metadata;
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const maybeGrounding =
    (metadata as { groundingMetadata?: Partial<GroundingMetadata> })
      .groundingMetadata ?? null;
  if (!maybeGrounding || typeof maybeGrounding !== "object") {
    return null;
  }

  return maybeGrounding;
};

export const extractGeminiResponse = (message: AIMessage): GeminiExtraction => {
  const text = message.text.trim();
  const metadata = extractGroundingMetadata(message);

  if (!metadata) {
    return {
      text,
      sourcesText: "",
      sources: [],
      supports: [],
    };
  }

  const sources: SourceSummary[] =
    metadata.groundingChunks
      ?.map((chunk, index) => toSourceSummary(chunk, index))
      .filter((entry): entry is SourceSummary => Boolean(entry)) ?? [];

  const supports: SupportSummary[] =
    metadata.groundingSupports
      ?.map((support) => toSupportSummary(support))
      .filter((entry): entry is SupportSummary => Boolean(entry)) ?? [];

  const sourcesText =
    sources.length > 0
      ? sources
          .map(
            (source) =>
              `${source.index}. ${source.title}\n   ${source.uri}`,
          )
          .join("\n")
      : "";

  return {
    text,
    sourcesText,
    sources,
    supports,
  };
};
