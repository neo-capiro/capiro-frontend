const imgIconSearch = "https://www.figma.com/api/mcp/asset/d782a080-66c7-4c67-92dc-f6846be513ab.svg";
const imgIconLayoutGrid = "https://www.figma.com/api/mcp/asset/d099fad6-3fff-4584-ba21-1ff491118e9e.svg";
const imgIconActivity = "https://www.figma.com/api/mcp/asset/e35ff450-455b-46a2-ab63-14a936fec3db.svg";
const imgIconTarget = "https://www.figma.com/api/mcp/asset/3688eb08-c8aa-40a5-8398-f4d258edb4ad.svg";
const imgIconHistory = "https://www.figma.com/api/mcp/asset/a3754871-9b70-428a-83af-e35e920cf597.svg";
const imgIconCalendar = "https://www.figma.com/api/mcp/asset/8e2f4a44-31ed-4a4f-acf6-4bf41c7b90b6.svg";
const imgIconFlag = "https://www.figma.com/api/mcp/asset/32563835-bb72-4436-b820-3998a5d3c71c.svg";
const imgIconUsers = "https://www.figma.com/api/mcp/asset/f1ddb5b9-68b6-4dba-9392-76a3716c3d7e.svg";
const imgIconFileText = "https://www.figma.com/api/mcp/asset/eb3d708f-93a3-4932-9ed1-37a6cc1817b3.svg";
const imgIconPentagon = "https://www.figma.com/api/mcp/asset/ba278bac-1fe5-44cb-8606-dae674a076e6.svg";
const imgEllipse = "https://www.figma.com/api/mcp/asset/3c5dfc46-3903-4ae1-924a-7b40628db532.svg";
const imgIconStickyNote = "https://www.figma.com/api/mcp/asset/3dd482bd-8fdc-4452-9c57-1104beadf76d.svg";
const imgIconLayoutGrid1 = "https://www.figma.com/api/mcp/asset/da8c58f0-9a10-41ec-aac4-868282ff5476.svg";

