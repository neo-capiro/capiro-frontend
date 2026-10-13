const imgCapiro31ProfilePicture = "https://www.figma.com/api/mcp/asset/fbf7aead-7b49-4746-8774-e8b7270c6bf8.svg";
const imgCapiroWordmark = "https://www.figma.com/api/mcp/asset/70d60a6d-04ad-468e-9103-8f2a42bebc08.png";
const imgIcon = "https://www.figma.com/api/mcp/asset/065179e6-4991-48fa-96c6-9bb075aa6d4e.svg";
const imgIcon1 = "https://www.figma.com/api/mcp/asset/5ab2fb94-8951-4fba-b6df-dbda879f5628.svg";
const imgIcon2 = "https://www.figma.com/api/mcp/asset/83c849d1-81fd-437c-91c5-2f1bf29fbaa6.svg";
const imgIcon3 = "https://www.figma.com/api/mcp/asset/37dc0599-d7a8-4426-8098-7a0474ef5b6f.svg";
const imgIcon4 = "https://www.figma.com/api/mcp/asset/7ab9b8b3-d775-4a53-80dd-165693ed3441.svg";
const imgIcon5 = "https://www.figma.com/api/mcp/asset/eaccd953-8120-497a-97f9-61e95dc74cdd.svg";
const imgIcon6 = "https://www.figma.com/api/mcp/asset/35fe0a18-f8da-46fc-92eb-93a7256db5a9.svg";
const imgIcon7 = "https://www.figma.com/api/mcp/asset/45392c79-e7d0-4290-a854-8bdeb7b88fa6.svg";
const imgIcon8 = "https://www.figma.com/api/mcp/asset/04810ffd-ad57-4dcb-8c32-a77bea0aca77.svg";
const imgIcon9 = "https://www.figma.com/api/mcp/asset/7694c0d8-7ed1-4347-aa45-bb41eecbddf7.svg";

type V2ContactFieldProps = {
  className?: string;
  label?: string;
  showChevron?: boolean;
  type?: "Line" | "Multiline";
  value?: string;
};

function V2ContactField({ className, label = "Name *", showChevron = false, type = "Line", value = "Jordan Park" }: V2ContactFieldProps) {
  const isMultiline = type === "Multiline";
  return (
    <div className={className || "content-stretch flex flex-col gap-[var(--theme(spacing.1.5),6px)] items-start justify-center relative w-[582px]"} id={isMultiline ? "node-431_41486" : "node-431_41485"}>
      <p className="font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] w-full" data-node-id="431:41488">
        {label}
      </p>
      <div className={`bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex font-["Geist:Regular"] font-normal leading-[1.45] overflow-clip px-[var(--theme(spacing.3),12px)] py-[9px] relative rounded-[var(--radius-md,8px)] shrink-0 text-[13px] tracking-[-0.039px] w-full ${isMultiline ? "h-[88px] items-start" : "h-[36px] items-center"}`} id={isMultiline ? "node-431_41493" : "node-431_41489"} data-name="Input">
        <p className="flex-[1_0_0] min-w-px relative text-[color:var(--foreground,#0a0a0a)]" data-node-id="431:41490">
          {value}
        </p>
        {showChevron && (
          <p className="h-[17px] relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-[12px]" data-node-id="431:41491">
            ⌄
          </p>
        )}
      </div>
    </div>
  );
}

function Capiro31ProfilePicture({ className }: { className?: string }) {
  return (
    <div className={className || "relative size-[32px]"} data-node-id="469:41439" data-name="Capiro 3.1/Profile picture">
      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCapiro31ProfilePicture} />
    </div>
  );
}

