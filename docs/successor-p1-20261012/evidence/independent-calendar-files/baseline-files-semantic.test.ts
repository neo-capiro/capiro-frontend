import {it,expect} from "vitest";
import {fileChangeForIdSchema} from "./baseline-file-contracts";
const id="00000000-0000-4000-8000-000000000003";const receipt={id,fileName:"synthetic.pdf",folder:"Reports",viewerMode:"all",viewerUserIds:[]};
it("CP01 contradictory ACL receipt must be rejected",()=>{expect((fileChangeForIdSchema as any)(id,{kind:"access",viewerMode:"restricted",viewerUserIds:[]}).safeParse(receipt).success).toBe(false);});
it("CP02 contradictory destination receipt must be rejected",()=>{expect((fileChangeForIdSchema as any)(id,{kind:"move",folder:"New"}).safeParse(receipt).success).toBe(false);});
