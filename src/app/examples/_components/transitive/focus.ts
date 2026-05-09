import { transitiveData } from "./data";
import type { Journey } from "./types";

export type FocusState = {
  patternIds: Set<string>;
  stopIds: Set<string>;
  walkIds: Set<string>;
};

export function focusFromJourney(journeyId: string | null): FocusState {
  const allPatterns = new Set(transitiveData.patterns.map((p) => p.pattern_id));
  const allStops = new Set(transitiveData.stops.map((s) => s.stop_id));

  if (!journeyId) {
    return {
      patternIds: allPatterns,
      stopIds: allStops,
      walkIds: new Set(["walk-k17-farragut"]),
    };
  }

  const journey: Journey | undefined = transitiveData.journeys.find(
    (j) => j.journey_id === journeyId,
  );
  if (!journey) {
    return { patternIds: new Set(), stopIds: new Set(), walkIds: new Set() };
  }

  const patternIds = new Set<string>();
  const stopIds = new Set<string>();
  const walkIds = new Set<string>();

  for (const segment of journey.segments) {
    if (segment.type === "TRANSIT") {
      patternIds.add(segment.pattern_id);
      const pattern = transitiveData.patterns.find(
        (p) => p.pattern_id === segment.pattern_id,
      );
      if (pattern) {
        for (
          let i = segment.from_stop_index;
          i <= segment.to_stop_index;
          i++
        ) {
          stopIds.add(pattern.stops[i].stop_id);
        }
      }
    } else {
      if (segment.from.type === "STOP") stopIds.add(segment.from.stop_id);
      if (segment.to.type === "STOP") stopIds.add(segment.to.stop_id);
      if (segment.from.type === "STOP" && segment.to.type === "STOP") {
        walkIds.add(`walk-${segment.from.stop_id}-${segment.to.stop_id}`);
      }
    }
  }

  return { patternIds, stopIds, walkIds };
}
