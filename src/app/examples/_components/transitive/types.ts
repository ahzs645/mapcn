export type LngLat = [number, number];

export type Stop = {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
};

export type TransitRoute = {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
  route_color: string;
};

export type Pattern = {
  pattern_id: string;
  route_id: string;
  stops: Array<{ stop_id: string }>;
};

export type Place = {
  place_id: string;
  place_name: string;
  place_lat: number;
  place_lon: number;
};

export type JourneySegment =
  | {
      type: "WALK";
      from:
        | { type: "PLACE"; place_id: string }
        | { type: "STOP"; stop_id: string };
      to:
        | { type: "PLACE"; place_id: string }
        | { type: "STOP"; stop_id: string };
    }
  | {
      type: "TRANSIT";
      pattern_id: string;
      from_stop_index: number;
      to_stop_index: number;
    };

export type Journey = {
  journey_id: string;
  journey_name: string;
  segments: JourneySegment[];
};

export type TransitiveData = {
  stops: Stop[];
  routes: TransitRoute[];
  patterns: Pattern[];
  places: Place[];
  journeys: Journey[];
};

export type PatternGeometry = {
  geo: LngLat[];
  schematic: LngLat[];
  anchors: number[];
};

export type RenderedEdge = {
  edge_id: string;
  pattern_id: string;
  route_id: string;
  from_stop_id: string;
  to_stop_id: string;
  geo: LngLat[];
  schematic: LngLat[];
  anchors: number[];
  offset: number;
  width: number;
  color: string;
  mode: "transit" | "walk";
  dashArray?: [number, number];
  /** true for place→stop connectors (revealed by zoom), not transfer walks */
  placeWalk?: boolean;
  /**
   * Lane index at each end, from alignment bundling (apply2DOffsets port).
   * Per-END so a line can taper from a bundled lane to lane-0 at a terminal.
   * Multiply by lane width to get the perpendicular offset baked at render time.
   */
  fromLane?: number;
  toLane?: number;
};

export type EdgeGroup = {
  key: string;
  from_stop_id: string;
  to_stop_id: string;
  edges: RenderedEdge[];
};
