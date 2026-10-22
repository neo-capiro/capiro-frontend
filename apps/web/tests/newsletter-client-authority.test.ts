// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNewsletter } from "../src/features/modules/workspace/newsletter/use-newsletter";

const h = vi.hoisted(() => ({ clients: [] as { id: string; name: string }[], run: {} as Record<string, ReturnType<typeof vi.fn>> }));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (key: string) => ({ data: key === "workspace.clients" ? { items: h.clients } : { tenant: { name: "Firm" } } }),
  useCapiroMutation: (key: string) => ({ run: h.run[key], pending: false }),
}));
const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";
const record = { id: "draft", clientId: A, docTitle: "Newsletter", documents: [{ id: "doc", body: {} }] } as any;
beforeEach(() => {
  h.clients = [{ id: A, name: "Same name" }, { id: B, name: "Same name" }];
  h.run = Object.fromEntries(["workspace.draft.create", "workspace.document.update", "workspace.draft.update", "workspace.draft.snapshot"].map(key => [key, vi.fn().mockResolvedValue(key === "workspace.draft.create" ? record : {})]));
});
afterEach(cleanup);

describe("newsletter client authority", () => {
  it("creates with the selected UUID despite duplicate names", async () => {
    const { result } = renderHook(() => useNewsletter({ initialClientId: A, onClose: vi.fn() }));
    await act(() => result.current.save());
    expect(h.run["workspace.draft.create"]).toHaveBeenCalledWith({ body: expect.objectContaining({ clientId: A }) });
    expect(h.run["workspace.draft.snapshot"]).toHaveBeenCalledOnce();
  });
  it("holds a removed client before create", async () => {
    h.clients = [];
    const { result } = renderHook(() => useNewsletter({ initialClientId: A, onClose: vi.fn() }));
    await act(() => result.current.save());
    expect(h.run["workspace.draft.create"]).not.toHaveBeenCalled();
    expect(result.current.error?.message).toContain("unavailable");
  });
  it("reopens using the saved UUID and refuses reassignment", async () => {
    const { result } = renderHook(() => useNewsletter({ initialClientId: B, existing: record, onClose: vi.fn() }));
    expect(result.current.clientId).toBe(A);
    act(() => result.current.setClientId(B));
    await act(() => result.current.save());
    expect(h.run["workspace.document.update"]).not.toHaveBeenCalled();
    expect(result.current.error?.message).toContain("different client");
  });
  it("discards a pending create after the local client changes", async () => {
    let finish!: (value: unknown) => void;
    h.run["workspace.draft.create"].mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useNewsletter({ initialClientId: A, onClose: vi.fn() }));
    let saving!: Promise<void>;
    act(() => { saving = result.current.save(); });
    act(() => result.current.setClientId(B));
    await act(async () => { finish(record); await saving; });
    expect(result.current.draft).toBeUndefined();
    expect(h.run["workspace.document.update"]).not.toHaveBeenCalled();
  });
});
