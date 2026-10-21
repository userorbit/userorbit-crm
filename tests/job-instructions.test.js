import { expect, test } from "bun:test";
import { applyJobInstructions } from "../src/assistant/job-instructions.js";
const records = [{ id: "a", reason: "Urgent renewal" }, { id: "b", reason: "Old relationship" }];
test("recurring instructions filter only supplied evidence", async () => {
  let sent;
  const result = await applyJobInstructions({ OPENAI_API_KEY: "test", ASSISTANT_FETCH: async (_, request) => { sent = JSON.parse(request.body); return Response.json({ output_text: '{"selectedIndexes":[0,0]}' }); } }, "Only urgent renewals", records);
  expect(result).toEqual({ data: [records[0]], mode: "instructions", instructionsApplied: true });
  expect(sent.input).toContain("Only urgent renewals");
  expect(sent.instructions).toContain("untrusted");
});
test("unconfigured or invalid instruction selection uses a labeled template fallback", async () => {
  expect((await applyJobInstructions({}, "urgent", records)).instructionsApplied).toBe(false);
  const result = await applyJobInstructions({ OPENAI_API_KEY: "test", ASSISTANT_FETCH: async () => Response.json({ output_text: '{"selectedIndexes":[999]}' }) }, "urgent", records);
  expect(result.mode).toBe("template"); expect(result.data).toEqual(records);
});
