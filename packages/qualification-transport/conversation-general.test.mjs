import test from 'node:test';
import assert from 'node:assert/strict';
import {createMeriConversation} from '@capiro/meri-client/conversation';
import {binding,run as clientRun,event,id,stream} from './conversation-fixture.mjs';

function generalCase(t,change={}){
 const scopes=[{tenantId:binding.tenantId,kind:'private-user',resourceId:binding.actorId,policyRevision:'policy1'}];
 const run={...structuredClone(clientRun),scopes,...change};
 const calls=[],events=[event(2,{scopes,type:'message.delta',data:{messageId:id(90),text:'General answer'}})];
 const state={denied:false,now:Date.now()};
 const stored={requestId:id(6),prompt:'General prompt',windowRequest:null,window:null,skill:null};
 const client=createMeriConversation({
  context:{tenantId:binding.tenantId,actorId:binding.actorId,conversationId:binding.conversationId,runId:binding.runId,selectedClientId:null},
  credential:'action_session_'+'s'.repeat(43),expiresAtMs:state.now+60_000,signal:new AbortController().signal,
  isCurrent:()=>true,onAccessLost:()=>{state.revoked=true;},now:()=>state.now,origin:'https://synthetic.invalid',
  fetchImpl:async(url,init)=>{
   const path=new URL(url).pathname,body=init.body?JSON.parse(init.body):undefined;calls.push({path,body,headers:new Headers(init.headers)});
   if(state.denied)return Response.json({error:{code:'SESSION_REFUSED'}},{status:403});
   if(path.endsWith('/history'))return Response.json({run,request:stored,events:[event(1,{scopes:run.scopes})],nextSequence:1,hasMore:false,lastSequence:1});
   if(path.endsWith('/input/admit'))return Response.json({run,request:{...stored,...body},lastSequence:1,replayed:false});
   if(path.endsWith('/submit'))return Response.json({run,requestId:body.requestId,lastSequence:1,replayed:false});
   if(path.endsWith('/cancel'))return Response.json({state:'cancelled'});
   if(path.endsWith('/stream')||path.endsWith('/events'))return stream(events);
   throw Error('Unexpected route');
  },
 });
 t.after(()=>client.dispose());return {client,calls,state,events,scopes};
}

test('actual SDK accepts explicit General history, streams once at the durable cursor and retains Stop',async t=>{
 const f=generalCase(t);await f.client.history();
 const chat=f.client.openChat().chat;await chat.resumeStream();
 assert.equal(f.client.getSnapshot().observation.after,2);
 assert.equal(f.client.getSnapshot().observation.events[1].data.text,'General answer');
 f.events.splice(0);await chat.resumeStream();
 assert.equal(f.calls.at(-1).headers.get('x-meri-resume-sequence'),'2');
 assert.equal(f.client.getSnapshot().observation.events.length,2);
 assert.equal((await f.client.cancel()).state,'cancelled');
 assert.equal(f.calls.filter(x=>x.path.endsWith('/cancel')).length,1);
});

test('explicit General input uses the actual public receiver and cannot manufacture a client binding',async t=>{
 const f=generalCase(t);await f.client.submit({requestId:id(6),prompt:'General prompt'});
 assert.equal(f.client.getSnapshot().status,'ready');
 assert.deepEqual(f.calls.filter(x=>x.body?.prompt).map(x=>x.body),Array(2).fill({requestId:id(6),prompt:'General prompt'}));
});

for(const [name,scopes] of [
 ['client',[{tenantId:binding.tenantId,kind:'client',resourceId:id(5),policyRevision:'policy1'}]],
 ['other actor',[{tenantId:binding.tenantId,kind:'private-user',resourceId:'foreign',policyRevision:'policy1'}]],
 ['other tenant',[{tenantId:'foreign',kind:'private-user',resourceId:binding.actorId,policyRevision:'policy1'}]],
 ['mixed',[{tenantId:binding.tenantId,kind:'private-user',resourceId:binding.actorId,policyRevision:'policy1'},{tenantId:binding.tenantId,kind:'client',resourceId:id(5),policyRevision:'policy1'}]],
])test(`General receiver refuses ${name} scope`,async t=>{
 const f=generalCase(t,{scopes});await assert.rejects(f.client.history());assert.notEqual(f.client.getSnapshot().status,'ready');
});

test('General revocation retires the SDK connection and cannot dispatch Stop or another prompt',async t=>{
 const f=generalCase(t);await f.client.history();f.state.denied=true;
 await assert.rejects(f.client.cancel());assert.equal(f.state.revoked,true);const count=f.calls.length;
 await assert.rejects(f.client.submit({requestId:id(8),prompt:'must not dispatch'}));assert.equal(f.calls.length,count);
});
