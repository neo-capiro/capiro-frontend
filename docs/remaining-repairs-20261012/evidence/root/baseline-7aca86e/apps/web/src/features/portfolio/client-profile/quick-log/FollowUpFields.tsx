"use client";
import { memberName } from "@/features/portfolio/index/public";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useProfileMemberOptions } from "../profile-read-queries";
import type { FollowUpInput } from "./command-contracts";

export function FollowUpFields({
  disabled,
  initial,
}: {
  disabled: boolean;
  initial?: FollowUpInput;
}) {
  const options = useProfileMemberOptions();
  return (
    <fieldset className="stack" disabled={disabled}>
      <legend>Generic follow-up</legend>
      <p>
        Creates “Follow up on logged activity” in Planner. The task includes an
        assignee and optional schedule; activity text and client or person
        details are not copied.
      </p>
      <QueryState
        pending={options.isPending}
        error={options.error}
        retry={() => void options.refetch()}
      />
      <label>
        Follow-up assignee
        <select
          name="followUpAssignee"
          required
          defaultValue={initial?.assigneeUserId ?? ""}
          disabled={disabled || !options.source}
        >
          <option value="">Choose a current member</option>
          {initial?.assigneeUserId &&
            !options.data?.some(
              (member) => member.id === initial.assigneeUserId,
            ) && (
              <option value={initial.assigneeUserId}>
                Retained assignee · {initial.assigneeUserId}
              </option>
            )}
          {options.data?.map((member) => (
            <option key={member.id} value={member.id}>
              {memberName(member)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Follow-up date (optional)
        <input
          type="date"
          name="followUpDate"
          defaultValue={initial?.dueOn ?? ""}
        />
      </label>
      <label>
        Follow-up time (optional)
        <input
          type="time"
          name="followUpTime"
          defaultValue={initial?.dueTime ?? ""}
        />
      </label>
      <label>
        Follow-up IANA time zone
        <input
          name="followUpZone"
          placeholder="America/New_York"
          defaultValue={initial?.timeZone ?? ""}
        />
      </label>
      <small>
        A date requires an explicit time zone. Leave all schedule fields empty
        for an unscheduled follow-up.
      </small>
    </fieldset>
  );
}
