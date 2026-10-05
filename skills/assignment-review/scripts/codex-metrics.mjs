import { fields,fail,uuid,id,hash,sha256,array } from './prompt-contract.mjs';
const names=['input_tokens','cached_input_tokens','output_tokens','reasoning_output_tokens'];
export function normalizeTerminalMetrics(event){
 const terminal=event?.type==='turn.completed',raw=terminal?event.usage:null;
 const usage={scope:'cli_turn',eventType:terminal?'turn.completed':null};
 for(const name of names){
  const present=raw!==null&&typeof raw==='object'&&Object.hasOwn(raw,name),v=present?raw[name]:null;
  const valid=Number.isSafeInteger(v)&&v>=0;
  usage[name]={value:present&&valid?v:null,state:present?(valid?'reported':'invalid'):'missing',sourcePath:terminal?'turn.completed.usage.'+name:null,reason:present?(valid?null:'invalid_number'):'not_reported'};
 }
 for(const [part,total] of [['cached_input_tokens','input_tokens'],['reasoning_output_tokens','output_tokens']])if(usage[part].state==='reported'&&usage[total].state==='reported'&&usage[part].value>usage[total].value)usage[part]={...usage[part],value:null,state:'invalid',reason:'inconsistent_breakdown'};
 return usage;
}
function validateUsage(input){
 const v=fields(input,['scope','eventType',...names]);if(v.scope!=='cli_turn'||![null,'turn.completed'].includes(v.eventType))fail('corrupt_record');
 for(const name of names){const f=fields(v[name],['value','state','sourcePath','reason']);
  if(f.sourcePath!==(v.eventType?'turn.completed.usage.'+name:null)||!['reported','missing','invalid'].includes(f.state))fail('corrupt_record');
  if(f.state==='reported'){if(!v.eventType||!Number.isSafeInteger(f.value)||f.value<0||f.reason!==null)fail('corrupt_record');}
  else if(f.value!==null||!(f.state==='missing'?f.reason==='not_reported':v.eventType&&['invalid_number','inconsistent_breakdown'].includes(f.reason)))fail('corrupt_record');
  v[name]=f;
 }
 for(const [part,total] of [['cached_input_tokens','input_tokens'],['reasoning_output_tokens','output_tokens']])if(v[part].state==='reported'&&v[total].state==='reported'&&v[part].value>v[total].value)fail('corrupt_record');
 return v;
}
export function validateRunMetrics(input){
 const v=fields(input,['schemaVersion','runId','taskId','conversationId','attemptId','promptSha256','binarySha256','observedAt','requestedModel','reportedModel','usage','limitations','metricsSha256']);
 if(v.schemaVersion!==1||!uuid(v.runId)||!uuid(v.conversationId)||!uuid(v.attemptId)||!id(v.taskId)||!hash(v.promptSha256)||!(v.binarySha256===null||hash(v.binarySha256))||typeof v.observedAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v.observedAt)||Number.isNaN(Date.parse(v.observedAt)))fail('corrupt_record');
 if(v.requestedModel!==null){v.requestedModel=fields(v.requestedModel,['value','source']);if(v.requestedModel.source!=='local_launch_args'||typeof v.requestedModel.value!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(v.requestedModel.value))fail('corrupt_record');}
 if(v.reportedModel!==null)fail('corrupt_record'); // Pinned CLI has no verified effective-model field.
 v.usage=validateUsage(v.usage);v.limitations=array(v.limitations,3,x=>{if(!['effective_model_not_reported','remote_consumption_unknown','cli_turn_not_billing'].includes(x))fail('corrupt_record');return x;});
 const {metricsSha256,...body}=v;if(metricsSha256!==sha256(JSON.stringify(body)))fail('corrupt_record');return v;
}
export function createRunMetrics(execution,launch,usage=normalizeTerminalMetrics(null)){
 const args=launch?.args??[],at=args.indexOf('-m'),model=at>=0?args[at+1]:null;
 const body={schemaVersion:1,runId:execution.runId,taskId:execution.taskId,conversationId:execution.conversationId,attemptId:execution.attemptId,promptSha256:execution.promptSha256,binarySha256:execution.binarySha256,observedAt:execution.finishedAt,requestedModel:model?{value:model,source:'local_launch_args'}:null,reportedModel:null,usage,limitations:['effective_model_not_reported','cli_turn_not_billing',...(execution.status!=='succeeded'?['remote_consumption_unknown']:[])]};
 return validateRunMetrics({...body,metricsSha256:sha256(JSON.stringify(body))});
}
export function bindRunMetrics(input,execution){
 const v=validateRunMetrics(input);
 if(!execution||['runId','taskId','conversationId','attemptId','promptSha256','binarySha256'].some(k=>v[k]!==execution[k])||Boolean(v.usage.eventType)!==execution.terminalObserved||v.observedAt!==execution.finishedAt||execution.status==='preparing')fail('corrupt_record');
 return v;
}
