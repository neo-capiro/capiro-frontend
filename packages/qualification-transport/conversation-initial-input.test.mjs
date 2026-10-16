/** Synthetic public SDK controls; actual0.1.8 artifact and fresh SDK emit required before execution. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import canonicalize from 'canonicalize';
import {fixture, id, binding, run} from './conversation-fixture.mjs';

// Test-only owner receipts. Production consumers never implement this digest or fabricate views.
const hash=value=>createHash('sha256').update(canonicalize(value)).digest('hex');
const input=()=>({requestId:id(6),prompt:'Original synthetic input'});
const route=f=>f.calls.map(call=>call.path.split('/').at(-1));
function initialFixture(t){
  const f=fixture();t.after(f.close);
  let allocation,claims=0;
  f.allocate=body=>{
    if(!allocation){
      f.stored={...f.stored,requestId:body.requestId,prompt:body.prompt,windowRequest:body.windowRequest??null};
      allocation={binding:structuredClone(binding),scopes:structuredClone(run.scopes),versions:structuredClone(run.versions),
        selectedClientId:id(5),requestId:body.requestId,inputSha256:hash(body),requestSha256:hash(f.stored),
        allocatedAtMs:Date.now()-1000,expiresAtMs:Date.now()+60_000};
    }
    return {allocation:structuredClone(allocation),state:f.accepted?'ACCEPTED':'RESERVED',created:++claims===1};
  };
  f.override=async call=>{
    const custom=await f.routeOverride?.(call);
    if(custom!==undefined)return custom;
    if(call.path.endsWith('/input/allocate'))return Response.json(f.allocate(call.body));
    if(call.path.endsWith('/input/admit'))f.accepted=true;
  };
  return f;
}

test('synthetic initial allocation and genuine admission precede identical submit without a fabricated observation',async t=>{
  const f=initialFixture(t);
  f.routeOverride=call=>{
    if(call.path.endsWith('/input/admit'))assert.equal(f.client.getSnapshot().observation,null);
  };
  await f.client.submitInitial(input());
  assert.deepEqual(route(f),['allocate','admit','submit']);
  assert.equal(new Set(f.calls.map(call=>call.rawBody)).size,1);
  assert.equal(f.client.getSnapshot().submit,'observed');
  assert.deepEqual(f.client.getSnapshot().observation.events,[]);
  assert.equal(f.client.getSnapshot().observation.after,0);
});

test('synthetic lost allocation ACK recovers exact retained intent with created false',async t=>{
  const f=initialFixture(t);let lost=true;
  f.routeOverride=call=>{
    if(call.path.endsWith('/input/allocate')&&lost){lost=false;f.allocate(call.body);throw Error('Lost allocation ACK');}
  };
  const proposed=input();await assert.rejects(f.client.submitInitial(proposed));proposed.prompt='Changed draft';
  assert.deepEqual(route(f),['allocate']);
  await assert.rejects(f.client.submitInitial(proposed));
  await f.client.retrySubmit();
  assert.deepEqual(route(f),['allocate','allocate','admit','submit']);
  assert.equal(new Set(f.calls.map(call=>call.rawBody)).size,1);
});

for(const stage of ['admit','submit'])test(`synthetic lost ${stage} ACK preserves original allocation and complete request on retry`,async t=>{
  const f=initialFixture(t);let lost=true;
  f.routeOverride=call=>{
    if(call.path.endsWith('/'+stage)&&lost){lost=false;f.accepted=true;throw Error('Lost ACK');}
  };
  f.stored.window={basis:'calendar-month',startInclusive:'2026-10-01T00:00:00Z',endExclusive:'2026-11-01T00:00:00Z',timezone:'UTC',weekStartsOn:null};
  const proposed={...input(),windowRequest:{basis:'calendar-month',offset:0,timezone:'UTC'}};
  await assert.rejects(f.client.submitInitial(proposed));
  proposed.windowRequest.timezone='America/New_York';
  await f.client.retrySubmit();
  assert.equal(new Set(f.calls.map(call=>call.rawBody)).size,1);
  assert.equal(f.client.getSnapshot().submit,'observed');
});

for(const [name,change] of [
  ['attempt',value=>{value.run.binding.attemptId=id(88);}],
  ['worker',value=>{value.run.binding.workerId=id(88);}],
  ['fence',value=>{value.run.binding.writerFence=2;}],
  ['versions',value=>{value.run.versions.sdk='0.3.296';}],
  ['scopes',value=>{value.run.scopes.push({...value.run.scopes[0],resourceId:id(88)});}],
  ['prepared request',value=>{value.request.windowRequest={basis:'unbounded'};}],
])test(`synthetic full allocation pin rejects substituted ${name} despite matching five session context IDs`,async t=>{
  const f=initialFixture(t);
  f.routeOverride=call=>{
    if(!call.path.endsWith('/input/admit'))return;
    const receipt={run:structuredClone(run),request:structuredClone(f.stored),lastSequence:2,replayed:false};
    change(receipt);return Response.json(receipt);
  };
  await assert.rejects(f.client.submitInitial(input()));
  assert.deepEqual(route(f),['allocate','admit']);assert.equal(f.client.getSnapshot().observation,null);
});

test('synthetic repeated allocation cannot extend original expiry or alter prepared digest after an uncertain submit',async t=>{
  const f=initialFixture(t);let lost=true;
  f.routeOverride=call=>{
    if(call.path.endsWith('/submit')&&lost){lost=false;throw Error('Lost submit ACK');}
    if(call.path.endsWith('/input/allocate')&&!lost){const receipt=f.allocate(call.body);receipt.allocation.expiresAtMs++;return Response.json(receipt);}
  };
  await assert.rejects(f.client.submitInitial(input()));
  await assert.rejects(f.client.retrySubmit(),/INITIAL_INPUT_RECEIPT_DRIFT/);
  assert.deepEqual(route(f),['allocate','admit','submit','allocate']);
});

test('synthetic allocation UNKNOWN error is handled by its own receiver and never sent as input admission bytes',async t=>{
  const f=initialFixture(t);
  f.routeOverride=call=>call.path.endsWith('/input/allocate')?Response.json({error:{code:'INITIAL_INPUT_UNAVAILABLE',outcome:'UNKNOWN'}},{status:503}):undefined;
  await assert.rejects(f.client.submitInitial(input()),/INITIAL_INPUT_UNAVAILABLE/);
  assert.deepEqual(route(f),['allocate']);assert.equal(f.client.getSnapshot().submit,'unknown');
});

test('synthetic held allocation rejects repeated commands and stale lifetime cannot admit or submit after release',async t=>{
  const f=initialFixture(t);let release;
  f.routeOverride=call=>call.path.endsWith('/input/allocate')?new Promise(resolve=>{release=()=>resolve(Response.json(f.allocate(call.body)));}):undefined;
  const pending=f.client.submitInitial(input());
  while(!release)await Promise.resolve();
  await assert.rejects(f.client.submitInitial({...input(),requestId:id(9)}));
  await assert.rejects(f.client.submit({...input(),requestId:id(10)}));
  f.client.dispose();release();await assert.rejects(pending);
  assert.deepEqual(route(f),['allocate']);assert.equal(f.client.getSnapshot().status,'disposed');
});

test('synthetic stored recovery replays the exact request without invoking original allocation',async t=>{
  const f=initialFixture(t);await f.client.history();await f.submit();
  assert.deepEqual(route(f),['history','admit','submit']);
  assert.deepEqual(f.calls[1].body,{requestId:id(6),prompt:'Hello'});
  assert.equal(f.calls[1].rawBody,f.calls[2].rawBody);
  await assert.rejects(f.client.submitInitial({...input(),requestId:id(99)}),/initial-input-already-observed/);
});

test('synthetic changed prompt cannot reuse stored request ID',async t=>{
  const f=initialFixture(t);await f.client.history();
  await assert.rejects(f.client.submit(input()),error=>error.code==='REQUEST_MISMATCH');
  assert.deepEqual(route(f),['history','admit']);
});

test('synthetic allocation response bytes are bounded before canonical parsing or subsequent writes',async t=>{
  const f=initialFixture(t);
  f.routeOverride=call=>call.path.endsWith('/input/allocate')?Response.json({padding:'x'.repeat(131073)}):undefined;
  await assert.rejects(f.client.submitInitial(input()),/invalid-or-interrupted-body/);
  assert.deepEqual(route(f),['allocate']);
});

test('synthetic held allocation observes its public deadline without admission or durable cancellation',async t=>{
  const f=initialFixture(t);let signal;
  f.routeOverride=call=>call.path.endsWith('/input/allocate')?new Promise((_resolve,reject)=>{
    signal=call.signal;signal.addEventListener('abort',()=>reject(Error('Allocation deadline')),{once:true});
  }):undefined;
  await assert.rejects(f.client.submitInitial(input()),/Allocation deadline/);
  assert.equal(signal.aborted,true);assert.deepEqual(route(f),['allocate']);
});
