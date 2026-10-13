import { z } from "zod";
const point = z.tuple([z.number().finite(), z.number().finite()]);
const ring = z.array(point);
const geometry = z.union([
  z.object({ type: z.literal("Polygon"), coordinates: z.array(ring) }),
  z.object({
    type: z.literal("MultiPolygon"),
    coordinates: z.array(z.array(ring)),
  }),
]);
export const boundaryCollection = z.object({
  type: z.literal("FeatureCollection"),
  features: z
    .array(
      z.object({
        type: z.literal("Feature"),
        id: z.string(),
        geometry,
        properties: z.object({
          state: z.string(),
          districtCode: z.string(),
          status: z.enum(["C", "F"]),
          vintage: z.string(),
          name: z.string().nullable(),
          centroid: point,
        }),
      }),
    )
    .max(1000),
});
export type BoundaryFeature = z.infer<
  typeof boundaryCollection
>["features"][number];
// Browser-safe projection of official longitude/latitude geometry. The contiguous
// US viewport has explicit bounds; Alaska, Hawaii and territories stay in the table.
const project = ([lon, lat]: [number, number]) =>
  [((lon + 125) / 59) * 600, ((50 - lat) / 26) * 330] as const;
export function districtPath(feature: BoundaryFeature) {
  const rings =
    feature.geometry.type === "Polygon"
      ? feature.geometry.coordinates
      : feature.geometry.coordinates.flat();
  return rings
    .map(
      (r) =>
        r
          .map((p, i) => {
            const [x, y] = project(p);
            return `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
          })
          .join(" ") + " Z",
    )
    .join(" ");
}
export const inContiguousViewport = (feature: BoundaryFeature) => {
  const [lon, lat] = feature.properties.centroid;
  return lon >= -125 && lon <= -66 && lat >= 24 && lat <= 50;
};
