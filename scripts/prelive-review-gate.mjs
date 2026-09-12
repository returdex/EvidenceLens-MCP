const lower64 = /^[0-9a-f]{64}$/u;
const gitId = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/u;
const imageId = /^sha256:[0-9a-f]{64}$/u;

function fail() { throw new Error("PRELIVE_RESUME"); }
function ordinary(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }

export const RESUME_KEYS = ["authorization_echo", "challenge_commit", "challenge_expires_at_ms", "challenge_handoff_blob", "generation", "image_id", "manifest_sha256", "nonce", "non_planning_tree", "replay_status", "reviewed_commit", "schema", "status"];

export function validateResumeBlock(value) {
  if (!ordinary(value) || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...RESUME_KEYS].sort())) fail();
  if (value.schema !== "evidencelens.challenge-resume.v1" || value.status !== "ready" || value.replay_status !== "unconsumed") fail();
  for (const key of ["generation", "manifest_sha256", "nonce", "non_planning_tree"]) if (!lower64.test(value[key])) fail();
  if (!gitId.test(value.challenge_commit) || !gitId.test(value.challenge_handoff_blob) || !gitId.test(value.reviewed_commit)) fail();
  if (!imageId.test(value.image_id) || !Number.isSafeInteger(value.challenge_expires_at_ms) || value.challenge_expires_at_ms <= 0) fail();
  const expected = `authorize evidencelens review nonce=${value.nonce} manifest_sha256=${value.manifest_sha256}`;
  if (value.authorization_echo !== expected || Buffer.byteLength(expected) > 1024 || /[\r\n\0]/u.test(expected)) fail();
  return value;
}