export default function OverlayViewSwitcherMenu() {
  return (
    <div className="relative size-full" data-node-id="411:47736" data-name="Overlay · View switcher menu">
      <a className="absolute bg-[rgba(10,10,10,0)] block cursor-pointer h-[1040px] left-0 top-0 w-[1440px]" data-node-id="411:47737" data-name="Scrim (click to close)" />
      <div className="absolute bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-col gap-[2px] items-start left-[223px] overflow-clip p-[6px] rounded-[14px] shadow-[0px_16px_40px_-12px_rgba(12,10,9,0.18),0px_2px_6px_0px_rgba(12,10,9,0.05)] top-[125px] w-[360px]" data-node-id="411:47738" data-name="Overlay · View switcher menu">
        <div className="border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[8px] items-center overflow-clip px-[10px] py-[9px] relative shrink-0 w-full" data-node-id="411:47739" data-name="Filter">
          <div className="relative shrink-0 size-[14px]" data-node-id="411:47740" data-name="icon/search">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconSearch} />
          </div>
          <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular'] font-normal leading-[1.45] min-w-px relative text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px]" data-node-id="411:47741">
            Jump to a view…
          </p>
          <div className="border border-[var(--input,#e7e5e4)] border-solid content-stretch flex items-start overflow-clip px-[5px] py-px relative rounded-[5px] shrink-0" data-node-id="411:47742" data-name="Kbd">
            <p className="[word-break:break-word] font-['Geist_Mono:Regular'] font-normal leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:47743">
              ⌘J
            </p>
          </div>
        </div>
        <div className="content-stretch flex items-start overflow-clip pb-[4px] pl-[10px] pt-[8px] relative shrink-0" data-node-id="411:47744" data-name="Group label">
          <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="411:47745">
            Anduril views
          </p>
        </div>
        <a className="content-stretch cursor-pointer flex gap-[10px] items-center overflow-clip px-[8px] py-[7px] relative rounded-[8px] shrink-0 w-full" data-node-id="411:47746" data-name="View/Overview">
          <div className="border border-[var(--border,#e7e5e4)] border-solid content-stretch flex items-center justify-center overflow-clip relative rounded-[7px] shrink-0 size-[36px]" data-node-id="411:47747" style={{ backgroundImage: "linear-gradient(148.631504458068deg, rgb(36, 36, 36) 0%, rgb(10, 10, 10) 100%)" }} data-name="Icon">
            <div className="relative shrink-0 size-[20px]" data-node-id="411:47748" data-name="icon/layout-grid">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconLayoutGrid} />
            </div>
          </div>
          <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start min-w-px overflow-clip relative text-left whitespace-nowrap" data-node-id="411:47749" data-name="Text">
            <p className="font-['Geist:SemiBold'] font-semibold leading-[1.2] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)]" data-node-id="411:47750">
              Overview
            </p>
            <p className="font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:47751">
              Tiles at a glance
            </p>
          </div>
          <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] text-left whitespace-nowrap" data-node-id="411:47752">
            G O
          </p>
        </a>
        <a className="content-stretch cursor-pointer flex gap-[10px] items-center overflow-clip px-[8px] py-[7px] relative rounded-[8px] shrink-0 w-full" data-node-id="411:47753" data-name="View/Timeline">
          <div className="bg-[var(--muted,#f5f5f4)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex items-center justify-center overflow-clip relative rounded-[7px] shrink-0 size-[36px]" data-node-id="411:47754" data-name="Icon">
            <div className="relative shrink-0 size-[20px]" data-node-id="411:47755" data-name="icon/activity">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconActivity} />
            </div>
          </div>
          <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start min-w-px overflow-clip relative text-left whitespace-nowrap" data-node-id="411:47756" data-name="Text">
            <p className="font-['Geist:SemiBold'] font-semibold leading-[1.2] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)]" data-node-id="411:47757">
              Timeline
            </p>
            <p className="font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:47758">
              Shared record of every touch
            </p>
          </div>
          <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] text-left whitespace-nowrap" data-node-id="411:47759">
            G T
          </p>
        </a>
        <a className="content-stretch cursor-pointer flex gap-[10px] items-center overflow-clip px-[8px] py-[7px] relative rounded-[8px] shrink-0 w-full" data-node-id="411:47760" data-name="View/Objectives">
          <div className="bg-[var(--muted,#f5f5f4)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex items-center justify-center overflow-clip relative rounded-[7px] shrink-0 size-[36px]" data-node-id="411:47761" data-name="Icon">
            <div className="relative shrink-0 size-[22px]" data-node-id="411:47762" data-name="icon/target">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconTarget} />
            </div>
          </div>
          <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start min-w-px overflow-clip relative text-left whitespace-nowrap" data-node-id="411:47766" data-name="Text">
            <p className="font-['Geist:SemiBold'] font-semibold leading-[1.2] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)]" data-node-id="411:47767">
              Objectives
            </p>
            <p className="font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:47768">
              Outcomes, strategy and Planner project
            </p>
          </div>
          <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] text-left whitespace-nowrap" data-node-id="411:47769">
            G J
          </p>
        </a>
        <div className="content-stretch flex gap-[10px] items-center overflow-clip px-[8px] py-[7px] relative rounded-[8px] shrink-0 w-full" data-node-id="411:47770" data-name="View/Advocacy history">
          <div className="bg-[var(--muted,#f5f5f4)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex items-center justify-center overflow-clip relative rounded-[7px] shrink-0 size-[36px]" data-node-id="411:47771" data-name="Icon">
            <div className="relative shrink-0 size-[22px]" data-node-id="411:47772" data-name="icon/history">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconHistory} />
            </div>
          </div>
          <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start min-w-px overflow-clip relative whitespace-nowrap" data-node-id="411:47775" data-name="Text">
            <p className="font-['Geist:SemiBold'] font-semibold leading-[1.2] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)]" data-node-id="411:47776">
              Advocacy history
            </p>
            <p className="font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:47777">
              What was asked and what happened
            </p>
          </div>
          <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:47778">
            G H
          </p>
        </div>
        <a className="bg-[var(--muted,#f5f5f4)] content-stretch cursor-pointer flex gap-[10px] items-center overflow-clip px-[8px] py-[7px] relative rounded-[8px] shrink-0 w-full" data-node-id="411:47779" data-name="View/Calendar">
          <div className="bg-[var(--muted,#f5f5f4)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex items-center justify-center overflow-clip relative rounded-[7px] shrink-0 size-[36px]" data-node-id="411:47780" data-name="Icon">
            <div className="relative shrink-0 size-[20px]" data-node-id="411:47781" data-name="icon/calendar">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconCalendar} />
            </div>
          </div>
          <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start min-w-px overflow-clip relative text-left whitespace-nowrap" data-node-id="411:47782" data-name="Text">
            <p className="font-['Geist:SemiBold'] font-semibold leading-[1.2] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)]" data-node-id="411:47783">
              Calendar
            </p>
            <p className="font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:47784">
              Meetings, hearings, plans, deadlines
            </p>
          </div>
          <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] text-left whitespace-nowrap" data-node-id="411:47785">
            G C
          </p>
        </a>
        <div className="content-stretch flex gap-[10px] items-center overflow-clip px-[8px] py-[7px] relative rounded-[8px] shrink-0 w-full" data-node-id="411:47786" data-name="View/Engagement">
          <div className="bg-[var(--muted,#f5f5f4)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex items-center justify-center overflow-clip relative rounded-[7px] shrink-0 size-[36px]" data-node-id="411:47787" data-name="Icon">
            <div className="relative shrink-0 size-[20px]" data-node-id="411:47788" data-name="icon/flag">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconFlag} />
            </div>
          </div>
          <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start min-w-px overflow-clip relative whitespace-nowrap" data-node-id="411:47789" data-name="Text">
            <p className="font-['Geist:SemiBold'] font-semibold leading-[1.2] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)]" data-node-id="411:47790">
              Outreach
            </p>
            <p className="font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:47791">
              Active asks, follow-ups and contact history
            </p>
          </div>
          <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:47792">
            G E
          </p>
        </div>
        <a className="content-stretch cursor-pointer flex gap-[10px] items-center overflow-clip px-[8px] py-[7px] relative rounded-[8px] shrink-0 w-full" data-node-id="411:47793" data-name="View/Relationships">
          <div className="bg-[var(--muted,#f5f5f4)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex items-center justify-center overflow-clip relative rounded-[7px] shrink-0 size-[36px]" data-node-id="411:47794" data-name="Icon">
            <div className="relative shrink-0 size-[20px]" data-node-id="411:47795" data-name="icon/users">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconUsers} />
            </div>
          </div>
          <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start min-w-px overflow-clip relative text-left whitespace-nowrap" data-node-id="411:47796" data-name="Text">
            <p className="font-['Geist:SemiBold'] font-semibold leading-[1.2] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)]" data-node-id="411:47797">
              Relationships
            </p>
            <p className="font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:47798">
              Targets, people, organization
            </p>
          </div>
          <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] text-left whitespace-nowrap" data-node-id="411:47799">
            G R
          </p>
        </a>
        <a className="content-stretch cursor-pointer flex gap-[10px] items-center overflow-clip px-[8px] py-[7px] relative rounded-[8px] shrink-0 w-full" data-node-id="411:47800" data-name="View/Work">
          <div className="bg-[var(--muted,#f5f5f4)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex items-center justify-center overflow-clip relative rounded-[7px] shrink-0 size-[36px]" data-node-id="411:47801" data-name="Icon">
            <div className="relative shrink-0 size-[20px]" data-node-id="411:47802" data-name="icon/file-text">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconFileText} />
            </div>
          </div>
          <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start min-w-px overflow-clip relative text-left whitespace-nowrap" data-node-id="411:47803" data-name="Text">
            <p className="font-['Geist:SemiBold'] font-semibold leading-[1.2] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)]" data-node-id="411:47804">
              Work
            </p>
            <p className="font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:47805">
              Strategies, tasks and documents
            </p>
          </div>
          <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] text-left whitespace-nowrap" data-node-id="411:47806">
            G W
          </p>
        </a>
        <a className="content-stretch cursor-pointer flex gap-[10px] items-center overflow-clip px-[8px] py-[7px] relative rounded-[8px] shrink-0 w-full" data-node-id="411:47807" data-name="View/Capabilities">
          <div className="bg-[var(--muted,#f5f5f4)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex items-center justify-center overflow-clip relative rounded-[7px] shrink-0 size-[36px]" data-node-id="411:47808" data-name="Icon">
            <div className="relative shrink-0 size-[22px]" data-node-id="411:47809" data-name="icon/grid">
              <div className="absolute border-[1.8px] border-[var(--muted-foreground,#78716c)] border-solid left-[2px] rounded-[2px] size-[8px] top-[2px]" data-node-id="411:47810" data-name="Rectangle" />
              <div className="absolute border-[1.8px] border-[var(--muted-foreground,#78716c)] border-solid left-[12px] rounded-[2px] size-[8px] top-[2px]" data-node-id="411:47811" data-name="Rectangle" />
              <div className="absolute border-[1.8px] border-[var(--muted-foreground,#78716c)] border-solid left-[2px] rounded-[2px] size-[8px] top-[12px]" data-node-id="411:47812" data-name="Rectangle" />
              <div className="absolute border-[1.8px] border-[var(--muted-foreground,#78716c)] border-solid left-[12px] rounded-[2px] size-[8px] top-[12px]" data-node-id="411:47813" data-name="Rectangle" />
            </div>
          </div>
          <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start min-w-px overflow-clip relative text-left whitespace-nowrap" data-node-id="411:47814" data-name="Text">
            <p className="font-['Geist:SemiBold'] font-semibold leading-[1.2] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)]" data-node-id="411:47815">
              Capabilities
            </p>
            <p className="font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:47816">
              Capability areas, codes, documents
            </p>
          </div>
          <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] text-left whitespace-nowrap" data-node-id="411:47817">
            G K
          </p>
        </a>
        <a className="content-stretch cursor-pointer flex gap-[10px] items-center overflow-clip px-[8px] py-[7px] relative rounded-[8px] shrink-0 w-full" data-node-id="411:47818" data-name="View/Bill Tracker">
          <div className="bg-[var(--muted,#f5f5f4)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex items-center justify-center overflow-clip relative rounded-[7px] shrink-0 size-[36px]" data-node-id="411:47819" data-name="Icon">
            <div className="relative shrink-0 size-[22px]" data-node-id="411:47820" data-name="icon/pentagon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconPentagon} />
            </div>
          </div>
          <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start min-w-px overflow-clip relative text-left whitespace-nowrap" data-node-id="411:47822" data-name="Text">
            <p className="font-['Geist:SemiBold'] font-semibold leading-[1.2] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)]" data-node-id="411:47823">
              Bill Tracker
            </p>
            <p className="font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:47824">
              Tracked bills, stages, and latest updates
            </p>
          </div>
        </a>
        <a className="content-stretch cursor-pointer flex gap-[10px] items-center overflow-clip px-[8px] py-[7px] relative rounded-[8px] shrink-0 w-full" data-node-id="411:47826" data-name="View/Opportunities">
          <div className="bg-[var(--muted,#f5f5f4)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex items-center justify-center overflow-clip relative rounded-[7px] shrink-0 size-[36px]" data-node-id="411:47827" data-name="Icon">
            <div className="relative shrink-0 size-[22px]" data-node-id="411:47828" data-name="icon/dollar">
              <div className="absolute left-px size-[20px] top-px" data-node-id="411:47829" data-name="Ellipse">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgEllipse} />
              </div>
              <p className="[word-break:break-word] absolute font-['Geist:Medium'] font-medium leading-[1.45] left-[6.5px] text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left top-px tracking-[-0.07px] whitespace-nowrap" data-node-id="411:47830">
                $
              </p>
            </div>
          </div>
          <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start min-w-px overflow-clip relative text-left whitespace-nowrap" data-node-id="411:47831" data-name="Text">
            <p className="font-['Geist:SemiBold'] font-semibold leading-[1.2] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)]" data-node-id="411:47832">
              Opportunities
            </p>
            <p className="font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:47833">
              Grants, contracts, budget programs
            </p>
          </div>
          <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] text-left whitespace-nowrap" data-node-id="411:47834">
            G Q
          </p>
        </a>
        <a className="content-stretch cursor-pointer flex gap-[10px] items-center overflow-clip px-[8px] py-[7px] relative rounded-[8px] shrink-0 w-full" data-node-id="411:47835" data-name="View/Files">
          <div className="bg-[var(--muted,#f5f5f4)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex items-center justify-center overflow-clip relative rounded-[7px] shrink-0 size-[36px]" data-node-id="411:47836" data-name="Icon">
            <div className="relative shrink-0 size-[20px]" data-node-id="411:47837" data-name="icon/sticky-note">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconStickyNote} />
            </div>
          </div>
          <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start min-w-px overflow-clip relative text-left whitespace-nowrap" data-node-id="411:47838" data-name="Text">
            <p className="font-['Geist:SemiBold'] font-semibold leading-[1.2] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)]" data-node-id="411:47839">
              Files
            </p>
            <p className="font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:47840">
              Client documents and folders
            </p>
          </div>
          <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] text-left whitespace-nowrap" data-node-id="411:47841">
            G F
          </p>
        </a>
        <div className="bg-[var(--border,#e7e5e4)] h-px relative shrink-0 w-full" data-node-id="411:47842" data-name="Divider" />
        <div className="content-stretch flex gap-[10px] items-center overflow-clip px-[10px] py-[8px] relative shrink-0" data-node-id="411:47843" data-name="Customize">
          <div className="relative shrink-0 size-[14px]" data-node-id="411:47844" data-name="icon/layout-grid">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconLayoutGrid1} />
          </div>
          <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:47845">
            Customize this view…
          </p>
        </div>
      </div>
    </div>
  );
}