import {describe,it,expect} from 'vitest';
import {artifactReceiptSchema} from '@review/artifacts/contracts';
import {meetingSaveReceiptSchema} from '@review/meeting-save';
const actor={userId:'review-user',tenantId:'review-tenant'};
const meeting={id:'review-meeting',subject:'Review',description:null,location:null,startsAt:'2026-10-12T10:00:00.000Z',endsAt:'2026-10-12T11:00:00.000Z',status:'scheduled',joinLink:null,visibility:'private',isVirtual:false,meri:null,client:{id:'review-client',name:'Review client'},attendees:[],preps:[]};
const common={id:'review-artifact',meetingId:meeting.id,clientId:meeting.client.id,authorUserId:actor.userId,author:{id:actor.userId,email:'synthetic@example.invalid',firstName:'Synthetic',lastName:'Reviewer'},confidential:false,accessLevel:'tenant_members',keyVersion:null,sharedAt:null,sharedByUserId:null,createdAt:'2026-10-12T11:00:00.000Z',updatedAt:'2026-10-12T11:00:00.000Z'};
const save={action:'save' as const,body:'Synthetic encrypted input; native does not echo plaintext',confidential:false};
for(const kind of ['notes','debriefs'] as const){
 const native={...common,status:kind==='notes'?'draft':'generated',...(kind==='notes'?{accessLevel:'tenant_admins_and_author',approvedAt:null,approvedByUserId:null}:{})};
 const approved={...native,status:'approved',...(kind==='notes'?{approvedAt:native.updatedAt,approvedByUserId:actor.userId}:{})};
 describe(kind,()=>{
  it('accepts native creation metadata without body or tenantId',()=>expect(artifactReceiptSchema(meeting,kind,actor,save).safeParse(native).success).toBe(true));
  it('rejects swapped kind lifecycle on create',()=>expect(artifactReceiptSchema(meeting,kind,actor,save).safeParse({...native,status:kind==='notes'?'generated':'draft'}).success).toBe(false));
  it.each(['authorUserId','meetingId','clientId'])('rejects creation receipt with wrong %s',key=>expect(artifactReceiptSchema(meeting,kind,actor,save).safeParse({...native,[key]:'wrong'}).success).toBe(false));
  it('requires matching explicit confidential state',()=>expect(artifactReceiptSchema(meeting,kind,actor,save).safeParse({...native,confidential:true}).success).toBe(false));
  it('rejects incomplete id-only receipt',()=>expect(artifactReceiptSchema(meeting,kind,actor,save).safeParse({id:native.id}).success).toBe(false));
  it.each(['other-author',null])('accepts current edited receipt with preserved admin-editable author %s',authorUserId=>expect(artifactReceiptSchema(meeting,kind,actor,{...save,id:native.id}).safeParse({...native,authorUserId,status:'edited'}).success).toBe(true));
  it('rejects update that did not clear sharing',()=>expect(artifactReceiptSchema(meeting,kind,actor,{...save,id:native.id}).safeParse({...native,status:'edited',sharedAt:native.updatedAt,sharedByUserId:'prior-sharer'}).success).toBe(false));
  it('accepts native approval with null/deleted author',()=>expect(artifactReceiptSchema(meeting,kind,actor,{action:'approve',id:native.id}).safeParse({...approved,authorUserId:null,...(kind==='notes'?{approvedAt:native.updatedAt,approvedByUserId:actor.userId}:{})}).success).toBe(true));
  it.each(['prior-sharer',null])('accepts native idempotent share with preserved sharer %s',sharedByUserId=>expect(artifactReceiptSchema(meeting,kind,actor,{action:'share',id:native.id}).safeParse({...meeting,visibility:'shared',[kind]:[{...approved,sharedAt:native.updatedAt,sharedByUserId}]}).success).toBe(true));
  it('rejects share lacking current sharedAt even if visible-shared',()=>expect(artifactReceiptSchema(meeting,kind,actor,{action:'share',id:native.id}).safeParse({...meeting,visibility:'shared',[kind]:[{...approved,sharedByUserId:'prior'}]}).success).toBe(false));
  it('rejects share for duplicate selected artifacts',()=>{const a={...approved,sharedAt:native.updatedAt,sharedByUserId:'prior'};expect(artifactReceiptSchema(meeting,kind,actor,{action:'share',id:native.id}).safeParse({...meeting,visibility:'shared',[kind]:[a,a]}).success).toBe(false)});
  it('accepts unshare preserving meeting visibility for other shared artifacts',()=>expect(artifactReceiptSchema(meeting,kind,actor,{action:'unshare',id:native.id}).safeParse({...meeting,visibility:'shared',[kind]:[{...approved},{...native,id:'still-shared',status:'approved',sharedAt:native.updatedAt,sharedByUserId:'prior'}]}).success).toBe(true));
  if(kind==='notes'){
   it('rejects stale approval stamps on note edit',()=>expect(artifactReceiptSchema(meeting,kind,actor,{...save,id:native.id}).safeParse({...native,status:'edited',approvedAt:native.updatedAt,approvedByUserId:actor.userId}).success).toBe(false));
   it('rejects stale approval stamps on note creation',()=>expect(artifactReceiptSchema(meeting,kind,actor,save).safeParse({...native,approvedAt:native.updatedAt,approvedByUserId:actor.userId}).success).toBe(false));
   it('requires current actor on note approval (native reapprove overwrites stamp)',()=>expect(artifactReceiptSchema(meeting,kind,actor,{action:'approve',id:native.id}).safeParse({...approved,approvedAt:native.updatedAt,approvedByUserId:'prior-approver'}).success).toBe(false));
  }
 });
}
describe('meeting client association',()=>{
 const input={subject:meeting.subject,description:'',location:'',startsAt:meeting.startsAt,endsAt:meeting.endsAt};
 it('accepts inferred client for unscoped creation',()=>expect(meetingSaveReceiptSchema(undefined,input).safeParse(meeting).success).toBe(true));
 it('accepts retained client when update omits property',()=>expect(meetingSaveReceiptSchema(meeting.id,input).safeParse(meeting).success).toBe(true));
 it('refuses old association for explicit clear',()=>expect(meetingSaveReceiptSchema(meeting.id,{...input,clientId:null}).safeParse(meeting).success).toBe(false));
 it('accepts native explicit-clear receipt',()=>expect(meetingSaveReceiptSchema(meeting.id,{...input,clientId:null}).safeParse({...meeting,client:null}).success).toBe(true));
});
