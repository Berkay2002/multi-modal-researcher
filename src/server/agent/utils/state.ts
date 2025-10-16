import { Annotation } from "@langchain/langgraph";

const nullableString = () =>
  Annotation<string | null>({
    default: () => null,
  });

export const ResearchStateAnnotation = Annotation.Root({
  topic: Annotation<string>,
  videoUrl: nullableString(),
  searchText: nullableString(),
  searchSourcesText: nullableString(),
  videoText: nullableString(),
  report: nullableString(),
  synthesisText: nullableString(),
  podcastScript: nullableString(),
  podcastFilename: nullableString(),
});

export const ResearchInputAnnotation = Annotation.Root({
  topic: Annotation<string>,
  videoUrl: nullableString(),
});

export const ResearchOutputAnnotation = Annotation.Root({
  report: nullableString(),
  podcastScript: nullableString(),
  podcastFilename: nullableString(),
});

export type ResearchState = typeof ResearchStateAnnotation.State;
export type ResearchStateUpdate = typeof ResearchStateAnnotation.Update;
export type ResearchStateInput = typeof ResearchInputAnnotation.State;
export type ResearchStateOutput = typeof ResearchOutputAnnotation.State;
