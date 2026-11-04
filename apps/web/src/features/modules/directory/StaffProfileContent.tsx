import type { ReactNode } from "react";
import type { StaffProfileDetail } from "../../../shared/capiro/operations/directory-staff-schemas";
import { PageHeader, Panel } from "../../../shared/module-ui";
import { MemberPhoto } from "./MemberPhoto";
import { externalUrl } from "./personnel-links";
import styles from "./directory.module.css";

const bioLabels = {
  partyName: "Party",
  majMin: "Majority/Minority",
  occupation: "Occupation",
  dob: "Date of birth",
  dateOfDeath: "Date of death",
  hometown: "Hometown",
  placeOfBirth: "Place of birth",
  nativeOf: "Native of",
  pronunciation: "Pronunciation",
  raceName: "Race",
  religionName: "Religion",
} as const;

function Details({ title, rows }: { title: string; rows: ReactNode[] }) {
  return rows.length ? (
    <Panel title={title}>
      {rows.map((row, index) => (
        <div className={styles.row} key={index}>
          {row}
        </div>
      ))}
    </Panel>
  ) : null;
}

export function StaffProfileContent({ staff }: { staff: StaffProfileDetail }) {
  const name = [
    staff.identity.preferredFirstName || staff.identity.firstName,
    staff.identity.preferredLastName || staff.identity.lastName,
    staff.identity.suffix,
  ]
    .filter(Boolean)
    .join(" ");
  const title =
    staff.positions.find((position) => position.isCurrent)?.title ??
    staff.positions[0]?.title;
  const biography = [
    ["Staff ID", String(staff.identity.staffId)],
    ["Gender", staff.identity.gender],
    ...Object.entries(bioLabels).map(([key, label]) => [
      label,
      staff.bioDetails[key as keyof typeof bioLabels],
    ]),
  ].filter(([, value]) => value?.trim());
  return (
    <>
      <PageHeader
        title={name || "Staff profile"}
        eyebrow="Directory · Staff"
        description={title || undefined}
        titleAccessory={
          <MemberPhoto
            name={name}
            photoUrl={externalUrl(staff.photoUrl)}
            variant="profile"
          />
        }
      />
      {staff.source?.lastUpdatedAt && (
        <p className={styles.muted}>
          Source updated {staff.source.lastUpdatedAt}
        </p>
      )}
      <Details
        title="Identity & bio"
        rows={biography.map(([label, value]) => (
          <>
            <strong>{label}</strong>
            <span>{value}</span>
          </>
        ))}
      />
      <Details
        title="Roles"
        rows={staff.roles.map((role) => (
          <>
            <strong>{role.roleName || "Role"}</strong>
            <span>{role.memberName}</span>
          </>
        ))}
      />
      <Details
        title="Issue areas"
        rows={staff.issues.map((issue) => (
          <>
            <span>{issue.issueName}</span>
            <span>{issue.memberName}</span>
          </>
        ))}
      />
      <Details
        title="Emails"
        rows={staff.emails.map((email) => (
          <>
            <a href={`mailto:${email.value}`}>{email.value}</a>
            <span>{email.type}</span>
          </>
        ))}
      />
      <Details
        title="Social contacts"
        rows={staff.socialContacts.map((contact) => {
          const href = externalUrl(contact.value);
          return (
            <>
              <span>{contact.type}</span>
              {href ? (
                <a href={href} target="_blank" rel="noreferrer">
                  {contact.value}
                </a>
              ) : (
                <span>{contact.value}</span>
              )}
            </>
          );
        })}
      />
      <Details
        title="Offices"
        rows={staff.officeAddresses.map((office, index) => (
          <div key={index}>
            <strong>
              {office.officeName || office.label || "Office"}
              {office.isMain ? " · Main" : ""}
            </strong>
            <p>
              {[
                office.address1,
                office.address2,
                office.city,
                office.state,
                [office.zip, office.zipExt].filter(Boolean).join("-"),
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            {office.phone && (
              <p>
                Phone: <a href={`tel:${office.phone}`}>{office.phone}</a>
              </p>
            )}
            {office.fax && <p>Fax: {office.fax}</p>}
            {office.publicNotes && <p>{office.publicNotes}</p>}
          </div>
        ))}
      />
      <Details
        title="Positions"
        rows={staff.positions.map((position, index) => (
          <div key={index}>
            <strong>{position.title || "Position"}</strong>
            <p>
              {[
                position.officeName,
                position.member?.fullName,
                position.member?.party,
                position.member?.state,
                position.member?.district,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p>
              {position.isCurrent ? "Current" : "Former"}
              {position.isOnLeave ? " · On leave" : ""}
              {position.positionType ? ` · ${position.positionType}` : ""}
            </p>
            {(position.startDate || position.endDate) && (
              <p>
                {position.startDate || "Unknown"} –{" "}
                {position.endDate || "Present"}
              </p>
            )}
          </div>
        ))}
      />
      <Details
        title="Member associations"
        rows={staff.memberAssociations.map((member) => (
          <>
            <strong>{member.fullName || member.id}</strong>
            <span>
              {[member.party, member.state, member.district]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </>
        ))}
      />
      <Details
        title="Committee associations"
        rows={staff.committeeAssociations.map((committee) => (
          <>
            <strong>
              {committee.committeeName || "Committee name unavailable"}
            </strong>
            <span>{committee.position || "Staff"}</span>
          </>
        ))}
      />
    </>
  );
}
