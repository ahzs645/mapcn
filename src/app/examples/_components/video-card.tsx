"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";

function VideoLayer() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    const sourceId = "video-src";
    const layerId = "video-layer";

    map.addSource(sourceId, {
      type: "video",
      urls: [
        "https://static-assets.mapbox.com/mapbox-gl-js/drone.mp4",
        "https://static-assets.mapbox.com/mapbox-gl-js/drone.webm",
      ],
      coordinates: [
        [-122.51, 37.82],
        [-122.35, 37.82],
        [-122.35, 37.72],
        [-122.51, 37.72],
      ],
    } as unknown as maplibregl.SourceSpecification);

    map.addLayer({
      id: layerId,
      type: "raster",
      source: sourceId,
      paint: { "raster-opacity": 0.9 },
    });

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch { /* ignore */ }
    };
  }, [map, isLoaded]);

  return null;
}

export function VideoCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.43, 37.77]} zoom={11}>
        <VideoLayer />
      </Map>
    </div>
  );
}
