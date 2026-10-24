import { expect, it } from "vitest";
import {
  fixture,
  run,
  id,
} from "../../../packages/qualification-transport/conversation-fixture.mjs";

const choice = {
  provider: "bedrock",
  modelId: "synthetic-model",
  effort: "high",
};
function modelFixture() {
  const f = fixture();
  f.override = (call) => {
    if (!call.path.endsWith("/input/admit")) return;
    // Real admission pins the effective choice even when the input omits it.
    f.stored = {
      ...f.stored,
      requestId: call.body.requestId,
      prompt: call.body.prompt,
      modelSelection: choice,
    };
    return Response.json({
      run,
      request: f.stored,
      lastSequence: 2,
      replayed: false,
    });
  };
  return f;
}
for (const explicit of [false, true])
  it(`public client history matches ${explicit ? "explicit choice" : "server-resolved omission"}`, async () => {
    const f = modelFixture();
    try {
      await f.client.submit({
        requestId: id(6),
        prompt: "Hello",
        ...(explicit ? { modelSelection: choice } : {}),
      });
      f.stored.modelSelection = choice;
      await f.client.history();
      expect(f.client.getSnapshot().status).toBe("ready");
    } finally {
      f.close();
    }
  });

it("client refuses history with a changed explicit choice after ordinary submit", async () => {
  const f = modelFixture();
  try {
    await f.client.submit({
      requestId: id(6),
      prompt: "Hello",
      modelSelection: choice,
    });
    f.stored.modelSelection = { ...choice, effort: "low" };
    await expect(f.client.history()).rejects.toThrow();
    expect(f.client.getSnapshot().observation).toBeNull();
  } finally {
    f.close();
  }
});
