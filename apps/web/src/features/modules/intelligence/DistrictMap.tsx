"use client";
import { useEffect, useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { DistrictSummary } from "../../../shared/capiro/operations/intelligence-defense";
import { ActionButton } from "../../../shared/module-ui";
import {
  boundaryCollection,
  districtPath,
  inContiguousViewport,
  type BoundaryFeature,
} from "./district-geometry";
import styles from "./intelligence.module.css";
export function DistrictMap({
  districts,
  onSelect,
  colorBy = "nexus",
}: {
  districts: readonly DistrictSummary[];
  onSelect: (district: DistrictSummary) => void;
  colorBy?: "nexus" | "coverage";
}) {
  const api = useCapiro();
  const [features, setFeatures] = useState<BoundaryFeature[]>([]);
  const [error, setError] = useState<string>();
  const [zoom, setZoom] = useState(1);
  const [layersOpen, setLayersOpen] = useState(false);
  const [officialVisible, setOfficialVisible] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    api
      .download(
        "intelligence.district.boundaries",
        { params: { status: "C" } },
        { signal: controller.signal },
      )
      .then(async (r) => {
        const data = boundaryCollection.parse(JSON.parse(await r.blob.text()));
        if (!controller.signal.aborted)
          setFeatures(data.features.filter(inContiguousViewport));
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Map unavailable");
      });
    return () => controller.abort();
  }, [api]);
  const data = new Map(districts.map((d) => [d.districtKey, d]));
  return (
    <div className={styles.map} aria-label="Congressional district map">
      <div className={styles.mapReference} aria-hidden="true">
        <img
          alt=""
          src="/figma/modules/district-states.svg"
          style={{ left: 56.14, top: 11 }}
        />
        <img
          alt=""
          src="/figma/modules/district-boundaries.svg"
          style={{ left: 88.8, top: 128.2 }}
        />
        <img
          alt=""
          src="/figma/modules/district-points.svg"
          style={{ left: 86.8, top: 128.35 }}
        />
      </div>
      {features.length > 0 && officialVisible && (
        <svg
          className={styles.geo}
          viewBox="0 0 600 330"
          role="img"
          aria-label="Current official district boundaries"
        >
          <g
            transform={`translate(${300 * (1 - zoom)} ${165 * (1 - zoom)}) scale(${zoom})`}
          >
            {features.map((f) => {
              const d = data.get(f.id);
              return (
                <path
                  key={f.id}
                  d={districtPath(f)}
                  fill={(() => {
                    if (!d) return "#f5f5f4";
                    // Nexus and coverage are the only two dimensions this read
                    // supplies; every other basis would be invented.
                    const basis =
                      colorBy === "coverage" ? d.coveragePercent : d.score;
                    if (basis == null) return "#f5f5f4";
                    return `hsl(191 22% ${94 - Math.min(100, basis) * 0.3}%)`;
                  })()}
                  onClick={() => d && onSelect(d)}
                  tabIndex={d ? 0 : undefined}
                  role={d ? "button" : undefined}
                  aria-label={
                    d ? `${f.id}, score ${d.score ?? "unavailable"}` : undefined
                  }
                  onKeyDown={(e) => {
                    if (d && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onSelect(d);
                    }
                  }}
                >
                  <title>
                    {f.id}
                    {d
                      ? ` · ${d.clientCount} clients · ${d.score == null ? "Score unavailable" : `${d.score}/100`}`
                      : " · No metrics in current scope"}
                  </title>
                </path>
              );
            })}
          </g>
        </svg>
      )}
      <div className={styles.mapControls}>
        <ActionButton
          aria-label="Map layers"
          aria-expanded={layersOpen}
          onClick={() => setLayersOpen(!layersOpen)}
        >
          <img src="/figma/modules/district-layers.svg" alt="" />
        </ActionButton>
        {layersOpen && (
          <label>
            <input
              type="checkbox"
              checked={officialVisible}
              onChange={(e) => setOfficialVisible(e.target.checked)}
            />
            Official boundaries
          </label>
        )}
        <ActionButton
          aria-label="Zoom in"
          onClick={() => setZoom(Math.min(3, zoom + 0.25))}
        >
          <img src="/figma/modules/district-plus.svg" alt="" />
        </ActionButton>
        <ActionButton
          aria-label="Zoom out"
          onClick={() => setZoom(Math.max(1, zoom - 0.25))}
        >
          <img src="/figma/modules/district-minus.svg" alt="" />
        </ActionButton>
        <ActionButton aria-label="Fit map" onClick={() => setZoom(1)}>
          <img src="/figma/modules/district-locate.svg" alt="" />
        </ActionButton>
      </div>
      <div className={styles.mapLegend}>
        {error
          ? "Official boundary data unavailable · reference outlines shown"
          : features.length
            ? "Current official district boundaries · Nexus score"
            : "Loading official boundaries…"}
      </div>
    </div>
  );
}
