import {describe,it,expect,vi} from "vitest";
import {QueryClient} from "@tanstack/react-query";
import {fileChangeForIdSchema} from "/workspace/capiro-p1-files/apps/web/src/features/portfolio/files/contracts";
import {fileMetadataAttemptKey,setFileMetadataAttempt,settleFileMetadataAttempt} from "/workspace/capiro-p1-files/apps/web/src/features/portfolio/files/metadata-attempt";
import {saveFileMetadata,reviewFileMetadata} from "/workspace/capiro-p1-files/apps/web/src/features/portfolio/files/metadata-actions";
import {currentFileReader,currentFilesKey,assertFileReader} from "/workspace/capiro-p1-files/apps/web/src/features/portfolio/files/file-reader";
import {createApiClient} from "/workspace/capiro-p1-files/apps/web/src/shared/portfolio/api/http";
import {artifactReceiptSchema} from "/workspace/capiro-p1-calendar/apps/web/src/features/portfolio/calendar/artifacts/contracts";
import {meetingSaveReceiptSchema} from "/workspace/capiro-p1-calendar/apps/web/src/features/portfolio/calendar/meeting-save";
const id="00000000-0000-4000-8000-000000000003";
const file={id,fileName:"synthetic.pdf",folder:"Reports",viewerMode:"all",viewerUserIds:[],uploadedByUserId:"actor"};
const actor={userId:"actor",tenantId:"tenant"};
const meeting={id:"meeting",subject:"Synthetic",description:null,location:null,startsAt:"2026-10-10T14:00:00Z",endsAt:"2026-10-10T15:00:00Z",status:"scheduled",joinLink:null,visibility:"private",isVirtual:false,meri:null,client:{id:"client",name:"Synthetic"},attendees:[],preps:[]};
const meta={id:"artifact",meetingId:"meeting",clientId:"client",authorUserId:"actor",confidential:false,status:"approved",sharedAt:null,sharedByUserId:null,createdAt:"2026-10-10T15:00:00Z",updatedAt:"2026-10-10T15:00:00Z"};
it("Files compares restricted identities as a set, while all-mode does not grant meaning to inactive IDs",()=>{
 expect(fileChangeForIdSchema(id,{kind:"access",viewerMode:"restricted",viewerUserIds:[" a ","b","a",""]}).safeParse({...file,viewerMode:"restricted",viewerUserIds:["b","a"]}).success).toBe(true);
 expect(fileChangeForIdSchema(id,{kind:"access",viewerMode:"restricted",viewerUserIds:["a"]}).safeParse({...file,viewerMode:"restricted",viewerUserIds:["a","foreign"]}).success).toBe(false);
 expect(fileChangeForIdSchema(id,{kind:"access",viewerMode:"all",viewerUserIds:["ignored"]}).safeParse(file).success).toBe(true);
});
it("Files folder compares native trim/null without accepting wrong whitespace in persisted state",()=>{
 const schema=fileChangeForIdSchema(id,{kind:"move",folder:"  "});
 expect(schema.safeParse({...file,folder:null}).success).toBe(true);expect(schema.safeParse({...file,folder:" "}).success).toBe(false);
});
it("old Files settlements cannot clear a newer same-file attempt or repopulate a cleared cache",()=>{
 const cache=new QueryClient();const key=fileMetadataAttemptKey("client",id,actor);const change={kind:"move" as const,folder:"New"};
 setFileMetadataAttempt(cache,key,{token:2,status:"pending",change});settleFileMetadataAttempt(cache,key,1,false);expect(cache.getQueryData(key)).toMatchObject({token:2,status:"pending"});
 cache.clear();settleFileMetadataAttempt(cache,key,2,true);expect(cache.getQueryData(key)).toBeUndefined();cache.clear();
});
it("Files ACL and folder attempts share one fence and current review cannot run while a PATCH is pending",async()=>{
 const cache=new QueryClient({defaultOptions:{queries:{retry:false}}});cache.setQueryData(["identity"],{user:{id:"actor",email:"synthetic@example.test"},tenant:{id:"tenant",name:"Synthetic"},role:"standard_user"});cache.setQueryData(currentFilesKey(cache,"client"),[file]);
 const reader=currentFileReader(cache)!;const controller=new AbortController();const execution={actor:reader,signal:controller.signal,guard(){controller.signal.throwIfAborted();assertFileReader(cache,reader);}};
 let release!:(v:Response)=>void;const fetcher=vi.fn(()=>new Promise<Response>(r=>release=r));const api=createApiClient(fetcher);
 const pending=saveFileMetadata(api,cache,"client",id,{kind:"move",folder:"New"},execution);
 await expect(saveFileMetadata(api,cache,"client",id,{kind:"access",viewerMode:"restricted",viewerUserIds:[]},execution)).rejects.toMatchObject({status:409});
 await expect(reviewFileMetadata(api,cache,"client",id,execution)).rejects.toMatchObject({status:409});expect(fetcher).toHaveBeenCalledTimes(1);
 release(Response.json({...file,folder:"New"}));await pending;cache.clear();
});
for(const kind of ["notes","debriefs"] as const){
 it(`${kind} share requires selected metadata state, not just a matching decorated parent`,()=>{
  const schema=artifactReceiptSchema(meeting,kind,actor,{action:"share",id:"artifact"});const shared={...meta,sharedAt:meta.updatedAt,sharedByUserId:"prior-actor"};
  expect(schema.safeParse({...meeting,visibility:"shared",[kind]:[shared]}).success).toBe(true);
  for(const patch of [{status:"draft"},{confidential:true},{sharedAt:null},{sharedByUserId:null}])expect(schema.safeParse({...meeting,visibility:"shared",[kind]:[{...shared,...patch}]}).success).toBe(false);
  expect(schema.safeParse({...meeting,[kind]:[shared]}).success).toBe(false);
 });
 it(`${kind} unshare accepts another artifact remaining shared but not partial stamp removal`,()=>{
  const schema=artifactReceiptSchema(meeting,kind,actor,{action:"unshare",id:"artifact"});
  expect(schema.safeParse({...meeting,visibility:"shared",[kind]:[meta,{...meta,id:"another",sharedAt:meta.updatedAt,sharedByUserId:"prior"}]}).success).toBe(true);
  expect(schema.safeParse({...meeting,[kind]:[{...meta,sharedAt:meta.updatedAt}]}).success).toBe(false);
 });
}
it("Calendar native normalization accepts equivalent instants without requiring derived virtuality echoes",()=>{
 const input={subject:" Synthetic ",description:" ",location:" ",startsAt:"2026-10-10T10:00:00-04:00",endsAt:"2026-10-10T11:00:00-04:00",clientId:"client"};const schema=meetingSaveReceiptSchema("meeting",input);
 expect(schema.safeParse({...meeting,isVirtual:true,joinLink:"https://example.test/meet"}).success).toBe(true);
 for(const patch of [{subject:"Foreign"},{description:"Not blank"},{location:"Stale room"},{id:"foreign"},{client:null}])expect(schema.safeParse({...meeting,...patch}).success).toBe(false);
});
it("Calendar client clearing is distinguished from unscoped create autoassociation",()=>{
 const input={subject:meeting.subject,startsAt:meeting.startsAt,endsAt:meeting.endsAt,clientId:null};
 expect(meetingSaveReceiptSchema(undefined,input).safeParse(meeting).success).toBe(true);
 expect(meetingSaveReceiptSchema("meeting",input).safeParse(meeting).success).toBe(false);
 expect(meetingSaveReceiptSchema("meeting",input).safeParse({...meeting,client:null}).success).toBe(true);
});
