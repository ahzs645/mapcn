"use client";

import { useEffect, useRef, useState } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { TripsLayer } from "@deck.gl/geo-layers";

interface Trip {
  vendor: number;
  path: [number, number][];
  timestamps: number[];
}

function TripsOverlay() {
  const { map, isLoaded } = useMap();
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/trips/trips-v7.json"
    )
      .then((r) => r.json())
      .then((data) => setTrips(data.slice(0, 100)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!map || !isLoaded || !trips.length) return;
    let overlay: MapboxOverlay | null = null;
    let stopped = false;
    let time = 0;
    let frameId: number | null = null;

    const animate = () => {
      if (stopped) return;
      time = (time + 30) % 1800;
      if (overlay) {
        try {
          overlay.setProps({
            layers: [
              new TripsLayer({
                id: "trips",
                data: trips,
                getPath: (d: Trip) => d.path,
                getTimestamps: (d: Trip) => d.timestamps,
                getColor: (d: Trip) =>
                  d.vendor === 0 ? [253, 128, 93] : [23, 184, 190],
                currentTime: time,
                trailLength: 180,
                widthMinPixels: 2,
              }),
            ],
          });
        } catch {
          stopped = true;
          return;
        }
      }
      frameId = requestAnimationFrame(animate);
    };

    const addOverlay = () => {
      if (stopped) return;
      overlay = new MapboxOverlay({ layers: [] });
      map.addControl(overlay as unknown as maplibregl.IControl);
      frameId = requestAnimationFrame(animate);
    };

    if (map.isStyleLoaded()) {
      addOverlay();
    } else {
      map.once("load", addOverlay);
    }

    return () => {
      stopped = true;
      map.off("load", addOverlay);
      if (frameId) cancelAnimationFrame(frameId);
      if (overlay) {
        try { map.removeControl(overlay as unknown as maplibregl.IControl); } catch {}
      }
    };
  }, [map, isLoaded, trips]);

  return null;
}

export function DeckglTripsCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-74.0, 40.72]} zoom={12} pitch={45} theme="dark">
        <TripsOverlay />
      </Map>
    </div>
  );
}
