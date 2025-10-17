import type {
  GroundingChunk,
  GroundingMetadata,
  GroundingSupport,
} from "@google/generative-ai";
import type { AIMessage } from "@langchain/core/messages";

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

/** Display & formatting constants (avoid magic numbers/strings inline) */
const DISPLAY = {
  ONE_BASED_INDEX_OFFSET: 1,
  MAX_SNIPPET_CHARS: 100,
  NEWLINE: "\n",
  INDENT: "   ",
  ELLIPSIS: "...",
} as const;

/** Length/sentinel constants */
const LENGTH = {
  EMPTY: 0,
} as const;

/** Fallback labels */
const FALLBACK = {
  TITLE: "No title",
  URI: "No URI",
} as const;

const toSourceSummary = (
  chunk: GroundingChunkLike,
  index: number
): SourceSummary | null => {
  const title = chunk.web?.title ?? "";
  const uri = chunk.web?.uri ?? "";

  if (!(title || uri)) {
    return null;
  }

  return {
    index: index + DISPLAY.ONE_BASED_INDEX_OFFSET,
    title: title || FALLBACK.TITLE,
    uri: uri || FALLBACK.URI,
  };
};

const toSupportSummary = (
  support: GroundingSupportLike
): SupportSummary | null => {
  const indices =
    support.groundingChunkIndices ??
    support.groundingChunckIndices ??
    undefined;

  if (!indices || indices.length === LENGTH.EMPTY) {
    return null;
  }

  const snippetText =
    typeof support.segment === "string" ? support.segment : "";
  const trimmed = snippetText.trim();
  if (!trimmed) {
    return null;
  }

  const snippet =
    trimmed.length > DISPLAY.MAX_SNIPPET_CHARS
      ? `${trimmed.slice(0, DISPLAY.MAX_SNIPPET_CHARS)}${DISPLAY.ELLIPSIS}`
      : trimmed;

  return {
    snippet,
    sourceNumbers: indices.map(
      (value) => value + DISPLAY.ONE_BASED_INDEX_OFFSET
    ),
  };
};

const extractGroundingMetadata = (
  message: AIMessage
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
    sources.length > LENGTH.EMPTY
      ? sources
          .map(
            (source) =>
              `${source.index}. ${source.title}${DISPLAY.NEWLINE}${DISPLAY.INDENT}${source.uri}`
          )
          .join(DISPLAY.NEWLINE)
      : "";

  return {
    text,
    sourcesText,
    sources,
    supports,
  };
};
