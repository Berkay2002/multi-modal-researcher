import { Annotation } from "@langchain/langgraph";

const nullableString = () =>
  Annotation<string | null>({
    reducer: (current, next) => {
      if (next === null && current === null) {
        return null;
      }

      return next;
    },
    default: () => null,
  });

const researchStateSpec = {
  topic: Annotation<string>,
  videoUrl: nullableString(),
  searchText: nullableString(),
  searchSourcesText: nullableString(),
  videoText: nullableString(),
  report: nullableString(),
  synthesisText: nullableString(),
  podcastScript: nullableString(),
  podcastFilename: nullableString(),
};

export const ResearchStateAnnotation = Annotation.Root(researchStateSpec);

export const ResearchInputAnnotation = Annotation.Root({
  topic: researchStateSpec.topic,
  videoUrl: researchStateSpec.videoUrl,
});

export const ResearchOutputAnnotation = Annotation.Root({
  report: researchStateSpec.report,
  podcastScript: researchStateSpec.podcastScript,
  podcastFilename: researchStateSpec.podcastFilename,
});

export type ResearchState = typeof ResearchStateAnnotation.State;
export type ResearchStateUpdate = typeof ResearchStateAnnotation.Update;
export type ResearchStateInput = typeof ResearchInputAnnotation.State;
export type ResearchStateOutput = typeof ResearchOutputAnnotation.State;
