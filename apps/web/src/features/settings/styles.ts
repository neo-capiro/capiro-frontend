import controls from "./settings-controls.module.css";
import layout from "./settings-layout.module.css";
import integrations from "./settings-integrations.module.css";
import recordTables from "./settings-record-tables.module.css";

const styles = { ...layout, ...controls, ...recordTables, ...integrations };
export default styles;
