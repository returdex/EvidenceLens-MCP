import { randomUUID } from 'node:crypto';
import { sha256 } from '../../skills/assignment-review/scripts/prompt-contract.mjs';
export function fixture() {
  const content='A 中文 excerpt\nsecond line';
  const identity={runId:randomUUID(),taskId:'T20',conversationId:randomUUID(),stage:'in_progress',currentSourceId:'S1'};
  const capsule={schemaVersion:1,...identity,sources:[{sourceId:'S1',sourceHash:sha256(content),excerpts:[{excerptId:'E1',startByte:0,endByte:Buffer.byteLength(content),text:content,excerptSha256:sha256(content),locator:'lines 1-2'}]}]};
  const snapshot={schemaVersion:1,...identity,sequence:1,reviewMode:'artifact_only',promptText:'pending',promptSha256:sha256('pending'),capturedAt:new Date().toISOString(),materials:[{sourceId:'S1',role:'solution',status:'inspected',sourceReference:'synthetic.txt',inspectedParts:['lines 1-2'],observedAt:new Date().toISOString(),hashKind:'sha256_utf8',contentHash:sha256(content),availability:'inline_excerpt'}],limitations:['Synthetic excerpt only']};
  const result={schemaVersion:1,runId:identity.runId,taskId:identity.taskId,stage:identity.stage,currentSourceId:'S1',coverage:[{sourceId:'S1',status:'covered',excerptIds:['E1']}],findings:[{findingId:'F1',kind:'observation',severity:'info',claim:'Contains text',evidence:[{sourceId:'S1',excerptId:'E1',startByte:0,endByte:1,quote:'A'}],action:null}],limitations:[]};
  return {content,capsule,snapshot,result,admitted:[{sourceId:'S1',text:content}]};
}
