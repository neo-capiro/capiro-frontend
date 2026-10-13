import { QueryState } from "@/shared/portfolio/ui/QueryState";
export function AdvocacyReadState({
  label,
  current,
  pending,
  error,
  retry,
}: {
  label: string;
  current: boolean;
  pending: boolean;
  error: Error | null;
  retry: () => void;
}) {
  return (
    <>
      <QueryState pending={pending} error={error} retry={retry} />
      {!current && !pending && !error && (
        <div role="status" className="status">
          <p>Current {label} is unavailable.</p>
          <button className="button" onClick={retry}>
            Reload {label}
          </button>
        </div>
      )}
    </>
  );
}
