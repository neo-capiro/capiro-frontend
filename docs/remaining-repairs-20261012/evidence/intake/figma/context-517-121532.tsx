const imgCapiro31ProfilePicture = "https://www.figma.com/api/mcp/asset/d3fcffbe-736f-401b-a8b0-cc2b4095b5d1.svg";
const imgCapiroWordmark = "https://www.figma.com/api/mcp/asset/60a08fdd-c656-4b5d-bf69-f3027af53660.png";
const imgIcon = "https://www.figma.com/api/mcp/asset/094ff508-50e2-49f9-bcc4-565fc647b63b.svg";
const imgIcon1 = "https://www.figma.com/api/mcp/asset/565dced7-7dd0-4df4-9b9a-84980ece8165.svg";
const imgIcon2 = "https://www.figma.com/api/mcp/asset/86f7a3f2-79d0-4143-9432-5eab9cb43e06.svg";
const imgIcon3 = "https://www.figma.com/api/mcp/asset/e13b86c2-308c-46f8-91df-96468413dd5e.svg";
const imgIcon4 = "https://www.figma.com/api/mcp/asset/4d686016-2ef7-4163-8819-78e45a5d32cd.svg";
const imgIcon5 = "https://www.figma.com/api/mcp/asset/0c89dd03-3bff-44ba-9995-a31a3c35fe05.svg";
const imgIcon6 = "https://www.figma.com/api/mcp/asset/bbbb7126-4c55-4fe3-87b1-45584ed86888.svg";
const imgIcon7 = "https://www.figma.com/api/mcp/asset/7f71955f-d81c-4dc9-8439-b987a5702679.svg";
const imgIcon8 = "https://www.figma.com/api/mcp/asset/fa1b67de-bd62-4b76-b505-61be37966762.svg";
const imgIcon9 = "https://www.figma.com/api/mcp/asset/b3d9bcc1-be8a-46fd-9286-b70e65c52db7.svg";

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