export default function ProspectEditDetailsSectorTracks() {
  return (
    <div className="bg-[var(--background,#f5f5f4)] relative size-full" data-node-id="517:122239" data-name="Prospect · Edit details · Sector & Tracks">
      <div className="absolute bg-[var(--card,white)] border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[var(--theme(spacing.5),20px)] h-[64px] items-center left-0 px-[var(--theme(spacing.4),16px)] top-0 w-[1440px]" data-node-id="517:122240" data-name="Capiro · Shared header">
        <div className="content-stretch flex h-[32px] items-center overflow-clip relative shrink-0 w-[196px]" data-node-id="I517:122240;469:41501" data-name="Brand · Capiro · Home">
          <div className="h-[26px] relative shrink-0 w-[77px]" data-node-id="I517:122240;469:41502" data-name="Capiro wordmark">
            <img alt="" className="absolute inset-0 max-w-none object-contain pointer-events-none size-full" src={imgCapiroWordmark} />
          </div>
        </div>
        <div className="bg-[var(--muted,#f5f5f4)] content-stretch cursor-pointer flex gap-[var(--theme(spacing.1),4px)] items-center justify-center overflow-clip p-[var(--theme(spacing.1),4px)] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="I517:122240;469:41503" data-name="Modes · Portfolio active">
          <a className="content-stretch flex gap-[8px] h-[36px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 w-[40px]" data-node-id="I517:122240;469:41504" data-name="Mode · Meri">
            <div className="relative shrink-0 size-[16px]" data-node-id="I517:122240;469:41504;12:383" data-name="Icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon} />
            </div>
          </a>
          <a className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex gap-[8px] h-[36px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 w-[40px]" data-node-id="I517:122240;469:41510" data-name="Mode · Portfolio">
            <div className="relative shrink-0 size-[16px]" data-node-id="I517:122240;469:41510;12:377" data-name="Icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon1} />
            </div>
          </a>
          <a className="content-stretch flex gap-[8px] h-[36px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 w-[40px]" data-node-id="I517:122240;469:41516" data-name="Mode · Modules">
            <div className="relative shrink-0 size-[16px]" data-node-id="I517:122240;469:41516;12:383" data-name="Icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon2} />
            </div>
          </a>
        </div>
        <div className="flex-[1_0_0] h-px min-w-px relative" data-node-id="I517:122240;469:41522" data-name="Flexible space" />
        <div className="content-stretch cursor-pointer flex gap-[var(--theme(spacing.3),12px)] h-[40px] items-center overflow-clip relative shrink-0" data-node-id="I517:122240;469:41523" data-name="Global actions">
          <a className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 size-[40px]" data-node-id="I517:122240;644:139304" data-name="Action · Quick log">
            <div className="relative shrink-0 size-[16px]" data-node-id="I517:122240;644:139304;12:383" data-name="Icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon3} />
            </div>
          </a>
          <a className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 size-[40px]" data-node-id="I517:122240;501:42742" data-name="Action · Master calendar">
            <div className="relative shrink-0 size-[16px]" data-node-id="I517:122240;501:42742;12:383" data-name="Icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon4} />
            </div>
          </a>
          <a className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 size-[40px]" data-node-id="I517:122240;469:41524" data-name="Action · Search">
            <div className="relative shrink-0 size-[16px]" data-node-id="I517:122240;469:41524;12:383" data-name="Icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon5} />
            </div>
          </a>
          <a className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 size-[40px]" data-node-id="I517:122240;469:41532" data-name="Action · Updates">
            <div className="relative shrink-0 size-[16px]" data-node-id="I517:122240;469:41532;12:383" data-name="Icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon6} />
            </div>
          </a>
          <a className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-center justify-center overflow-clip relative shrink-0 size-[40px]" data-node-id="I517:122240;469:41540" data-name="Action · Profile">
            <Capiro31ProfilePicture className="relative shrink-0 size-[32px]" />
          </a>
        </div>
      </div>
      <div className="absolute bg-[var(--border,#e7e5e4)] h-px left-0 top-[64px] w-[1440px]" data-node-id="517:122242" data-name="Capiro · Header divider" />
      <div className="absolute content-stretch flex h-[975px] items-start left-0 overflow-clip top-[65px] w-[1440px]" data-node-id="517:122243" data-name="Capiro · Workspace body">
        <div className="bg-[var(--card,white)] border-[var(--border,#e7e5e4)] border-r border-solid content-stretch flex flex-col gap-[var(--theme(spacing.3),12px)] h-full items-start p-[var(--theme(spacing.4),16px)] relative shrink-0 w-[232px]" data-node-id="517:122244" data-name="Capiro · Portfolio navigation">
          <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="I517:122244;471:92356">
            PORTFOLIO
          </p>
          <div className="content-stretch cursor-pointer flex flex-col gap-[var(--theme(spacing.1),4px)] items-start overflow-clip relative shrink-0 w-[200px]" data-node-id="I517:122244;471:92357" data-name="Portfolio navigation">
            <a className="content-stretch flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I517:122244;471:92358" data-name="Nav · Portfolio">
              <div className="relative shrink-0 size-[16px]" data-node-id="I517:122244;471:92358;12:383" data-name="Icon">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon2} />
              </div>
              <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:122244;471:92358;12:385">
                Overview
              </p>
            </a>
            <a className="content-stretch flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I517:122244;471:92369" data-name="Nav · Clients">
              <div className="relative shrink-0 size-[16px]" data-node-id="I517:122244;471:92369;12:383" data-name="Icon">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon7} />
              </div>
              <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:122244;471:92369;12:385">
                Clients
              </p>
            </a>
            <a className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I517:122244;471:92378" data-name="Nav · Prospects">
              <div className="relative shrink-0 size-[16px]" data-node-id="I517:122244;471:92378;12:383" data-name="Icon">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon8} />
              </div>
              <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:122244;471:92378;12:385">
                Prospects
              </p>
            </a>
          </div>
          <div className="flex-[1_0_0] min-h-px relative w-[200px]" data-node-id="I517:122244;471:92387" data-name="Flexible space" />
          <div className="content-stretch flex flex-col gap-[var(--theme(spacing.1),4px)] items-start overflow-clip relative shrink-0 w-[200px]" data-node-id="I517:122244;471:92388" data-name="Workspace settings">
            <a className="content-stretch cursor-pointer flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I517:122244;471:92389" data-name="Nav · Settings">
              <div className="relative shrink-0 size-[16px]" data-node-id="I517:122244;471:92389;12:383" data-name="Icon">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon9} />
              </div>
              <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:122244;471:92389;12:385">
                Settings
              </p>
            </a>
          </div>
        </div>
        <div className="content-stretch flex flex-[1_0_0] flex-col gap-[20px] h-full items-start min-w-px overflow-x-clip overflow-y-auto pb-[32px] pt-[24px] px-[32px] relative" data-node-id="517:122245" data-name="Main">
          <div className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-center overflow-clip relative shrink-0 w-full" data-node-id="517:122246" data-name="Breadcrumb and return">
            <a className="content-stretch cursor-pointer flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:122247" data-name="← Prospects">
              <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:122247;12:385">
                ← Prospects
              </p>
            </a>
            <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular'] font-normal h-[20px] leading-[1.4] min-w-px relative text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="517:122248">
              Portfolio / Prospects / Company details
            </p>
          </div>
          <div className="content-stretch flex gap-[var(--theme(spacing.4),16px)] items-center overflow-clip relative shrink-0 w-full" data-node-id="517:122249" data-name="Company profile heading">
            <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex flex-col items-center justify-center overflow-clip relative rounded-[var(--radius-lg,10px)] shrink-0 size-[44px]" data-node-id="517:122250" data-name="Company logo">
              <p className="[word-break:break-word] font-['Geist:SemiBold'] font-semibold leading-[1.35] relative shrink-0 text-[15px] text-[color:var(--foreground,#0a0a0a)] text-center tracking-[-0.15px] w-full" data-node-id="517:122251">
                KR
              </p>
            </div>
            <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--theme(spacing.1),4px)] items-start min-w-px overflow-clip relative" data-node-id="517:122252" data-name="Prospect identity">
              <p className="font-['Geist:Medium'] font-medium h-[20px] leading-[1.3] relative shrink-0 text-[20px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.3px] w-full" data-node-id="517:122253">
                Kratos
              </p>
              <p className="font-['Geist:Regular'] font-normal h-[20px] leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122254">
                Defense · San Diego, CA
              </p>
            </div>
            <div className="[word-break:break-word] content-stretch flex flex-col gap-[var(--theme(spacing.1),4px)] h-[40px] items-start overflow-clip relative shrink-0 w-[145px]" data-node-id="517:122255" data-name="Prospect state">
              <p className="font-['Geist:Medium'] font-medium h-[20px] leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122256">
                Prospect
              </p>
              <p className="font-['Geist:Regular'] font-normal h-[20px] leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] w-full" data-node-id="517:122257">
                Proposal
              </p>
            </div>
            <div className="content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.14)] flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:122258" data-name="Edit details">
              <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[var(--radius-lg,10px)]" style={{ backgroundImage: "linear-gradient(167.74020391015245deg, rgb(36, 36, 36) 0%, rgb(10, 10, 10) 100%)" }} />
              <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--primary-foreground,white)] tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:122258;12:373">
                Edit details
              </p>
              <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.14)]" />
            </div>
          </div>
          <div className="content-stretch flex gap-[var(--theme(spacing.4),16px)] items-center overflow-clip relative shrink-0 w-full" data-node-id="517:122259" data-name="Profile section heading">
            <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--theme(spacing.1),4px)] items-start min-w-px overflow-clip relative" data-node-id="517:122260" data-name="Details title">
              <p className="font-['Geist:SemiBold'] font-semibold leading-[1.35] relative shrink-0 text-[15px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.15px] w-full" data-node-id="517:122261">
                Company details
              </p>
              <p className="font-['Geist:Regular'] font-normal h-[20px] leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] w-full" data-node-id="517:122262">
                Company information, government registrations and funding fit.
              </p>
            </div>
          </div>
          <div className="content-stretch flex gap-[var(--theme(spacing.6),24px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:122263" data-name="Profile details columns">
            <div className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--theme(spacing.5),20px)] items-start min-w-px overflow-clip relative" data-node-id="517:122264" data-name="Company and fit">
              <div className="bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-col gap-[var(--theme(spacing.4),16px)] items-start overflow-clip p-[var(--theme(spacing.5),20px)] relative rounded-[var(--radius-xl,12px)] shrink-0 w-full" data-node-id="517:122265" data-name="Company info">
                <div className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-center overflow-clip relative shrink-0 w-full" data-node-id="517:122266" data-name="Section title">
                  <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:SemiBold'] font-semibold leading-[1.35] min-w-px relative text-[15px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.15px]" data-node-id="517:122267">
                    Company info
                  </p>
                  <div className="content-stretch flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:122268" data-name="Edit">
                    <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:122268;12:385">
                      Edit
                    </p>
                  </div>
                </div>
                <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] w-full" data-node-id="517:122269">{`Kratos Defense & Security Solutions builds unmanned systems, target drones and hypersonic test vehicles for the Department of War. Referred by an existing client; interested in FY27 hypersonics report language and an Army procurement path.`}</p>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:122270" data-name="Legal name">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] w-[142px]" data-node-id="517:122271">
                    Legal name
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px]" data-node-id="517:122272">
                    Kratos
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122273" data-name="Website">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:122274">
                    Website
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:122275">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122276" data-name="Main company email">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:122277">
                    Main company email
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:122278">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122279" data-name="Main company phone">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:122280">
                    Main company phone
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:122281">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122282" data-name="Primary POC">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:122283">
                    Primary POC
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:122284">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122285" data-name="Business classification">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:122286">
                    Business classification
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:122287">
                    Not selected
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:122288" data-name="Account owner">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] w-[142px]" data-node-id="517:122289">
                    Account owner
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px]" data-node-id="517:122290">
                    Jordan Clayton
                  </p>
                </div>
              </div>
              <div className="bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-col gap-[var(--theme(spacing.4),16px)] items-start overflow-clip p-[var(--theme(spacing.5),20px)] relative rounded-[var(--radius-xl,12px)] shrink-0 w-full" data-node-id="517:122291" data-name="Sector & tracks">
                <div className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-center overflow-clip relative shrink-0 w-full" data-node-id="517:122292" data-name="Section title">
                  <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:SemiBold'] font-semibold leading-[1.35] min-w-px relative text-[15px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.15px]" data-node-id="517:122293">{`Sector & tracks`}</p>
                  <div className="content-stretch flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:122294" data-name="Edit">
                    <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:122294;12:385">
                      Edit
                    </p>
                  </div>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:122295" data-name="Sector tags">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] w-[142px]" data-node-id="517:122296">
                    Sector tags
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px]" data-node-id="517:122297">
                    Defense
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:122298" data-name="Funding priorities">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] w-[142px]" data-node-id="517:122299">
                    Funding priorities
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px]" data-node-id="517:122300">
                    FY27 hypersonics · Target drones · Army procurement
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122301" data-name="Submission tracks">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:122302">
                    Submission tracks
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:122303">
                    Not selected
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122304" data-name="LDA issue codes">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:122305">
                    LDA issue codes
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:122306">
                    Not selected
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122307" data-name="Engagement start">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:122308">
                    Engagement start
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:122309">
                    Not added
                  </p>
                </div>
              </div>
            </div>
            <div className="content-stretch flex flex-col gap-[var(--theme(spacing.5),20px)] h-[600px] items-start overflow-clip relative shrink-0 w-[420px]" data-node-id="517:122310" data-name="Registration and internal notes">
              <div className="bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-col gap-[var(--theme(spacing.4),16px)] items-start overflow-clip p-[var(--theme(spacing.5),20px)] relative rounded-[var(--radius-xl,12px)] shrink-0 w-full" data-node-id="517:122311" data-name="Government registration">
                <div className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-center overflow-clip relative shrink-0 w-full" data-node-id="517:122312" data-name="Section title">
                  <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:SemiBold'] font-semibold leading-[1.35] min-w-px relative text-[15px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.15px]" data-node-id="517:122313">
                    Government registration
                  </p>
                  <div className="content-stretch flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:122314" data-name="Edit">
                    <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:122314;12:385">
                      Edit
                    </p>
                  </div>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122315" data-name="CAGE code">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:122316">
                    CAGE code
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:122317">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122318" data-name="UEI">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:122319">
                    UEI
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:122320">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122321" data-name="SAM.gov status">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:122322">
                    SAM.gov status
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:122323">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122324" data-name="SAM.gov expiration">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:122325">
                    SAM.gov expiration
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:122326">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122327" data-name="LDA registrant name">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:122328">
                    LDA registrant name
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:122329">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122330" data-name="EIN">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:122331">
                    EIN
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:122332">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122333" data-name="NAICS codes">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:122334">
                    NAICS codes
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:122335">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122336" data-name="PSC codes">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:122337">
                    PSC codes
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:122338">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122339" data-name="Organization types">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:122340">
                    Organization types
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:122341">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122342" data-name="Federal set-asides">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:122343">
                    Federal set-asides
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:122344">
                    Not added
                  </p>
                </div>
              </div>
              <div className="bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-col gap-[var(--theme(spacing.4),16px)] items-start overflow-clip p-[var(--theme(spacing.5),20px)] relative rounded-[var(--radius-xl,12px)] shrink-0 w-full" data-node-id="517:122345" data-name="Internal notes">
                <div className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-center overflow-clip relative shrink-0 w-full" data-node-id="517:122346" data-name="Section title">
                  <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:SemiBold'] font-semibold leading-[1.35] min-w-px relative text-[15px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.15px]" data-node-id="517:122347">
                    Internal notes
                  </p>
                  <div className="content-stretch flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:122348" data-name="Edit">
                    <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:122348;12:385">
                      Edit
                    </p>
                  </div>
                </div>
                <p className="[word-break:break-word] font-['Geist:Regular'] font-normal h-[20px] leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] w-full" data-node-id="517:122349">
                  Referred by Hidden Level. They liked the weekly brief. Budget owner is Marcus; Priya runs government affairs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <button className="absolute bg-[rgba(10,10,10,0.36)] block cursor-pointer h-[1040px] left-0 top-0 w-[1440px]" data-node-id="517:122447" data-name="Modal backdrop" />
      <div className="absolute bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-col h-[908px] items-start left-[240px] overflow-clip rounded-[var(--radius-2xl,16px)] top-[66px] w-[960px]" data-node-id="517:122448" data-name="Edit prospect details dialog">
        <div className="content-stretch flex gap-[var(--theme(spacing.4),16px)] items-center overflow-clip p-[var(--theme(spacing.6),24px)] relative shrink-0 w-full" data-node-id="517:122449" data-name="Dialog heading">
          <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--theme(spacing.1),4px)] items-start min-w-px overflow-clip relative" data-node-id="517:122450" data-name="Title and prospect">
            <p className="font-['Geist:Medium'] font-medium h-[20px] leading-[1.3] relative shrink-0 text-[20px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.3px] w-full" data-node-id="517:122451">
              Edit prospect details
            </p>
            <p className="font-['Geist:Regular'] font-normal h-[20px] leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] w-full" data-node-id="517:122452">
              Kratos
            </p>
          </div>
          <button className="content-stretch cursor-pointer flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:122453" data-name="×">
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:122453;12:385">
              ×
            </p>
          </button>
        </div>
        <div className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-start overflow-clip pb-[16px] px-[var(--theme(spacing.6),24px)] relative shrink-0 w-full" data-node-id="517:122460" data-name="Profile wizard steps">
          <a className="content-stretch cursor-pointer flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:122461" data-name="1. Company Info">
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:122461;12:385">
              1. Company Info
            </p>
          </a>
          <a className="content-stretch cursor-pointer flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:122467" data-name="2. Government Registration">
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:122467;12:385">
              2. Government Registration
            </p>
          </a>
          <div className="content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.14)] flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:122473" data-name="3. Sector & Tracks">
            <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[var(--radius-lg,10px)]" style={{ backgroundImage: "linear-gradient(175.78784124641993deg, rgb(36, 36, 36) 0%, rgb(10, 10, 10) 100%)" }} />
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--primary-foreground,white)] tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:122473;12:373">{`3. Sector & Tracks`}</p>
            <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.14)]" />
          </div>
        </div>
        <div className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--theme(spacing.5),20px)] items-start min-h-px overflow-x-clip overflow-y-auto pb-[var(--theme(spacing.6),24px)] pt-[8px] px-[var(--theme(spacing.6),24px)] relative w-[960px]" data-node-id="517:122479" data-name="Scrollable profile fields">
          <div className="content-stretch flex gap-[var(--theme(spacing.4),16px)] items-center overflow-clip relative shrink-0 w-full" data-node-id="517:122480" data-name="Company logo upload">
            <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex flex-col items-start justify-center overflow-clip p-[var(--theme(spacing.3),12px)] relative rounded-[10px] shrink-0 size-[56px]" data-node-id="517:122481" data-name="Logo initials">
              <p className="[word-break:break-word] font-['Geist:SemiBold'] font-semibold leading-[1.35] relative shrink-0 text-[15px] text-[color:var(--foreground,#0a0a0a)] text-center tracking-[-0.15px] w-full" data-node-id="517:122482">
                KR
              </p>
            </div>
            <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--theme(spacing.1),4px)] items-start min-w-px overflow-clip relative text-[12px]" data-node-id="517:122483" data-name="Upload instructions">
              <p className="font-['Geist:Medium'] font-medium h-[20px] leading-[1.2] relative shrink-0 text-[color:var(--foreground,#0a0a0a)] w-full" data-node-id="517:122484">
                Company logo
              </p>
              <p className="font-['Geist:Regular'] font-normal h-[20px] leading-[1.4] relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122485">
                PNG, JPEG, SVG or WebP · Up to 2 MB
              </p>
            </div>
            <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:122486" data-name="Upload logo">
              <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:122486;12:379">
                Upload logo
              </p>
            </div>
          </div>
          <V2ContactField className="[word-break:break-word] content-stretch flex flex-col gap-[var(--theme(spacing.1.5),6px)] items-start justify-center relative shrink-0 w-full" label="Sector tags" showChevron value="Defense" />
          <V2ContactField className="content-stretch flex flex-col gap-[var(--theme(spacing.1.5),6px)] items-start justify-center relative shrink-0 w-full" label="Funding priorities" value="FY27 hypersonics · Target drones · Army procurement" />
          <p className="[word-break:break-word] font-['Geist:Regular'] font-normal h-[20px] leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122502">
            Up to 20 priorities · 120 characters each
          </p>
          <div className="content-stretch flex flex-col gap-[var(--theme(spacing.2),8px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:122503" data-name="Active submission tracks">
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium h-[20px] leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] w-full" data-node-id="517:122504">
              Active submission tracks
            </p>
            <div className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:122505" data-name="Active submission tracks options">
              <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:122506" data-name="☐  NDAA Authorization Request">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-pre" data-node-id="I517:122506;12:379">{`☐  NDAA Authorization Request`}</p>
              </div>
              <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:122512" data-name="☐  Appropriations Plus-Up">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-pre" data-node-id="I517:122512;12:379">{`☐  Appropriations Plus-Up`}</p>
              </div>
            </div>
            <div className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:122518" data-name="Active submission tracks options">
              <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:122519" data-name="☐  CDS / Earmark Request">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-pre" data-node-id="I517:122519;12:379">{`☐  CDS / Earmark Request`}</p>
              </div>
              <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:122525" data-name="☐  Authorization (non-NDAA)">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-pre" data-node-id="I517:122525;12:379">{`☐  Authorization (non-NDAA)`}</p>
              </div>
            </div>
            <div className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:122531" data-name="Active submission tracks options">
              <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:122532" data-name="☐  Farm Bill Provision">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-pre" data-node-id="I517:122532;12:379">{`☐  Farm Bill Provision`}</p>
              </div>
              <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:122538" data-name="☐  Advocacy / Dear Colleague">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-pre" data-node-id="I517:122538;12:379">{`☐  Advocacy / Dear Colleague`}</p>
              </div>
            </div>
          </div>
          <V2ContactField className="[word-break:break-word] content-stretch flex flex-col gap-[var(--theme(spacing.1.5),6px)] items-start justify-center relative shrink-0 w-full" label="LDA issue codes (bill/policy matching)" showChevron value="Search issue codes…" />
          <div className="content-stretch flex gap-[var(--theme(spacing.5),20px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:122549" data-name="Engagement and primary POC">
            <V2ContactField className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--theme(spacing.1.5),6px)] items-start justify-center min-w-px relative" label="Engagement start date" showChevron value="MM / DD / YYYY" />
            <V2ContactField className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--theme(spacing.1.5),6px)] items-start justify-center min-w-px relative" label="Primary POC at client" value="Add primary contact name" />
          </div>
          <V2ContactField className="content-stretch flex flex-col gap-[var(--theme(spacing.1.5),6px)] items-start justify-center relative shrink-0 w-full" label="Internal notes" type="Multiline" value="Referred by Hidden Level. They liked the weekly brief. Budget owner is Marcus; Priya runs government affairs." />
          <p className="[word-break:break-word] font-['Geist:Regular'] font-normal h-[20px] leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:122565">
            Maximum 2,000 characters
          </p>
        </div>
        <div className="border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[var(--theme(spacing.3),12px)] items-center overflow-clip p-[var(--theme(spacing.6),24px)] relative shrink-0 w-full" data-node-id="517:122566" data-name="Persistent dialog actions">
          <button className="content-stretch cursor-pointer flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:122567" data-name="Cancel">
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:122567;12:385">
              Cancel
            </p>
          </button>
          <div className="flex-[1_0_0] h-px min-w-px relative" data-node-id="517:122574" data-name="Action spacer" />
          <a className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch cursor-pointer drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:122575" data-name="Back">
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:122575;12:379">
              Back
            </p>
          </a>
          <a className="content-stretch cursor-pointer drop-shadow-[0px_1px_1px_rgba(12,10,9,0.14)] flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:122581" data-name="Save changes">
            <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[var(--radius-lg,10px)]" style={{ backgroundImage: "linear-gradient(169.55028713471904deg, rgb(36, 36, 36) 0%, rgb(10, 10, 10) 100%)" }} />
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--primary-foreground,white)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:122581;12:373">
              Save changes
            </p>
            <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.14)]" />
          </a>
        </div>
      </div>
    </div>
  );
}