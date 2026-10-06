import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,link,symlink,rm,realpath,lstat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sha256} from '../../skills/assignment-review/scripts/prompt-contract.mjs';
import {freezeEvaluationInputs as freeze,writeEvaluationLedger as publish} from '../../scripts/evaluation-inputs.mjs';
test('frozen input gate: exact control; exclusions never reach reader; unsafe provenance blocks',async()=>{
 const root=await realpath(await mkdtemp(join(tmpdir(),'el-eval-')));
 try{
  const t='2026-09-01T00:00:00.000Z',later='2026-10-01T00:00:00.000Z';
  const entry=(id,text,extra={})=>({sourceId:id,documentId:id,path:join(root,id),sha256:sha256(text),role:'support',partition:'reviewer',availableAt:t,availableAtEvidence:'synthetic record',stages:['final'],derivedFrom:[],aliases:[],versionIdentity:'synthetic-v1',coverage:'complete',...extra});
  const a=entry('A','A 中文\n',{role:'solution'}),b=entry('B','feedback',{partition:'evaluator_only'}),c=entry('C','derived',{derivedFrom:['B']}),d=entry('D','indirect',{derivedFrom:['C']}),e=entry('E','mixed',{documentId:'B'}),f=entry('F','late',{availableAt:later}),g=entry('G','different-declared-hash'),h=entry('H','alias',{aliases:['B']}),i=entry('I','feedback');
  for(const x of [a,b,c,d,e,f,h,i])await writeFile(x.path,{A:'A 中文\n',B:'feedback',C:'derived',D:'indirect',E:'mixed',F:'late',H:'alias',I:'feedback'}[x.sourceId],{mode:0o600});
  await link(b.path,g.path);
  const m={manifestVersion:1,caseId:'Synthetic',role:'held_out_candidate',readiness:'verified',assessedVersion:'synthetic-v1',stages:{final:{cutoff:t,cutoffEvidence:'synthetic record',currentSourceId:'A'}},entries:[a,b,c,d,e,f,g,h,i]};
  const calls=[];const result=await freeze(m,'final',{roots:[root],onRead:k=>calls.push(k)});
  assert.equal(result.readiness,'input_ready');assert.deepEqual(calls,['A']);assert.deepEqual(result.items.map(x=>x.id),['A']);assert.equal(result.items[0].content,'A 中文\n');assert.equal(result.items[0].contentHash,a.sha256);assert.equal(JSON.stringify(result).includes('feedback'),false);
  const dest=join(root,'new-ledger');await publish(dest,result);assert.equal((await lstat(dest)).mode&0o777,0o700);assert.equal((await lstat(join(dest,'freeze.json'))).mode&0o777,0o600);await assert.rejects(publish(dest,result));
  await assert.rejects(publish(join(root,'blocked-ledger'),result,{protectedRoots:[root]}));
  const accessor={...m};Object.defineProperty(accessor,'entries',{enumerable:true,get(){throw Error('getter ran');}});await assert.rejects(freeze(accessor,'final',{roots:[root]}),{message:'EVALUATION_INPUT_INVALID'});
  for(const mutate of [x=>x.entries[0].partition='unknown',x=>x.entries[0].availableAt=null,x=>x.entries[0].availableAt='2026-02-31T00:00:00.000Z',x=>x.entries[0].derivedFrom=['missing'],x=>{x.entries[0].derivedFrom=['C'];x.entries[2].derivedFrom=['A'];},x=>x.entries.push({...x.entries[0]}),x=>x.entries[0].path=join(root,'..','escape')]){
   const bad=structuredClone(m);mutate(bad);let n=0;await assert.rejects(freeze(bad,'final',{roots:[root],onRead:()=>n++}));assert.equal(n,0);
  }
  const mismatch=structuredClone(m);mismatch.entries[0].sha256='0'.repeat(64);assert.equal((await freeze(mismatch,'final',{roots:[root]})).readiness,'blocked');
  await symlink(a.path,join(root,'Sym'));const bad=structuredClone(m);bad.entries[0].path=join(root,'Sym');await assert.rejects(freeze(bad,'final',{roots:[root]}));
 }finally{await rm(root,{recursive:true,force:true});}
});