export default function ProspectEditDetailsCompanyInfo() {
  return (
    <div className="bg-[var(--background,#f5f5f4)] relative size-full" data-node-id="517:121532" data-name="Prospect · Edit details · Company Info">
      <div className="absolute bg-[var(--card,white)] border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[var(--theme(spacing.5),20px)] h-[64px] items-center left-0 px-[var(--theme(spacing.4),16px)] top-0 w-[1440px]" data-node-id="517:121533" data-name="Capiro · Shared header">
        <div className="content-stretch flex h-[32px] items-center overflow-clip relative shrink-0 w-[196px]" data-node-id="I517:121533;469:41501" data-name="Brand · Capiro · Home">
          <div className="h-[26px] relative shrink-0 w-[77px]" data-node-id="I517:121533;469:41502" data-name="Capiro wordmark">
            <img alt="" className="absolute inset-0 max-w-none object-contain pointer-events-none size-full" src={imgCapiroWordmark} />
          </div>
        </div>
        <div className="bg-[var(--muted,#f5f5f4)] content-stretch cursor-pointer flex gap-[var(--theme(spacing.1),4px)] items-center justify-center overflow-clip p-[var(--theme(spacing.1),4px)] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="I517:121533;469:41503" data-name="Modes · Portfolio active">
          <a className="content-stretch flex gap-[8px] h-[36px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 w-[40px]" data-node-id="I517:121533;469:41504" data-name="Mode · Meri">
            <div className="relative shrink-0 size-[16px]" data-node-id="I517:121533;469:41504;12:383" data-name="Icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon} />
            </div>
          </a>
          <a className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex gap-[8px] h-[36px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 w-[40px]" data-node-id="I517:121533;469:41510" data-name="Mode · Portfolio">
            <div className="relative shrink-0 size-[16px]" data-node-id="I517:121533;469:41510;12:377" data-name="Icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon1} />
            </div>
          </a>
          <a className="content-stretch flex gap-[8px] h-[36px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 w-[40px]" data-node-id="I517:121533;469:41516" data-name="Mode · Modules">
            <div className="relative shrink-0 size-[16px]" data-node-id="I517:121533;469:41516;12:383" data-name="Icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon2} />
            </div>
          </a>
        </div>
        <div className="flex-[1_0_0] h-px min-w-px relative" data-node-id="I517:121533;469:41522" data-name="Flexible space" />
        <div className="content-stretch cursor-pointer flex gap-[var(--theme(spacing.3),12px)] h-[40px] items-center overflow-clip relative shrink-0" data-node-id="I517:121533;469:41523" data-name="Global actions">
          <a className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 size-[40px]" data-node-id="I517:121533;644:139304" data-name="Action · Quick log">
            <div className="relative shrink-0 size-[16px]" data-node-id="I517:121533;644:139304;12:383" data-name="Icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon3} />
            </div>
          </a>
          <a className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 size-[40px]" data-node-id="I517:121533;501:42742" data-name="Action · Master calendar">
            <div className="relative shrink-0 size-[16px]" data-node-id="I517:121533;501:42742;12:383" data-name="Icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon4} />
            </div>
          </a>
          <a className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 size-[40px]" data-node-id="I517:121533;469:41524" data-name="Action · Search">
            <div className="relative shrink-0 size-[16px]" data-node-id="I517:121533;469:41524;12:383" data-name="Icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon5} />
            </div>
          </a>
          <a className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 size-[40px]" data-node-id="I517:121533;469:41532" data-name="Action · Updates">
            <div className="relative shrink-0 size-[16px]" data-node-id="I517:121533;469:41532;12:383" data-name="Icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon6} />
            </div>
          </a>
          <a className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-center justify-center overflow-clip relative shrink-0 size-[40px]" data-node-id="I517:121533;469:41540" data-name="Action · Profile">
            <Capiro31ProfilePicture className="relative shrink-0 size-[32px]" />
          </a>
        </div>
      </div>
      <div className="absolute bg-[var(--border,#e7e5e4)] h-px left-0 top-[64px] w-[1440px]" data-node-id="517:121535" data-name="Capiro · Header divider" />
      <div className="absolute content-stretch flex h-[975px] items-start left-0 overflow-clip top-[65px] w-[1440px]" data-node-id="517:121536" data-name="Capiro · Workspace body">
        <div className="bg-[var(--card,white)] border-[var(--border,#e7e5e4)] border-r border-solid content-stretch flex flex-col gap-[var(--theme(spacing.3),12px)] h-full items-start p-[var(--theme(spacing.4),16px)] relative shrink-0 w-[232px]" data-node-id="517:121537" data-name="Capiro · Portfolio navigation">
          <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="I517:121537;471:92356">
            PORTFOLIO
          </p>
          <div className="content-stretch cursor-pointer flex flex-col gap-[var(--theme(spacing.1),4px)] items-start overflow-clip relative shrink-0 w-[200px]" data-node-id="I517:121537;471:92357" data-name="Portfolio navigation">
            <a className="content-stretch flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I517:121537;471:92358" data-name="Nav · Portfolio">
              <div className="relative shrink-0 size-[16px]" data-node-id="I517:121537;471:92358;12:383" data-name="Icon">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon2} />
              </div>
              <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:121537;471:92358;12:385">
                Overview
              </p>
            </a>
            <a className="content-stretch flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I517:121537;471:92369" data-name="Nav · Clients">
              <div className="relative shrink-0 size-[16px]" data-node-id="I517:121537;471:92369;12:383" data-name="Icon">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon7} />
              </div>
              <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:121537;471:92369;12:385">
                Clients
              </p>
            </a>
            <a className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I517:121537;471:92378" data-name="Nav · Prospects">
              <div className="relative shrink-0 size-[16px]" data-node-id="I517:121537;471:92378;12:383" data-name="Icon">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon8} />
              </div>
              <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:121537;471:92378;12:385">
                Prospects
              </p>
            </a>
          </div>
          <div className="flex-[1_0_0] min-h-px relative w-[200px]" data-node-id="I517:121537;471:92387" data-name="Flexible space" />
          <div className="content-stretch flex flex-col gap-[var(--theme(spacing.1),4px)] items-start overflow-clip relative shrink-0 w-[200px]" data-node-id="I517:121537;471:92388" data-name="Workspace settings">
            <a className="content-stretch cursor-pointer flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I517:121537;471:92389" data-name="Nav · Settings">
              <div className="relative shrink-0 size-[16px]" data-node-id="I517:121537;471:92389;12:383" data-name="Icon">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon9} />
              </div>
              <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:121537;471:92389;12:385">
                Settings
              </p>
            </a>
          </div>
        </div>
        <div className="content-stretch flex flex-[1_0_0] flex-col gap-[20px] h-full items-start min-w-px overflow-x-clip overflow-y-auto pb-[32px] pt-[24px] px-[32px] relative" data-node-id="517:121538" data-name="Main">
          <div className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-center overflow-clip relative shrink-0 w-full" data-node-id="517:121539" data-name="Breadcrumb and return">
            <a className="content-stretch cursor-pointer flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:121540" data-name="← Prospects">
              <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:121540;12:385">
                ← Prospects
              </p>
            </a>
            <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular'] font-normal h-[20px] leading-[1.4] min-w-px relative text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="517:121541">
              Portfolio / Prospects / Company details
            </p>
          </div>
          <div className="content-stretch flex gap-[var(--theme(spacing.4),16px)] items-center overflow-clip relative shrink-0 w-full" data-node-id="517:121542" data-name="Company profile heading">
            <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex flex-col items-center justify-center overflow-clip relative rounded-[var(--radius-lg,10px)] shrink-0 size-[44px]" data-node-id="517:121543" data-name="Company logo">
              <p className="[word-break:break-word] font-['Geist:SemiBold'] font-semibold leading-[1.35] relative shrink-0 text-[15px] text-[color:var(--foreground,#0a0a0a)] text-center tracking-[-0.15px] w-full" data-node-id="517:121544">
                KR
              </p>
            </div>
            <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--theme(spacing.1),4px)] items-start min-w-px overflow-clip relative" data-node-id="517:121545" data-name="Prospect identity">
              <p className="font-['Geist:Medium'] font-medium h-[20px] leading-[1.3] relative shrink-0 text-[20px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.3px] w-full" data-node-id="517:121546">
                Kratos
              </p>
              <p className="font-['Geist:Regular'] font-normal h-[20px] leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121547">
                Defense · San Diego, CA
              </p>
            </div>
            <div className="[word-break:break-word] content-stretch flex flex-col gap-[var(--theme(spacing.1),4px)] h-[40px] items-start overflow-clip relative shrink-0 w-[145px]" data-node-id="517:121548" data-name="Prospect state">
              <p className="font-['Geist:Medium'] font-medium h-[20px] leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121549">
                Prospect
              </p>
              <p className="font-['Geist:Regular'] font-normal h-[20px] leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] w-full" data-node-id="517:121550">
                Proposal
              </p>
            </div>
            <div className="content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.14)] flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:121551" data-name="Edit details">
              <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[var(--radius-lg,10px)]" style={{ backgroundImage: "linear-gradient(167.74020391015245deg, rgb(36, 36, 36) 0%, rgb(10, 10, 10) 100%)" }} />
              <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--primary-foreground,white)] tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:121551;12:373">
                Edit details
              </p>
              <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.14)]" />
            </div>
          </div>
          <div className="content-stretch flex gap-[var(--theme(spacing.4),16px)] items-center overflow-clip relative shrink-0 w-full" data-node-id="517:121552" data-name="Profile section heading">
            <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--theme(spacing.1),4px)] items-start min-w-px overflow-clip relative" data-node-id="517:121553" data-name="Details title">
              <p className="font-['Geist:SemiBold'] font-semibold leading-[1.35] relative shrink-0 text-[15px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.15px] w-full" data-node-id="517:121554">
                Company details
              </p>
              <p className="font-['Geist:Regular'] font-normal h-[20px] leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] w-full" data-node-id="517:121555">
                Company information, government registrations and funding fit.
              </p>
            </div>
          </div>
          <div className="content-stretch flex gap-[var(--theme(spacing.6),24px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:121556" data-name="Profile details columns">
            <div className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--theme(spacing.5),20px)] items-start min-w-px overflow-clip relative" data-node-id="517:121557" data-name="Company and fit">
              <div className="bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-col gap-[var(--theme(spacing.4),16px)] items-start overflow-clip p-[var(--theme(spacing.5),20px)] relative rounded-[var(--radius-xl,12px)] shrink-0 w-full" data-node-id="517:121558" data-name="Company info">
                <div className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-center overflow-clip relative shrink-0 w-full" data-node-id="517:121559" data-name="Section title">
                  <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:SemiBold'] font-semibold leading-[1.35] min-w-px relative text-[15px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.15px]" data-node-id="517:121560">
                    Company info
                  </p>
                  <div className="content-stretch flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:121561" data-name="Edit">
                    <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:121561;12:385">
                      Edit
                    </p>
                  </div>
                </div>
                <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] w-full" data-node-id="517:121562">{`Kratos Defense & Security Solutions builds unmanned systems, target drones and hypersonic test vehicles for the Department of War. Referred by an existing client; interested in FY27 hypersonics report language and an Army procurement path.`}</p>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:121563" data-name="Legal name">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] w-[142px]" data-node-id="517:121564">
                    Legal name
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px]" data-node-id="517:121565">
                    Kratos
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121566" data-name="Website">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:121567">
                    Website
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:121568">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121569" data-name="Main company email">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:121570">
                    Main company email
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:121571">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121572" data-name="Main company phone">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:121573">
                    Main company phone
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:121574">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121575" data-name="Primary POC">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:121576">
                    Primary POC
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:121577">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121578" data-name="Business classification">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:121579">
                    Business classification
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:121580">
                    Not selected
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:121581" data-name="Account owner">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] w-[142px]" data-node-id="517:121582">
                    Account owner
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px]" data-node-id="517:121583">
                    Jordan Clayton
                  </p>
                </div>
              </div>
              <div className="bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-col gap-[var(--theme(spacing.4),16px)] items-start overflow-clip p-[var(--theme(spacing.5),20px)] relative rounded-[var(--radius-xl,12px)] shrink-0 w-full" data-node-id="517:121584" data-name="Sector & tracks">
                <div className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-center overflow-clip relative shrink-0 w-full" data-node-id="517:121585" data-name="Section title">
                  <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:SemiBold'] font-semibold leading-[1.35] min-w-px relative text-[15px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.15px]" data-node-id="517:121586">{`Sector & tracks`}</p>
                  <div className="content-stretch flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:121587" data-name="Edit">
                    <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:121587;12:385">
                      Edit
                    </p>
                  </div>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:121588" data-name="Sector tags">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] w-[142px]" data-node-id="517:121589">
                    Sector tags
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px]" data-node-id="517:121590">
                    Defense
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:121591" data-name="Funding priorities">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] w-[142px]" data-node-id="517:121592">
                    Funding priorities
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px]" data-node-id="517:121593">
                    FY27 hypersonics · Target drones · Army procurement
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121594" data-name="Submission tracks">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:121595">
                    Submission tracks
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:121596">
                    Not selected
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121597" data-name="LDA issue codes">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:121598">
                    LDA issue codes
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:121599">
                    Not selected
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121600" data-name="Engagement start">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:121601">
                    Engagement start
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:121602">
                    Not added
                  </p>
                </div>
              </div>
            </div>
            <div className="content-stretch flex flex-col gap-[var(--theme(spacing.5),20px)] h-[600px] items-start overflow-clip relative shrink-0 w-[420px]" data-node-id="517:121603" data-name="Registration and internal notes">
              <div className="bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-col gap-[var(--theme(spacing.4),16px)] items-start overflow-clip p-[var(--theme(spacing.5),20px)] relative rounded-[var(--radius-xl,12px)] shrink-0 w-full" data-node-id="517:121604" data-name="Government registration">
                <div className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-center overflow-clip relative shrink-0 w-full" data-node-id="517:121605" data-name="Section title">
                  <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:SemiBold'] font-semibold leading-[1.35] min-w-px relative text-[15px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.15px]" data-node-id="517:121606">
                    Government registration
                  </p>
                  <div className="content-stretch flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:121607" data-name="Edit">
                    <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:121607;12:385">
                      Edit
                    </p>
                  </div>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121608" data-name="CAGE code">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:121609">
                    CAGE code
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:121610">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121611" data-name="UEI">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:121612">
                    UEI
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:121613">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121614" data-name="SAM.gov status">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:121615">
                    SAM.gov status
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:121616">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121617" data-name="SAM.gov expiration">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:121618">
                    SAM.gov expiration
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:121619">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121620" data-name="LDA registrant name">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:121621">
                    LDA registrant name
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:121622">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121623" data-name="EIN">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:121624">
                    EIN
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:121625">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121626" data-name="NAICS codes">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:121627">
                    NAICS codes
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:121628">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121629" data-name="PSC codes">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:121630">
                    PSC codes
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:121631">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121632" data-name="Organization types">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:121633">
                    Organization types
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:121634">
                    Not added
                  </p>
                </div>
                <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular'] font-normal gap-[var(--theme(spacing.4),16px)] items-start overflow-clip relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121635" data-name="Federal set-asides">
                  <p className="h-[18px] leading-[1.4] relative shrink-0 text-[12px] w-[142px]" data-node-id="517:121636">
                    Federal set-asides
                  </p>
                  <p className="flex-[1_0_0] h-[20px] leading-[1.45] min-w-px relative text-[13px] tracking-[-0.039px]" data-node-id="517:121637">
                    Not added
                  </p>
                </div>
              </div>
              <div className="bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-col gap-[var(--theme(spacing.4),16px)] items-start overflow-clip p-[var(--theme(spacing.5),20px)] relative rounded-[var(--radius-xl,12px)] shrink-0 w-full" data-node-id="517:121638" data-name="Internal notes">
                <div className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-center overflow-clip relative shrink-0 w-full" data-node-id="517:121639" data-name="Section title">
                  <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:SemiBold'] font-semibold leading-[1.35] min-w-px relative text-[15px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.15px]" data-node-id="517:121640">
                    Internal notes
                  </p>
                  <div className="content-stretch flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:121641" data-name="Edit">
                    <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:121641;12:385">
                      Edit
                    </p>
                  </div>
                </div>
                <p className="[word-break:break-word] font-['Geist:Regular'] font-normal h-[20px] leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] w-full" data-node-id="517:121642">
                  Referred by Hidden Level. They liked the weekly brief. Budget owner is Marcus; Priya runs government affairs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <button className="absolute bg-[rgba(10,10,10,0.36)] block cursor-pointer h-[1040px] left-0 top-0 w-[1440px]" data-node-id="517:121740" data-name="Modal backdrop" />
      <div className="absolute bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-col h-[908px] items-start left-[240px] overflow-clip rounded-[var(--radius-2xl,16px)] top-[66px] w-[960px]" data-node-id="517:121741" data-name="Edit prospect details dialog">
        <div className="content-stretch flex gap-[var(--theme(spacing.4),16px)] items-center overflow-clip p-[var(--theme(spacing.6),24px)] relative shrink-0 w-full" data-node-id="517:121742" data-name="Dialog heading">
          <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--theme(spacing.1),4px)] items-start min-w-px overflow-clip relative" data-node-id="517:121743" data-name="Title and prospect">
            <p className="font-['Geist:Medium'] font-medium h-[20px] leading-[1.3] relative shrink-0 text-[20px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.3px] w-full" data-node-id="517:121744">
              Edit prospect details
            </p>
            <p className="font-['Geist:Regular'] font-normal h-[20px] leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] w-full" data-node-id="517:121745">
              Kratos
            </p>
          </div>
          <button className="content-stretch cursor-pointer flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:121746" data-name="×">
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:121746;12:385">
              ×
            </p>
          </button>
        </div>
        <div className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-start overflow-clip pb-[16px] px-[var(--theme(spacing.6),24px)] relative shrink-0 w-full" data-node-id="517:121753" data-name="Profile wizard steps">
          <div className="content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.14)] flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:121754" data-name="1. Company Info">
            <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[var(--radius-lg,10px)]" style={{ backgroundImage: "linear-gradient(175.78784124641993deg, rgb(36, 36, 36) 0%, rgb(10, 10, 10) 100%)" }} />
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--primary-foreground,white)] tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:121754;12:373">
              1. Company Info
            </p>
            <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.14)]" />
          </div>
          <a className="content-stretch cursor-pointer flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:121760" data-name="2. Government Registration">
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:121760;12:385">
              2. Government Registration
            </p>
          </a>
          <a className="content-stretch cursor-pointer flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:121766" data-name="3. Sector & Tracks">
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:121766;12:385">{`3. Sector & Tracks`}</p>
          </a>
        </div>
        <div className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--theme(spacing.5),20px)] items-start min-h-px overflow-x-clip overflow-y-auto pb-[var(--theme(spacing.6),24px)] pt-[8px] px-[var(--theme(spacing.6),24px)] relative w-[960px]" data-node-id="517:121772" data-name="Scrollable profile fields">
          <div className="content-stretch flex gap-[var(--theme(spacing.4),16px)] items-center overflow-clip relative shrink-0 w-full" data-node-id="517:121773" data-name="Company logo upload">
            <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex flex-col items-start justify-center overflow-clip p-[var(--theme(spacing.3),12px)] relative rounded-[10px] shrink-0 size-[56px]" data-node-id="517:121774" data-name="Logo initials">
              <p className="[word-break:break-word] font-['Geist:SemiBold'] font-semibold leading-[1.35] relative shrink-0 text-[15px] text-[color:var(--foreground,#0a0a0a)] text-center tracking-[-0.15px] w-full" data-node-id="517:121775">
                KR
              </p>
            </div>
            <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--theme(spacing.1),4px)] items-start min-w-px overflow-clip relative text-[12px]" data-node-id="517:121776" data-name="Upload instructions">
              <p className="font-['Geist:Medium'] font-medium h-[20px] leading-[1.2] relative shrink-0 text-[color:var(--foreground,#0a0a0a)] w-full" data-node-id="517:121777">
                Company logo
              </p>
              <p className="font-['Geist:Regular'] font-normal h-[20px] leading-[1.4] relative shrink-0 text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121778">
                PNG, JPEG, SVG or WebP · Up to 2 MB
              </p>
            </div>
            <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:121779" data-name="Upload logo">
              <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:121779;12:379">
                Upload logo
              </p>
            </div>
          </div>
          <div className="content-stretch flex gap-[var(--theme(spacing.5),20px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:121785" data-name="Legal name and website">
            <V2ContactField className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--theme(spacing.1.5),6px)] items-start justify-center min-w-px relative" label="Legal name *" value="Kratos" />
            <V2ContactField className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--theme(spacing.1.5),6px)] items-start justify-center min-w-px relative" label="Website *" value="https://company.com" />
          </div>
          <V2ContactField className="content-stretch flex flex-col gap-[var(--theme(spacing.1.5),6px)] items-start justify-center relative shrink-0 w-full" label="Company description *" type="Multiline" value="Kratos Defense & Security Solutions builds unmanned systems, target drones and hypersonic test vehicles for the Department of War. Referred by an existing client; interested in FY27 hypersonics report language and an Army procurement path." />
          <p className="[word-break:break-word] font-['Geist:Regular'] font-normal h-[20px] leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] w-full" data-node-id="517:121801">
            Required · Maximum 600 characters
          </p>
          <div className="content-stretch flex gap-[var(--theme(spacing.5),20px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:121802" data-name="Company contact details">
            <V2ContactField className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--theme(spacing.1.5),6px)] items-start justify-center min-w-px relative" label="Main company email" value="name@company.com" />
            <V2ContactField className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--theme(spacing.1.5),6px)] items-start justify-center min-w-px relative" label="Main company phone" value="(555) 000-0000" />
          </div>
          <div className="content-stretch flex flex-col gap-[var(--theme(spacing.2),8px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:121813" data-name="Small Business Classification">
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium h-[20px] leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] w-full" data-node-id="517:121814">
              Small Business Classification
            </p>
            <div className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:121815" data-name="Small Business Classification options">
              <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:121816" data-name="☐  Small Business (SB)">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-pre" data-node-id="I517:121816;12:379">{`☐  Small Business (SB)`}</p>
              </div>
              <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:121822" data-name="☐  WOSB">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-pre" data-node-id="I517:121822;12:379">{`☐  WOSB`}</p>
              </div>
              <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:121828" data-name="☐  SDVOSB">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-pre" data-node-id="I517:121828;12:379">{`☐  SDVOSB`}</p>
              </div>
            </div>
            <div className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:121834" data-name="Small Business Classification options">
              <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:121835" data-name="☐  HUBZone">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-pre" data-node-id="I517:121835;12:379">{`☐  HUBZone`}</p>
              </div>
              <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:121841" data-name="☐  8(a)">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-pre" data-node-id="I517:121841;12:379">{`☐  8(a)`}</p>
              </div>
              <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:121847" data-name="☐  Large Business">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-pre" data-node-id="I517:121847;12:379">{`☐  Large Business`}</p>
              </div>
            </div>
            <div className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-start overflow-clip relative shrink-0 w-full" data-node-id="517:121853" data-name="Small Business Classification options">
              <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex flex-[1_0_0] gap-[8px] h-[36px] items-center min-w-px px-[14px] relative rounded-[var(--radius-lg,10px)]" data-node-id="517:121854" data-name="☐  Foreign-owned">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-pre" data-node-id="I517:121854;12:379">{`☐  Foreign-owned`}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[var(--theme(spacing.3),12px)] items-center overflow-clip p-[var(--theme(spacing.6),24px)] relative shrink-0 w-full" data-node-id="517:121860" data-name="Persistent dialog actions">
          <button className="content-stretch cursor-pointer flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:121861" data-name="Cancel">
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:121861;12:385">
              Cancel
            </p>
          </button>
          <div className="flex-[1_0_0] h-px min-w-px relative" data-node-id="517:121868" data-name="Action spacer" />
          <a className="content-stretch cursor-pointer drop-shadow-[0px_1px_1px_rgba(12,10,9,0.14)] flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="517:121869" data-name="Next">
            <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[var(--radius-lg,10px)]" style={{ backgroundImage: "linear-gradient(159.59536817203457deg, rgb(36, 36, 36) 0%, rgb(10, 10, 10) 100%)" }} />
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--primary-foreground,white)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I517:121869;12:373">
              Next
            </p>
            <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.14)]" />
          </a>
        </div>
      </div>
    </div>
  );
}