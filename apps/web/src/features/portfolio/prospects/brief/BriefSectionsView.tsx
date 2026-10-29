import { sectionKeys, sectionLabels, type Sections } from "./contracts";
import styles from "./brief.module.css";
export function BriefSectionsView({
  sections,
  onSource,
}: {
  sections: Sections;
  onSource: (index: number) => void;
}) {
  return (
    <>
      {sectionKeys.map((key) => (
        <section key={key}>
          <div className="row between">
            <h3>{sectionLabels[key]}</h3>
            <small>{sections[key].provenance}</small>
          </div>
          <p className={styles.sectionText}>{sections[key].text}</p>
          <div className="row">
            {sections[key].citationIndexes.map((index, position) => (
              <button
                key={index + ":" + position}
                className="button ghost"
                onClick={() => onSource(index)}
              >
                Source {index + 1}
              </button>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
