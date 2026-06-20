"use client";

import { useMemo, useRef } from "react";
import { Navigation2, Pause, Play, RotateCcw } from "lucide-react";

import {
  Map,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerTooltip,
} from "@/registry/map";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatClock,
  formatDay,
  fullPath,
  gpsTracks,
  interpolatePosition,
  playbackBounds,
  traveledPath,
} from "./data";
import { PlaybackTimeline } from "./components/playback-timeline";
import { usePlaybackClock } from "./components/use-playback-clock";

const SPEEDS = [50, 100, 200, 400];

export default function Page() {
  const clock = usePlaybackClock({
    start: playbackBounds.start,
    end: playbackBounds.end,
    initialSpeed: 100,
    loop: true,
  });

  // Remember whether playback was running so a scrub can resume it on release.
  const wasPlayingRef = useRef(false);

  // The full route never changes — compute it once so it isn't re-uploaded to
  // the map on every animation frame (only the traveled portion grows).
  const fullPaths = useMemo(() => gpsTracks.map((track) => fullPath(track)), []);

  return (
    <div className="bg-background p-6">
      <div className="relative mx-auto h-[680px] max-w-7xl overflow-hidden rounded-lg border shadow-sm">
        <Map
          center={[-123.39, 44.51]}
          zoom={10.4}
          minZoom={8}
          maxZoom={16}
        >
          <MapControls position="top-right" />

          {/* Legend */}
          <div className="bg-background/90 absolute top-4 left-4 z-20 rounded-md border p-3 shadow-sm backdrop-blur">
            <div className="text-sm font-semibold">GPS Playback</div>
            <div className="mt-2 space-y-1.5">
              {gpsTracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: track.color }}
                  />
                  <span className="text-muted-foreground">{track.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Routes: full (dimmed) + traveled (solid) */}
          {gpsTracks.map((track, index) => (
            <MapRoute
              key={`full-${track.id}`}
              id={`full-${track.id}`}
              coordinates={fullPaths[index]}
              color={track.color}
              width={3}
              opacity={0.25}
              interactive={false}
            />
          ))}
          {gpsTracks.map((track) => (
            <MapRoute
              key={`done-${track.id}`}
              id={`done-${track.id}`}
              coordinates={traveledPath(track, clock.time)}
              color={track.color}
              width={4}
              opacity={0.95}
              interactive={false}
            />
          ))}

          {/* Moving markers */}
          {gpsTracks.map((track) => {
            const pos = interpolatePosition(track, clock.time);
            return (
              <MapMarker
                key={track.id}
                longitude={pos.lng}
                latitude={pos.lat}
                rotation={pos.bearing}
              >
                <MarkerContent>
                  <span
                    className={cn(
                      "grid size-7 place-items-center rounded-full border-2 border-white shadow-md transition-opacity",
                      !pos.active && "opacity-55",
                    )}
                    style={{ backgroundColor: track.color }}
                  >
                    <Navigation2 className="size-3.5 fill-white text-white" />
                  </span>
                </MarkerContent>
                <MarkerTooltip
                  offset={18}
                  className="bg-background text-foreground border px-2.5 py-1.5"
                >
                  <p className="text-xs font-medium">{track.label}</p>
                  <p className="text-muted-foreground text-[11px] tabular-nums">
                    {formatClock(clock.time, true)}
                  </p>
                </MarkerTooltip>
              </MapMarker>
            );
          })}

          {/* Bottom playback panel */}
          <div className="bg-background/95 absolute right-0 bottom-0 left-0 z-20 border-t backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-2.5 pb-1">
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="icon"
                  className="size-9"
                  onClick={clock.toggle}
                  aria-label={clock.isPlaying ? "Pause" : "Play"}
                >
                  {clock.isPlaying ? (
                    <Pause className="size-4" />
                  ) : (
                    <Play className="size-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-9"
                  onClick={clock.restart}
                  aria-label="Restart"
                >
                  <RotateCcw className="size-4" />
                </Button>

                <div className="bg-muted ml-1 flex items-center rounded-md p-0.5">
                  {SPEEDS.map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => clock.setSpeed(speed)}
                      className={cn(
                        "rounded px-2 py-1 text-xs font-medium tabular-nums transition-colors",
                        clock.speed === speed
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {speed}×
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-right leading-tight">
                <div className="text-sm font-semibold tabular-nums">
                  {formatClock(clock.time, true)}
                </div>
                <div className="text-muted-foreground text-[11px]">
                  {formatDay(clock.time)}
                </div>
              </div>
            </div>

            <div className="px-3 pb-1.5">
              <PlaybackTimeline
                tracks={gpsTracks}
                bounds={playbackBounds}
                currentTime={clock.time}
                onSeek={clock.seek}
                onScrubStart={() => {
                  wasPlayingRef.current = clock.isPlaying;
                  clock.pause();
                }}
                onScrubEnd={() => {
                  if (wasPlayingRef.current) clock.play();
                }}
              />
            </div>
          </div>
        </Map>
      </div>
    </div>
  );
}
