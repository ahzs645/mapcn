import type { LngLat, PatternGeometry, TransitiveData } from "./types";

export const transitiveData: TransitiveData = {
  stops: [
    {
      stop_id: "rosslyn",
      stop_name: "Rosslyn",
      stop_lat: 38.895493,
      stop_lon: -77.071954,
    },
    {
      stop_id: "quinn",
      stop_name: "Rt 29 Lee Hwy & Quinn St",
      stop_lat: 38.897798,
      stop_lon: -77.078215,
    },
    {
      stop_id: "farragut",
      stop_name: "Farragut North",
      stop_lat: 38.903297,
      stop_lon: -77.039502,
    },
    {
      stop_id: "k17",
      stop_name: "K St NW & 17th St NW (Main) West",
      stop_lat: 38.902456,
      stop_lon: -77.039724,
    },
    {
      stop_id: "metro",
      stop_name: "Metro Center",
      stop_lat: 38.898327,
      stop_lon: -77.027777,
    },
    {
      stop_id: "union",
      stop_name: "Union Station",
      stop_lat: 38.89777,
      stop_lon: -77.006402,
    },
  ],
  routes: [
    {
      route_id: "BLUE",
      route_short_name: "Blue",
      route_long_name: "Blue via Metro Center",
      route_type: 1,
      route_color: "#2f7fbd",
    },
    {
      route_id: "ORANGE",
      route_short_name: "Orange",
      route_long_name: "Orange via Metro Center",
      route_type: 1,
      route_color: "#f08d32",
    },
    {
      route_id: "RED",
      route_short_name: "Red",
      route_long_name: "Red via Metro Center",
      route_type: 1,
      route_color: "#df4638",
    },
    {
      route_id: "3Y",
      route_short_name: "3Y",
      route_long_name: "3Y via K Street",
      route_type: 3,
      route_color: "#09088c",
    },
  ],
  patterns: [
    {
      pattern_id: "blue-to-union",
      route_id: "BLUE",
      stops: [{ stop_id: "rosslyn" }, { stop_id: "metro" }],
    },
    {
      pattern_id: "orange-to-union",
      route_id: "ORANGE",
      stops: [{ stop_id: "rosslyn" }, { stop_id: "metro" }],
    },
    {
      pattern_id: "red-to-union",
      route_id: "RED",
      stops: [
        { stop_id: "farragut" },
        { stop_id: "metro" },
        { stop_id: "union" },
      ],
    },
    {
      pattern_id: "3y-to-k-street",
      route_id: "3Y",
      stops: [{ stop_id: "quinn" }, { stop_id: "k17" }],
    },
  ],
  places: [
    {
      place_id: "from",
      place_name: "Start: 1401 Wilson Blvd",
      place_lat: 38.894624,
      place_lon: -77.074159,
    },
    {
      place_id: "to",
      place_name: "End: Union Station",
      place_lat: 38.89788,
      place_lon: -77.00597,
    },
  ],
  journeys: [
    {
      journey_id: "option-blue-red",
      journey_name: "Blue + Red via Metro Center",
      segments: [
        {
          type: "WALK",
          from: { type: "PLACE", place_id: "from" },
          to: { type: "STOP", stop_id: "rosslyn" },
        },
        {
          type: "TRANSIT",
          pattern_id: "blue-to-union",
          from_stop_index: 0,
          to_stop_index: 1,
        },
        {
          type: "TRANSIT",
          pattern_id: "red-to-union",
          from_stop_index: 1,
          to_stop_index: 2,
        },
      ],
    },
    {
      journey_id: "option-orange-red",
      journey_name: "Orange + Red via Metro Center",
      segments: [
        {
          type: "WALK",
          from: { type: "PLACE", place_id: "from" },
          to: { type: "STOP", stop_id: "rosslyn" },
        },
        {
          type: "TRANSIT",
          pattern_id: "orange-to-union",
          from_stop_index: 0,
          to_stop_index: 1,
        },
        {
          type: "TRANSIT",
          pattern_id: "red-to-union",
          from_stop_index: 1,
          to_stop_index: 2,
        },
      ],
    },
    {
      journey_id: "option-3y-red",
      journey_name: "3Y + Red via K St NW",
      segments: [
        {
          type: "WALK",
          from: { type: "PLACE", place_id: "from" },
          to: { type: "STOP", stop_id: "quinn" },
        },
        {
          type: "TRANSIT",
          pattern_id: "3y-to-k-street",
          from_stop_index: 0,
          to_stop_index: 1,
        },
        {
          type: "WALK",
          from: { type: "STOP", stop_id: "k17" },
          to: { type: "STOP", stop_id: "farragut" },
        },
        {
          type: "TRANSIT",
          pattern_id: "red-to-union",
          from_stop_index: 0,
          to_stop_index: 2,
        },
      ],
    },
  ],
};

export const patternGeometry: Record<string, PatternGeometry> = {
  "blue-to-union": {
    geo: [
      [-77.071954, 38.895493],
      [-77.0626, 38.8961],
      [-77.050026, 38.900705],
      [-77.039482, 38.901366],
      [-77.031958, 38.901335],
      [-77.027777, 38.898327],
    ],
    schematic: [
      [-77.072, 38.8975],
      [-77.0682, 38.9005],
      [-77.058, 38.9005],
      [-77.048, 38.9005],
      [-77.038, 38.9005],
      [-77.028, 38.9005],
    ],
    anchors: [0, 5],
  },
  "orange-to-union": {
    geo: [
      [-77.071954, 38.895493],
      [-77.0626, 38.8961],
      [-77.050026, 38.900705],
      [-77.039482, 38.901366],
      [-77.031958, 38.901335],
      [-77.027777, 38.898327],
    ],
    schematic: [
      [-77.072, 38.8975],
      [-77.0682, 38.9005],
      [-77.058, 38.9005],
      [-77.048, 38.9005],
      [-77.038, 38.9005],
      [-77.028, 38.9005],
    ],
    anchors: [0, 5],
  },
  "red-to-union": {
    geo: [
      [-77.039502, 38.903297],
      [-77.0382, 38.9023],
      [-77.034, 38.9013],
      [-77.027777, 38.898327],
      [-77.021527, 38.898354],
      [-77.016312, 38.896121],
      [-77.006402, 38.89777],
    ],
    schematic: [
      [-77.042, 38.9045],
      [-77.042, 38.9005],
      [-77.03, 38.9005],
      [-77.028, 38.9005],
      [-77.02, 38.9005],
      [-77.014, 38.9005],
      [-77.008, 38.9005],
    ],
    anchors: [0, 3, 6],
  },
  "3y-to-k-street": {
    geo: [
      [-77.078215, 38.897798],
      [-77.071954, 38.895493],
      [-77.0622, 38.8972],
      [-77.0502, 38.9011],
      [-77.039724, 38.902456],
    ],
    schematic: [
      [-77.076, 38.8975],
      [-77.067, 38.9045],
      [-77.0587, 38.9045],
      [-77.0503, 38.9045],
      [-77.042, 38.9045],
    ],
    anchors: [0, 4],
  },
};

export const walkSegments: Array<{
  walk_id: string;
  from_stop_id: string;
  to_stop_id: string;
  geo: LngLat[];
}> = [
  {
    walk_id: "walk-k17-farragut",
    from_stop_id: "k17",
    to_stop_id: "farragut",
    geo: [
      [-77.039724, 38.902456],
      [-77.039502, 38.903297],
    ],
  },
];
