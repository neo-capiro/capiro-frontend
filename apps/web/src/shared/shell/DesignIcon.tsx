import styles from "./shell.module.css";

/** Exact local Figma assets. SVG intrinsic roots remain unchanged. */
export function DesignIcon({
  name,
  assetSet = "home",
}: {
  name: string;
  assetSet?: "home" | "cited-answer" | "header-34-20261016";
}) {
  return (
    <img
      className={styles.designIcon}
      src={`/design/${assetSet}/${name}.svg`}
      alt=""
      aria-hidden="true"
    />
  );
}
