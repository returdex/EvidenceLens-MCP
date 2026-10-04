import { fields,fail } from './prompt-contract.mjs';

// Never retain free-form CLI text, paths, identifiers, stderr or reasoning here.
const stages=['preparing','capsule','preflight','launch','dispatch','process','result_validation','cleanup','publication'];
const triggers=['aborted','deadline_exceeded','spawn_failed','stdin_failed','invalid_json','invalid_utf8','invalid_event','event_order','cli_error','cli_turn_failed','unexpected_event','unexpected_stderr','tool_activity','result_shape','output_limit','missing_thread','missing_turn','missing_terminal','missing_final','nonzero_exit','signal_exit','cleanup_unconfirmed','capsule_invalid','preflight_rejected','launch_failed','dispatch_failed','supervisor_failed','result_rejected','cleanup_failed','publication_failed'];
const events=['thread.started','turn.started','turn.completed','turn.failed','error','item.started','item.updated','item.completed','other'];
const items=['agent_message','reasoning','error','command_execution','file_change','mcp_tool_call','web_search','todo_list','other'];
const categories=['authentication','rate_limit','model_unavailable','invalid_schema','network','permission','unknown'];
const errnos=['ENOENT','ENOTDIR','EACCES','EPERM','EPIPE','EAGAIN','ENOMEM','EINVAL','other'];
const signals=['SIGTERM','SIGKILL','SIGABRT','SIGSEGV','SIGINT','SIGHUP','SIGPIPE','SIGBUS','SIGILL','SIGTRAP','SIGQUIT','other'];
const bounded=(v,values)=>v===null||v===undefined?null:values.includes(v)?v:'other';
export const diagnosticEvent=v=>bounded(v,events);
export const diagnosticItem=v=>bounded(v,items);
export const diagnosticErrno=v=>bounded(v,errnos);
export const diagnosticSignal=v=>bounded(v,signals);
export function newDiagnostics(stage='preparing',trigger=null){
 return {schemaVersion:1,stage,trigger,eventType:null,itemType:null,reportedErrorCategory:null,osErrorCode:null,exitCode:null,exitSignal:null,terminationRequested:false,closeObserved:false,threadObserved:false,turnObserved:false};
}
// A bounded hint from a CLI-reported error, not an independently proven root cause.
export function reportedErrorCategory(message){
 if(typeof message!=='string')return 'unknown';
 if(/invalid (?:json )?schema|invalid_json_schema|schema.*(?:not supported|required|additionalProperties)/i.test(message))return 'invalid_schema';
 if(/authentication|unauthorized|invalid_api_key|token.*expired|not logged in|HTTP\s+401\b/i.test(message))return 'authentication';
 if(/rate.limit|quota|usage.limit|HTTP\s+429\b/i.test(message))return 'rate_limit';
 if(/model_not_found|model.*(?:not found|not supported|does not exist|not available)/i.test(message))return 'model_unavailable';
 if(/permission denied|operation not permitted|access denied/i.test(message))return 'permission';
 if(/connection|dns|tls|network|timed? out|stream disconnected|error sending request/i.test(message))return 'network';
 return 'unknown';
}
export function validateDiagnostics(input){
 const d=fields(input,Object.keys(newDiagnostics()));
 const member=(v,values)=>v===null||values.includes(v);
 if(d.schemaVersion!==1||!stages.includes(d.stage)||!member(d.trigger,triggers)||!member(d.eventType,events)||!member(d.itemType,items)||!member(d.reportedErrorCategory,categories)||!member(d.osErrorCode,errnos)||!member(d.exitSignal,signals))fail('corrupt_record');
 if(d.exitCode!==null&&(!Number.isSafeInteger(d.exitCode)||d.exitCode<0||d.exitCode>255))fail('corrupt_record');
 for(const k of ['terminationRequested','closeObserved','threadObserved','turnObserved'])if(typeof d[k]!=='boolean')fail('corrupt_record');
 if(!d.closeObserved&&(d.exitCode!==null||d.exitSignal!==null)||d.exitCode!==null&&d.exitSignal!==null||d.turnObserved&&!d.threadObserved)fail('corrupt_record');
 return d;
}
