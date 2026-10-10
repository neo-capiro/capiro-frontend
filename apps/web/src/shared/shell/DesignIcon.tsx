/** Exact local Figma assets. SVG intrinsic roots remain unchanged. */
export function DesignIcon({ name }: { name: string }) {
  return <img src={`/design/home/${name}.svg`} alt="" aria-hidden="true" />;
}
