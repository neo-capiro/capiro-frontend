const imgClose = "https://www.figma.com/api/mcp/asset/f7c73cbb-1a5d-45c7-aac6-5d359ef39432.svg";
const imgDot = "https://www.figma.com/api/mcp/asset/686a4b26-0609-48c0-b300-3a342bc70d72.svg";

type InfoTipProps = {
  className?: string;
  state?: "Default";
};

function InfoTip({ className, state = "Default" }: InfoTipProps) {
  return (
    <div className={className || "bg-[var(--muted,#f5f5f4)] border border-[var(--border-strong,#d6d3d1)] border-solid content-stretch flex items-center justify-center relative rounded-[999px] size-[16px]"} data-node-id="411:40618">
      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:40619">
        i
      </p>
    </div>
  );
}

export default function OverlayDialogGovernmentInfo() {
  return (
    <div className="relative size-full" data-node-id="411:47482" data-name="Overlay · Dialog · Government info">
      <a className="absolute bg-[rgba(10,10,10,0.42)] block cursor-pointer h-[1040px] left-0 top-0 w-[1440px]" data-node-id="411:47483" data-name="Scrim (click to close)" />
      <div className="absolute bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-col gap-[20px] items-start left-[420px] overflow-clip p-[24px] rounded-[16px] shadow-[0px_16px_40px_-12px_rgba(12,10,9,0.18),0px_2px_6px_0px_rgba(12,10,9,0.05)] top-[150px] w-[600px]" data-node-id="411:47484" data-name="Dialog · Government info">
        <div className="content-stretch flex gap-[12px] items-start overflow-clip relative shrink-0 w-full" data-node-id="411:47485" data-name="Header">
          <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-w-px overflow-clip relative" data-node-id="411:47486" data-name="Title">
            <div className="content-stretch flex gap-[6px] items-center relative shrink-0" data-node-id="411:47487" data-name="Info row">
              <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[20px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.3px] whitespace-nowrap" data-node-id="411:47488">
                Government info
              </p>
              <InfoTip className="bg-[var(--muted,#f5f5f4)] border border-[var(--border-strong,#d6d3d1)] border-solid content-stretch flex items-center justify-center relative rounded-[999px] shrink-0 size-[16px]" />
            </div>
          </div>
          <button className="block cursor-pointer relative shrink-0 size-[18px]" data-node-id="411:47490" data-name="Close">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgClose} />
          </button>
        </div>
        <div className="content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-full" data-node-id="411:47492" data-name="Registration">
          <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="411:47493">
            Registration
          </p>
          <div className="h-[6px] relative shrink-0 w-px" data-node-id="411:47494" data-name="Frame" />
          <div className="border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[16px] items-center overflow-clip py-[9px] relative shrink-0 w-full" data-node-id="411:47495" data-name="CAGE code">
            <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] w-[170px]" data-node-id="411:47496">
              CAGE code
            </p>
            <div className="content-center flex flex-[1_0_0] flex-wrap items-center min-w-px overflow-clip relative" data-node-id="411:47497" data-name="Value">
              <p className="[word-break:break-word] font-['Geist_Mono:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] whitespace-nowrap" data-node-id="411:47498">
                1ABC2
              </p>
            </div>
          </div>
          <div className="border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[16px] items-center overflow-clip py-[9px] relative shrink-0 w-full" data-node-id="411:47499" data-name="UEI">
            <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] w-[170px]" data-node-id="411:47500">
              UEI
            </p>
            <div className="content-center flex flex-[1_0_0] flex-wrap items-center min-w-px overflow-clip relative" data-node-id="411:47501" data-name="Value">
              <p className="[word-break:break-word] font-['Geist_Mono:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] whitespace-nowrap" data-node-id="411:47502">
                ABC123DEF456
              </p>
            </div>
          </div>
          <div className="border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[16px] items-center overflow-clip py-[9px] relative shrink-0 w-full" data-node-id="411:47503" data-name="SAM.gov status">
            <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] w-[170px]" data-node-id="411:47504">
              SAM.gov status
            </p>
            <div className="content-center flex flex-[1_0_0] flex-wrap items-center min-w-px overflow-clip relative" data-node-id="411:47505" data-name="Value">
              <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch flex gap-[6px] h-[22px] items-center pl-[8px] pr-[9px] relative rounded-[var(--radius-full,999px)] shrink-0" data-node-id="411:47506" data-name="v2/Chip">
                <div className="relative shrink-0 size-[6px]" data-node-id="I411:47506;12:406" data-name="Dot">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgDot} />
                </div>
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] whitespace-nowrap" data-node-id="I411:47506;12:407">
                  Active
                </p>
              </div>
            </div>
          </div>
          <div className="border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[16px] items-center overflow-clip py-[9px] relative shrink-0 w-full" data-node-id="411:47507" data-name="SAM.gov expiration">
            <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] w-[170px]" data-node-id="411:47508">
              SAM.gov expiration
            </p>
            <div className="content-center flex flex-[1_0_0] flex-wrap items-center min-w-px overflow-clip relative" data-node-id="411:47509" data-name="Value">
              <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] whitespace-nowrap" data-node-id="411:47510">
                Jun 14, 2027
              </p>
            </div>
          </div>
          <div className="border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[16px] items-center overflow-clip py-[9px] relative shrink-0 w-full" data-node-id="411:47511" data-name="LDA registrant">
            <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] w-[170px]" data-node-id="411:47512">
              LDA registrant
            </p>
            <div className="content-center flex flex-[1_0_0] flex-wrap items-center min-w-px overflow-clip relative" data-node-id="411:47513" data-name="Value">
              <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] whitespace-nowrap" data-node-id="411:47514">
                Capiro Government Affairs
              </p>
            </div>
          </div>
          <div className="border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[16px] items-center overflow-clip py-[9px] relative shrink-0 w-full" data-node-id="411:47515" data-name="EIN">
            <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] w-[170px]" data-node-id="411:47516">
              EIN
            </p>
            <div className="content-center flex flex-[1_0_0] flex-wrap items-center min-w-px overflow-clip relative" data-node-id="411:47517" data-name="Value">
              <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] whitespace-nowrap" data-node-id="411:47518">
                12‑3456789
              </p>
            </div>
          </div>
          <div className="border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[16px] items-center overflow-clip py-[9px] relative shrink-0 w-full" data-node-id="411:47519" data-name="NAICS">
            <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] w-[170px]" data-node-id="411:47520">
              NAICS
            </p>
            <div className="content-center flex flex-[1_0_0] flex-wrap gap-[0px_6px] items-center min-w-px overflow-clip relative" data-node-id="411:47521" data-name="Value">
              <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-start overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:47522" data-name="Tag/541330">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] whitespace-nowrap" data-node-id="411:47523">
                  541330
                </p>
              </div>
              <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-start overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:47524" data-name="Tag/541512">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] whitespace-nowrap" data-node-id="411:47525">
                  541512
                </p>
              </div>
            </div>
          </div>
          <div className="border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[16px] items-center overflow-clip py-[9px] relative shrink-0 w-full" data-node-id="411:47526" data-name="PSC">
            <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] w-[170px]" data-node-id="411:47527">
              PSC
            </p>
            <div className="content-center flex flex-[1_0_0] flex-wrap gap-[0px_6px] items-center min-w-px overflow-clip relative" data-node-id="411:47528" data-name="Value">
              <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-start overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:47529" data-name="Tag/R425">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] whitespace-nowrap" data-node-id="411:47530">
                  R425
                </p>
              </div>
              <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-start overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:47531" data-name="Tag/AC12">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] whitespace-nowrap" data-node-id="411:47532">
                  AC12
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-full" data-node-id="411:47533" data-name="Sector and tracks">
          <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="411:47534">
            Sector and tracks
          </p>
          <div className="h-[6px] relative shrink-0 w-px" data-node-id="411:47535" data-name="Frame" />
          <div className="border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[16px] items-center overflow-clip py-[9px] relative shrink-0 w-full" data-node-id="411:47536" data-name="Sector">
            <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] w-[170px]" data-node-id="411:47537">
              Sector
            </p>
            <div className="content-center flex flex-[1_0_0] flex-wrap gap-[0px_6px] items-center min-w-px overflow-clip relative" data-node-id="411:47538" data-name="Value">
              <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-start overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:47539" data-name="Tag/Defense · primary">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] whitespace-nowrap" data-node-id="411:47540">
                  Defense · primary
                </p>
              </div>
              <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-start overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:47541" data-name="Tag/Commerce / Tech">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] whitespace-nowrap" data-node-id="411:47542">
                  Commerce / Tech
                </p>
              </div>
              <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-start overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:47543" data-name="Tag/Homeland Security">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] whitespace-nowrap" data-node-id="411:47544">
                  Homeland Security
                </p>
              </div>
            </div>
          </div>
          <div className="border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[16px] items-center overflow-clip py-[9px] relative shrink-0 w-full" data-node-id="411:47545" data-name="Active tracks">
            <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] w-[170px]" data-node-id="411:47546">
              Active tracks
            </p>
            <div className="content-center flex flex-[1_0_0] flex-wrap gap-[0px_6px] items-center min-w-px overflow-clip relative" data-node-id="411:47547" data-name="Value">
              <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-start overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:47548" data-name="Tag/NDAA Authorization Request">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] whitespace-nowrap" data-node-id="411:47549">
                  NDAA Authorization Request
                </p>
              </div>
              <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-start overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:47550" data-name="Tag/Appropriations Plus‑Up">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] whitespace-nowrap" data-node-id="411:47551">
                  Appropriations Plus‑Up
                </p>
              </div>
            </div>
          </div>
          <div className="border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[16px] items-center overflow-clip py-[9px] relative shrink-0 w-full" data-node-id="411:47552" data-name="LDA issue codes">
            <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] w-[170px]" data-node-id="411:47553">
              LDA issue codes
            </p>
            <div className="content-center flex flex-[1_0_0] flex-wrap gap-[0px_6px] items-center min-w-px overflow-clip relative" data-node-id="411:47554" data-name="Value">
              <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-start overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:47555" data-name="Tag/BUD">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] whitespace-nowrap" data-node-id="411:47556">
                  BUD
                </p>
              </div>
              <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-start overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:47557" data-name="Tag/DEF">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] whitespace-nowrap" data-node-id="411:47558">
                  DEF
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="content-stretch flex gap-[8px] items-center overflow-clip relative shrink-0 w-full" data-node-id="411:47559" data-name="Footer">
          <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular'] font-normal leading-[1.4] min-w-px relative text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:47560">
            Sample data · SAM.gov, LDA
          </p>
          <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="411:47561" data-name="Edit client">
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="I411:47561;12:379">
              Edit client
            </p>
          </div>
          <button className="content-stretch cursor-pointer drop-shadow-[0px_1px_1px_rgba(12,10,9,0.14)] flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="411:47562" data-name="Done">
            <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[var(--radius-lg,10px)]" style={{ backgroundImage: "linear-gradient(160.79317768952552deg, rgb(36, 36, 36) 0%, rgb(10, 10, 10) 100%)" }} />
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--primary-foreground,white)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I411:47562;12:373">
              Done
            </p>
            <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.14)]" />
          </button>
        </div>
      </div>
    </div>
  );
}