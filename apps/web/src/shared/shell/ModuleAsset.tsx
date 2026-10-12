import styles from "./module-shell.module.css";

const assets = {
  meri: ["imgIcon.svg", 16],
  portfolio: ["imgIcon1.svg", 16],
  modules: ["imgIcon2.svg", 16],
  quickLog: ["imgIcon3.svg", 16],
  calendar: ["imgIcon4.svg", 16],
  search: ["imgIcon5.svg", 16],
  updates: ["imgIcon6.svg", 16],
  engagement: ["imgIcon7.svg", 16],
  planner: ["imgIcon8.svg", 16],
  calendarNav: ["imgIcon9.svg", 16],
  workspace: ["imgIcon10.svg", 16],
  strategies: ["imgIcon11.svg", 16],
  directory: ["imgIcon12.svg", 16],
  intelligence: ["imgIcon13.svg", 16],
  research: ["imgIcon14.svg", 16],
  settings: ["imgIcon15.svg", 16],
  engagementCard: ["imgIconHandshake.svg", 18],
  workspaceCard: ["imgIconFileText.svg", 18],
  plannerCard: ["imgLucideListTodo.svg", 24],
  strategiesCard: ["imgLucideRoute.svg", 24],
  intelligenceCard: ["imgLucideRadar.svg", 24],
  directoryCard: ["imgIconUsers.svg", 18],
  researchCard: ["imgLucideFolders.svg", 24],
  profile: ["imgCapiro31ProfilePicture.svg", 32],
} as const;
export type ModuleAssetName = keyof typeof assets;

/** Exported Figma roots retain their intrinsic dimensions; slots scale the whole asset. */
export function ModuleAsset({
  name,
  size,
}: {
  name: ModuleAssetName;
  size?: number;
}) {
  const [file, intrinsic] = assets[name];
  const display = size ?? intrinsic;
  return (
    <span
      className={styles.assetSlot}
      style={{ width: display, height: display }}
    >
      <img
        src={`/design/modules/shared/${file}`}
        alt=""
        aria-hidden="true"
        style={{ transform: `scale(${display / intrinsic})` }}
      />
    </span>
  );
}
