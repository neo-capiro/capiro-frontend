"use client";
import { memberName } from "@/features/portfolio/index/public";
import type { Member } from "@/features/portfolio/index/contracts-public";

export function TeamMemberFields({
  members,
  selectedId,
  role,
  disabled,
  onMemberChange,
  onRoleChange,
  onAdd,
}: {
  members: Member[];
  selectedId: string;
  role: string;
  disabled: boolean;
  onMemberChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onAdd: () => void;
}) {
  const selectedAvailable = members.some((member) => member.id === selectedId);
  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled && selectedAvailable) onAdd();
      }}
    >
      <label>
        Add team member
        <select
          name="userId"
          required
          value={selectedId}
          disabled={disabled}
          onChange={(event) => onMemberChange(event.target.value)}
        >
          <option value="">Choose a member</option>
          {selectedId && !selectedAvailable && (
            <option value={selectedId} disabled>
              Selected member unavailable
            </option>
          )}
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {memberName(member)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Role
        <input
          name="role"
          maxLength={120}
          value={role}
          onChange={(event) => onRoleChange(event.target.value)}
          disabled={disabled}
        />
      </label>
      <button className="button" disabled={disabled || !selectedAvailable}>
        Add member
      </button>
    </form>
  );
}
export function TeamOwnerField({
  members,
  ownerId,
  ownerAvailable,
  disabled,
  onChange,
}: {
  members: Member[];
  ownerId: string;
  ownerAvailable: boolean;
  disabled: boolean;
  onChange: (userId: string | null) => void;
}) {
  return (
    <label>
      Account owner
      <select
        disabled={disabled}
        value={ownerId}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">
          {ownerAvailable ? "Unassigned" : "Account owner unavailable"}
        </option>
        {ownerId && !members.some((member) => member.id === ownerId) && (
          <option value={ownerId} disabled>
            Current owner unavailable for selection
          </option>
        )}
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {memberName(member)}
          </option>
        ))}
      </select>
    </label>
  );
}
