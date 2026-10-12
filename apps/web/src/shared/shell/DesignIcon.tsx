/** Exact local Figma assets. SVG intrinsic roots remain unchanged. */
export function DesignIcon({
  name,
  assetSet = "home",
}: {
  name: string;
  assetSet?: "home" | "cited-answer";
}) {
  return (
    <img src={`/design/${assetSet}/${name}.svg`} alt="" aria-hidden="true" />
  );
}
