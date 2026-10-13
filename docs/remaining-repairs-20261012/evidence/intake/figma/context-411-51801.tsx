const imgCapiro31ProfilePicture = "https://www.figma.com/api/mcp/asset/9a4c8ef8-6772-4154-916e-cf31b791cd03.svg";
const imgCapiroWordmark = "https://www.figma.com/api/mcp/asset/fb59de46-1e36-4fbb-bf3d-df4e16620470.png";
const imgIcon = "https://www.figma.com/api/mcp/asset/f457dd21-fcfc-4ac4-abe8-bee6c9c1b5b8.svg";
const imgIcon1 = "https://www.figma.com/api/mcp/asset/153005ec-971e-46a0-bca4-2cbec36ffafa.svg";
const imgIcon2 = "https://www.figma.com/api/mcp/asset/f371a011-6eaf-4942-b5c1-5b45aabc3147.svg";
const imgIcon3 = "https://www.figma.com/api/mcp/asset/dad2a207-b289-4a0b-9dde-f11602ec7207.svg";
const imgIcon4 = "https://www.figma.com/api/mcp/asset/81143b18-83be-4c2a-bffb-58ab373d6b91.svg";
const imgIcon5 = "https://www.figma.com/api/mcp/asset/80555228-cdbf-4128-bc0e-e48b94c43a60.svg";
const imgIcon6 = "https://www.figma.com/api/mcp/asset/30c1cc40-0d5f-453b-a55e-aa6ee7bc2f93.svg";
const imgIcon7 = "https://www.figma.com/api/mcp/asset/a0ea2b69-7149-4716-b393-17cbe4befcac.svg";
const imgIcon8 = "https://www.figma.com/api/mcp/asset/ff1d098e-d1d3-4757-8fbb-5c5ee23be67c.svg";
const imgIcon9 = "https://www.figma.com/api/mcp/asset/27a14b47-24ec-4772-8523-3ab5f164aed9.svg";
const imgIcon10 = "https://www.figma.com/api/mcp/asset/41df8afb-d9cc-4e19-96f1-8893bcb8b44f.svg";
const imgIcon11 = "https://www.figma.com/api/mcp/asset/8d87d2f3-d5a7-4852-bb91-5beedef19168.svg";
const imgIcon12 = "https://www.figma.com/api/mcp/asset/d7dac9a8-fca7-43eb-848c-6d91f5e85a8d.svg";
const imgIcon13 = "https://www.figma.com/api/mcp/asset/9692af17-644f-4a17-8263-f5eaa778f1eb.svg";
const imgIcon14 = "https://www.figma.com/api/mcp/asset/5269f32d-56c2-4cb0-91ab-7fcefd6c4ed8.svg";
const imgIcon15 = "https://www.figma.com/api/mcp/asset/83b9c126-aae5-4f0a-af37-f7353ca44c99.svg";
const imgIcon16 = "https://www.figma.com/api/mcp/asset/0f323ec6-c8e3-445d-a2b1-fb6497c9a8d7.svg";
const imgIconArrowLeft = "https://www.figma.com/api/mcp/asset/b9efb49b-5cf9-4f9e-9dab-8122d34fa962.svg";
const imgIconLayoutGrid = "https://www.figma.com/api/mcp/asset/ebc42413-fea9-4f40-b4d4-dfeafba59379.svg";
const imgIconChevronDown = "https://www.figma.com/api/mcp/asset/cfa00b96-5e7d-4a20-b89a-d9ae6d1cfd7f.svg";
const imgIconPlus = "https://www.figma.com/api/mcp/asset/42e91a1e-2788-4190-b5b4-a799fd86595f.svg";
const imgChevron = "https://www.figma.com/api/mcp/asset/e888520f-db6d-497c-a0c2-3ea2dec37a08.svg";
const imgIcon17 = "https://www.figma.com/api/mcp/asset/2e3eded4-1c0a-45ff-b4cc-bed99e519978.svg";
const imgChevron1 = "https://www.figma.com/api/mcp/asset/1009f8db-25c9-46f7-b1a0-0c9cf7eec26a.svg";

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

function Capiro31ProfilePicture({ className }: { className?: string }) {
  return (
    <div className={className || "relative size-[32px]"} data-node-id="469:41439" data-name="Capiro 3.1/Profile picture">
      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCapiro31ProfilePicture} />
    </div>
  );
}

export default function RelationshipsAccountTeamDialog() {
  return (
    <div className="bg-[var(--background,#f5f5f4)] relative size-full" data-node-id="411:51801" data-name="Relationships · Account team (dialog)">
      <div className="absolute content-stretch flex flex-col h-[1040px] items-start left-0 overflow-clip top-0 w-[1440px]" data-node-id="475:99843" data-name="Capiro · Workspace shell">
        <div className="bg-[var(--card,white)] border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[var(--theme(spacing.5),20px)] h-[64px] items-center px-[var(--theme(spacing.4),16px)] relative shrink-0 w-full" data-node-id="475:99844" data-name="Capiro · Shared header">
          <div className="content-stretch flex h-[32px] items-center overflow-clip relative shrink-0 w-[196px]" data-node-id="I475:99844;469:41501" data-name="Brand · Capiro · Home">
            <div className="h-[26px] relative shrink-0 w-[77px]" data-node-id="I475:99844;469:41502" data-name="Capiro wordmark">
              <img alt="" className="absolute inset-0 max-w-none object-contain pointer-events-none size-full" src={imgCapiroWordmark} />
            </div>
          </div>
          <div className="bg-[var(--muted,#f5f5f4)] content-stretch cursor-pointer flex gap-[var(--theme(spacing.1),4px)] items-center justify-center overflow-clip p-[var(--theme(spacing.1),4px)] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="I475:99844;469:41503" data-name="Modes · Portfolio active">
            <a className="content-stretch flex gap-[8px] h-[36px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 w-[40px]" data-node-id="I475:99844;469:41504" data-name="Mode · Meri">
              <div className="relative shrink-0 size-[16px]" data-node-id="I475:99844;469:41504;12:383" data-name="Icon">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon} />
              </div>
            </a>
            <a className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex gap-[8px] h-[36px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 w-[40px]" data-node-id="I475:99844;469:41510" data-name="Mode · Portfolio">
              <div className="relative shrink-0 size-[16px]" data-node-id="I475:99844;469:41510;12:377" data-name="Icon">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon1} />
              </div>
            </a>
            <a className="content-stretch flex gap-[8px] h-[36px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 w-[40px]" data-node-id="I475:99844;469:41516" data-name="Mode · Modules">
              <div className="relative shrink-0 size-[16px]" data-node-id="I475:99844;469:41516;12:383" data-name="Icon">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon2} />
              </div>
            </a>
          </div>
          <div className="flex-[1_0_0] h-px min-w-px relative" data-node-id="I475:99844;469:41522" data-name="Flexible space" />
          <div className="content-stretch cursor-pointer flex gap-[var(--theme(spacing.3),12px)] h-[40px] items-center overflow-clip relative shrink-0" data-node-id="I475:99844;469:41523" data-name="Global actions">
            <a className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 size-[40px]" data-node-id="I475:99844;644:139304" data-name="Action · Quick log">
              <div className="relative shrink-0 size-[16px]" data-node-id="I475:99844;644:139304;12:383" data-name="Icon">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon3} />
              </div>
            </a>
            <a className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 size-[40px]" data-node-id="I475:99844;501:42742" data-name="Action · Master calendar">
              <div className="relative shrink-0 size-[16px]" data-node-id="I475:99844;501:42742;12:383" data-name="Icon">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon4} />
              </div>
            </a>
            <a className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 size-[40px]" data-node-id="I475:99844;469:41524" data-name="Action · Search">
              <div className="relative shrink-0 size-[16px]" data-node-id="I475:99844;469:41524;12:383" data-name="Icon">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon5} />
              </div>
            </a>
            <a className="content-stretch flex gap-[8px] items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 size-[40px]" data-node-id="I475:99844;469:41532" data-name="Action · Updates">
              <div className="relative shrink-0 size-[16px]" data-node-id="I475:99844;469:41532;12:383" data-name="Icon">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon6} />
              </div>
            </a>
            <a className="content-stretch flex gap-[var(--theme(spacing.2),8px)] items-center justify-center overflow-clip relative shrink-0 size-[40px]" data-node-id="I475:99844;469:41540" data-name="Action · Profile">
              <Capiro31ProfilePicture className="relative shrink-0 size-[32px]" />
            </a>
          </div>
        </div>
        <div className="bg-[var(--border,#e7e5e4)] h-px relative shrink-0 w-full" data-node-id="475:99893" data-name="Capiro · Header divider" />
        <div className="content-stretch flex flex-[1_0_0] items-start min-h-px overflow-clip relative w-full" data-node-id="475:99894" data-name="Capiro · Workspace body">
          <div className="bg-[var(--card,white)] border-[var(--border,#e7e5e4)] border-r border-solid content-stretch flex flex-col gap-[var(--theme(spacing.3),12px)] h-full items-start p-[var(--theme(spacing.4),16px)] relative shrink-0 w-[232px]" data-node-id="475:99895" data-name="Capiro · Client navigation">
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="I475:99895;471:92398">
              PORTFOLIO
            </p>
            <div className="content-stretch cursor-pointer flex flex-col gap-[var(--theme(spacing.1),4px)] items-start overflow-clip relative shrink-0 w-[200px]" data-node-id="I475:99895;471:92399" data-name="Portfolio navigation">
              <a className="content-stretch flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I475:99895;471:92400" data-name="Nav · Portfolio">
                <div className="relative shrink-0 size-[16px]" data-node-id="I475:99895;471:92400;12:383" data-name="Icon">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon2} />
                </div>
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I475:99895;471:92400;12:385">
                  Overview
                </p>
              </a>
              <a className="content-stretch flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I475:99895;471:92410" data-name="Nav · Clients">
                <div className="relative shrink-0 size-[16px]" data-node-id="I475:99895;471:92410;12:383" data-name="Icon">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon7} />
                </div>
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I475:99895;471:92410;12:385">
                  Clients
                </p>
              </a>
              <a className="content-stretch flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I475:99895;471:92419" data-name="Nav · Prospects">
                <div className="relative shrink-0 size-[16px]" data-node-id="I475:99895;471:92419;12:383" data-name="Icon">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon8} />
                </div>
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I475:99895;471:92419;12:385">
                  Prospects
                </p>
              </a>
            </div>
            <div className="bg-[var(--muted,#f5f5f4)] h-px relative shrink-0 w-[200px]" data-node-id="I475:99895;471:92428" data-name="Navigation divider" />
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="I475:99895;471:92429">
              ANDURIL
            </p>
            <div className="content-stretch cursor-pointer flex flex-col gap-[var(--theme(spacing.1),4px)] items-start overflow-clip relative shrink-0 w-[200px]" data-node-id="I475:99895;471:92430" data-name="Client navigation">
              <a className="content-stretch flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I475:99895;471:92431" data-name="Nav · Overview">
                <div className="relative shrink-0 size-[16px]" data-node-id="I475:99895;471:92431;12:383" data-name="Icon">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon2} />
                </div>
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I475:99895;471:92431;12:385">
                  Overview
                </p>
              </a>
              <a className="content-stretch flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I475:99895;471:92441" data-name="Nav · Objectives">
                <div className="relative shrink-0 size-[16px]" data-node-id="I475:99895;471:92441;12:383" data-name="Icon">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon9} />
                </div>
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I475:99895;471:92441;12:385">
                  Objectives
                </p>
              </a>
              <a className="content-stretch flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I475:99895;471:92450" data-name="Nav · Calendar">
                <div className="relative shrink-0 size-[16px]" data-node-id="I475:99895;471:92450;12:383" data-name="Icon">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon10} />
                </div>
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I475:99895;471:92450;12:385">
                  Calendar
                </p>
              </a>
              <a className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I475:99895;471:92465" data-name="Nav · Relationships">
                <div className="relative shrink-0 size-[16px]" data-node-id="I475:99895;471:92465;12:383" data-name="Icon">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon11} />
                </div>
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I475:99895;471:92465;12:385">
                  Relationships
                </p>
              </a>
              <a className="content-stretch flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I475:99895;471:92474" data-name="Nav · Work">
                <div className="relative shrink-0 size-[16px]" data-node-id="I475:99895;471:92474;12:383" data-name="Icon">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon12} />
                </div>
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I475:99895;471:92474;12:385">
                  Work
                </p>
              </a>
              <a className="content-stretch flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I475:99895;471:92484" data-name="Nav · Capabilities">
                <div className="relative shrink-0 size-[16px]" data-node-id="I475:99895;471:92484;12:383" data-name="Icon">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon13} />
                </div>
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I475:99895;471:92484;12:385">
                  Capabilities
                </p>
              </a>
              <a className="content-stretch flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I475:99895;746:146731" data-name="Nav · Bill Tracker">
                <div className="relative shrink-0 size-[16px]" data-node-id="I475:99895;746:146731;12:383" data-name="Icon">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon14} />
                </div>
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I475:99895;746:146731;12:385">
                  Bill Tracker
                </p>
              </a>
              <a className="content-stretch flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I475:99895;471:92500" data-name="Nav · Opportunities">
                <div className="relative shrink-0 size-[16px]" data-node-id="I475:99895;471:92500;12:383" data-name="Icon">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon15} />
                </div>
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I475:99895;471:92500;12:385">
                  Opportunities
                </p>
              </a>
              <a className="content-stretch flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I475:99895;471:92508" data-name="Nav · Files">
                <div className="relative shrink-0 size-[16px]" data-node-id="I475:99895;471:92508;12:383" data-name="Icon">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon14} />
                </div>
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I475:99895;471:92508;12:385">
                  Files
                </p>
              </a>
            </div>
            <div className="flex-[1_0_0] min-h-px relative w-[200px]" data-node-id="I475:99895;471:92516" data-name="Flexible space" />
            <div className="content-stretch flex flex-col gap-[var(--theme(spacing.1),4px)] items-start overflow-clip relative shrink-0 w-[200px]" data-node-id="I475:99895;471:92517" data-name="Workspace settings">
              <a className="content-stretch cursor-pointer flex gap-[8px] h-[36px] items-center px-[var(--theme(spacing.3),12px)] relative rounded-[var(--radius-lg,10px)] shrink-0 w-[200px]" data-node-id="I475:99895;471:92518" data-name="Nav · Settings">
                <div className="relative shrink-0 size-[16px]" data-node-id="I475:99895;471:92518;12:383" data-name="Icon">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon16} />
                </div>
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I475:99895;471:92518;12:385">
                  Settings
                </p>
              </a>
            </div>
          </div>
          <div className="content-stretch flex flex-[1_0_0] flex-col gap-[20px] h-full items-start min-w-px overflow-x-clip overflow-y-auto pb-[48px] pt-[24px] px-[32px] relative" data-node-id="411:51803" data-name="Main">
            <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="411:51804" data-name="Page header">
              <div className="content-stretch flex gap-[8px] items-center overflow-clip relative shrink-0" data-node-id="411:51805" data-name="Breadcrumb">
                <a className="block cursor-pointer relative shrink-0 size-[15px]" data-node-id="411:51806" data-name="icon/arrow-left">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconArrowLeft} />
                </a>
                <a className="[word-break:break-word] block cursor-pointer font-['Geist:Regular'] font-normal leading-[0] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51807">
                  <p className="leading-[1.45]">Portfolio</p>
                </a>
                <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51808">
                  /
                </p>
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[#0a0a0a] text-[12px] whitespace-nowrap" data-node-id="411:51809">
                  Anduril
                </p>
                <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51810">
                  /
                </p>
                <a className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch cursor-pointer flex gap-[6px] items-center overflow-clip pl-[8px] pr-[6px] py-[5px] relative rounded-[8px] shadow-[0px_1px_2px_0px_rgba(12,10,9,0.05)] shrink-0" data-node-id="411:51811" data-name="View switcher (⌘J)">
                  <div className="relative shrink-0 size-[14px]" data-node-id="411:51812" data-name="icon/layout-grid">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconLayoutGrid} />
                  </div>
                  <p className="[word-break:break-word] font-['Geist:SemiBold'] font-semibold leading-[1.2] relative shrink-0 text-[#0a0a0a] text-[12px] text-left whitespace-nowrap" data-node-id="411:51813">
                    Relationships
                  </p>
                  <div className="relative shrink-0 size-[14px]" data-node-id="411:51814" data-name="icon/chevron-down">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconChevronDown} />
                  </div>
                </a>
              </div>
              <div className="content-stretch flex gap-[8px] items-center overflow-clip relative shrink-0" data-node-id="411:51815" data-name="Actions">
                <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch drop-shadow-[0px_1px_1px_rgba(12,10,9,0.05)] flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="411:51816" data-name="Quick add">
                  <div className="relative shrink-0 size-[16px]" data-node-id="I411:51816;12:377" data-name="Icon">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconPlus} />
                  </div>
                  <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[#0a0a0a] text-[14px] tracking-[-0.07px] whitespace-nowrap" data-node-id="I411:51816;12:379">
                    Quick add
                  </p>
                  <div className="relative shrink-0 size-[14px]" data-node-id="I411:51816;12:380" data-name="Chevron">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevron} />
                  </div>
                </div>
                <a className="content-stretch cursor-pointer drop-shadow-[0px_1px_1px_rgba(12,10,9,0.14)] flex gap-[8px] h-[36px] items-center px-[14px] relative rounded-[var(--radius-lg,10px)] shrink-0" data-node-id="411:51817" data-name="Meri actions">
                  <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[var(--radius-lg,10px)]" style={{ backgroundImage: "linear-gradient(171.88910154620726deg, rgb(36, 36, 36) 0%, rgb(10, 10, 10) 100%)" }} />
                  <div className="relative shrink-0 size-[16px]" data-node-id="I411:51817;12:371" data-name="Icon">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon17} />
                  </div>
                  <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--primary-foreground,white)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="I411:51817;12:373">
                    Meri actions
                  </p>
                  <div className="relative shrink-0 size-[14px]" data-node-id="I411:51817;12:374" data-name="Chevron">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevron1} />
                  </div>
                  <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.14)]" />
                </a>
              </div>
            </div>
            <div className="bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex gap-[14px] items-center overflow-clip px-[20px] py-[14px] relative rounded-[12px] shrink-0 w-full" data-node-id="411:51818" data-name="Client strip">
              <a className="bg-[var(--muted,#f5f5f4)] content-stretch cursor-pointer flex items-center justify-center overflow-clip relative rounded-[8px] shrink-0 size-[40px]" data-node-id="411:51819" data-name="Avatar">
                <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--foreground,#0a0a0a)] text-left whitespace-nowrap" data-node-id="411:51820">
                  AN
                </p>
              </a>
              <div className="[word-break:break-word] content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0 whitespace-nowrap" data-node-id="411:51821" data-name="Name">
                <p className="font-['Geist:SemiBold'] font-semibold leading-[1.35] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px]" data-node-id="411:51822">
                  Anduril
                </p>
                <p className="font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px]" data-node-id="411:51823">
                  Defense technology · Costa Mesa, CA
                </p>
              </div>
              <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-start overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:51824" data-name="Badge">
                <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:51825">
                  Active client
                </p>
              </div>
              <div className="flex-[1_0_0] h-[10px] min-w-px relative" data-node-id="411:51826" data-name="Spacer" />
            </div>
            <div className="content-stretch flex flex-col gap-[20px] items-start overflow-clip relative shrink-0 w-full" data-node-id="411:51827" data-name="Content">
              <div className="content-stretch flex items-start justify-between overflow-clip relative shrink-0 w-full" data-node-id="411:51828" data-name="View head">
                <div className="content-stretch flex flex-col items-start overflow-clip relative shrink-0" data-node-id="411:51829" data-name="L">
                  <div className="content-stretch flex gap-[6px] items-center relative shrink-0" data-node-id="411:51830" data-name="Info row">
                    <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[20px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.3px] whitespace-nowrap" data-node-id="411:51831">
                      Relationships
                    </p>
                    <InfoTip className="bg-[var(--muted,#f5f5f4)] border border-[var(--border-strong,#d6d3d1)] border-solid content-stretch flex items-center justify-center relative rounded-[999px] shrink-0 size-[16px]" />
                  </div>
                </div>
                <div className="content-stretch flex items-start overflow-clip relative shrink-0" data-node-id="411:51833" data-name="Actions">
                  <a className="content-stretch cursor-pointer flex items-center justify-center overflow-clip px-[10px] py-[5px] relative rounded-[8px] shrink-0" data-node-id="411:51834" style={{ backgroundImage: "linear-gradient(171.40708121389582deg, rgb(36, 36, 36) 0%, rgb(10, 10, 10) 100%)" }} data-name="Add relationship">
                    <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--primary-foreground,white)] text-left tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51835">
                      Add relationship
                    </p>
                  </a>
                </div>
              </div>
              <div className="bg-[var(--muted,#f5f5f4)] border border-[var(--border,#e7e5e4)] border-solid content-stretch cursor-pointer flex gap-[2px] items-start overflow-clip p-[3px] relative rounded-[10px] shrink-0" data-node-id="411:51836" data-name="Relationships view">
                <a className="content-stretch flex items-start overflow-clip px-[12px] py-[6px] relative rounded-[8px] shrink-0" data-node-id="411:51837" data-name="Seg · Organization">
                  <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51838">
                    Organization
                  </p>
                </a>
                <a className="bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex items-start overflow-clip px-[12px] py-[6px] relative rounded-[8px] shrink-0" data-node-id="411:51839" data-name="Seg · Government relationships">
                  <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] text-left tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51840">
                    Government relationships
                  </p>
                </a>
              </div>
              <div className="bg-[var(--background,#f5f5f4)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-col gap-[14px] items-start overflow-clip px-[20px] py-[18px] relative rounded-[12px] shrink-0 w-full" data-node-id="411:51841" data-name="Current targets">
                <div className="[word-break:break-word] content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full whitespace-nowrap" data-node-id="411:51842" data-name="H">
                  <p className="font-['Geist:SemiBold'] font-semibold leading-[1.35] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px]" data-node-id="411:51843">
                    Current targets
                  </p>
                  <p className="font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase" data-node-id="411:51844">
                    3 TARGETS
                  </p>
                </div>
                <div className="content-stretch flex gap-[16px] items-start overflow-clip relative shrink-0 w-full" data-node-id="411:51845" data-name="Cards">
                  <div className="bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[12px] items-start min-w-px overflow-clip px-[18px] py-[16px] relative rounded-[12px]" data-node-id="411:51846" data-name="Target card · Rep. Mike Fallon">
                    <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="411:51847">
                      TARGET 01
                    </p>
                    <div className="content-stretch flex gap-[12px] items-center overflow-clip relative shrink-0 w-full" data-node-id="411:51848" data-name="Top">
                      <div className="content-stretch flex items-center justify-center overflow-clip relative rounded-[999px] shrink-0 size-[40px]" data-node-id="411:51849" style={{ backgroundImage: "linear-gradient(148.631504458068deg, rgb(36, 36, 36) 0%, rgb(10, 10, 10) 100%)" }} data-name="Avatar">
                        <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--primary-foreground,white)] whitespace-nowrap" data-node-id="411:51850">
                          MF
                        </p>
                      </div>
                      <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-px items-start min-w-px overflow-clip relative whitespace-nowrap" data-node-id="411:51851" data-name="T">
                        <p className="font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase" data-node-id="411:51852">
                          MEMBER OF CONGRESS
                        </p>
                        <p className="font-['Geist:Medium'] font-medium leading-[1.45] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px]" data-node-id="411:51853">
                          Rep. Mike Fallon
                        </p>
                        <p className="font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px]" data-node-id="411:51854">
                          House · Armed Services
                        </p>
                        <p className="font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:51855">
                          R · CA-47
                        </p>
                      </div>
                      <div className="bg-[var(--accent-subtle,#f5f5f4)] content-stretch flex items-center overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:51856" data-name="Tag">
                        <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--accent,#0a0a0a)] whitespace-nowrap" data-node-id="411:51857">
                          Tier 1
                        </p>
                      </div>
                    </div>
                    <div className="[word-break:break-word] border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[12px] items-start overflow-clip pt-[10px] relative shrink-0 w-full" data-node-id="411:51858" data-name="Row">
                      <p className="font-['Geist:Medium'] font-medium h-[14px] leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase w-[86px]" data-node-id="411:51859">
                        REPRESENTS
                      </p>
                      <p className="font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] w-[200px]" data-node-id="411:51860">
                        Costa Mesa headquarters
                      </p>
                    </div>
                    <div className="[word-break:break-word] border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[12px] items-start overflow-clip pt-[10px] relative shrink-0 w-full" data-node-id="411:51861" data-name="Row">
                      <p className="font-['Geist:Medium'] font-medium h-[14px] leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase w-[86px]" data-node-id="411:51862">
                        ADDED
                      </p>
                      <p className="font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] w-[200px]" data-node-id="411:51863">
                        Meri · Aug 14
                      </p>
                    </div>
                    <div className="content-stretch flex items-start justify-end overflow-clip relative shrink-0 w-full" data-node-id="411:51864" data-name="Open">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--accent,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51865">
                        Open target →
                      </p>
                    </div>
                  </div>
                  <div className="bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[12px] items-start min-w-px overflow-clip px-[18px] py-[16px] relative rounded-[12px]" data-node-id="411:51866" data-name="Target card · Sen. Jack Reed">
                    <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="411:51867">
                      TARGET 02
                    </p>
                    <div className="content-stretch flex gap-[12px] items-center overflow-clip relative shrink-0 w-full" data-node-id="411:51868" data-name="Top">
                      <div className="content-stretch flex items-center justify-center overflow-clip relative rounded-[999px] shrink-0 size-[40px]" data-node-id="411:51869" style={{ backgroundImage: "linear-gradient(148.631504458068deg, rgb(36, 36, 36) 0%, rgb(10, 10, 10) 100%)" }} data-name="Avatar">
                        <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--primary-foreground,white)] whitespace-nowrap" data-node-id="411:51870">
                          JR
                        </p>
                      </div>
                      <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-px items-start min-w-px overflow-clip relative whitespace-nowrap" data-node-id="411:51871" data-name="T">
                        <p className="font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase" data-node-id="411:51872">
                          MEMBER OF CONGRESS
                        </p>
                        <p className="font-['Geist:Medium'] font-medium leading-[1.45] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px]" data-node-id="411:51873">
                          Sen. Jack Reed
                        </p>
                        <p className="font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px]" data-node-id="411:51874">
                          Senate · Armed Services
                        </p>
                        <p className="font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:51875">
                          D · RI
                        </p>
                      </div>
                      <div className="bg-[var(--accent-subtle,#f5f5f4)] content-stretch flex items-center overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:51876" data-name="Tag">
                        <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--accent,#0a0a0a)] whitespace-nowrap" data-node-id="411:51877">
                          Tier 1
                        </p>
                      </div>
                    </div>
                    <div className="[word-break:break-word] border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[12px] items-start overflow-clip pt-[10px] relative shrink-0 w-full" data-node-id="411:51878" data-name="Row">
                      <p className="font-['Geist:Medium'] font-medium h-[14px] leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase w-[86px]" data-node-id="411:51879">
                        REPRESENTS
                      </p>
                      <p className="font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] w-[200px]" data-node-id="411:51880">
                        No facility in this district
                      </p>
                    </div>
                    <div className="[word-break:break-word] border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[12px] items-start overflow-clip pt-[10px] relative shrink-0 w-full" data-node-id="411:51881" data-name="Row">
                      <p className="font-['Geist:Medium'] font-medium h-[14px] leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase w-[86px]" data-node-id="411:51882">
                        ADDED
                      </p>
                      <p className="font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] w-[200px]" data-node-id="411:51883">
                        Manual · Mar 3
                      </p>
                    </div>
                    <div className="content-stretch flex items-start justify-end overflow-clip relative shrink-0 w-full" data-node-id="411:51884" data-name="Open">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--accent,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51885">
                        Open target →
                      </p>
                    </div>
                  </div>
                  <div className="bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[12px] items-start min-w-px overflow-clip px-[18px] py-[16px] relative rounded-[12px]" data-node-id="411:51886" data-name="Target card · Rep. Ken Calvert">
                    <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="411:51887">
                      TARGET 03
                    </p>
                    <div className="content-stretch flex gap-[12px] items-center overflow-clip relative shrink-0 w-full" data-node-id="411:51888" data-name="Top">
                      <div className="content-stretch flex items-center justify-center overflow-clip relative rounded-[999px] shrink-0 size-[40px]" data-node-id="411:51889" style={{ backgroundImage: "linear-gradient(148.631504458068deg, rgb(36, 36, 36) 0%, rgb(10, 10, 10) 100%)" }} data-name="Avatar">
                        <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--primary-foreground,white)] whitespace-nowrap" data-node-id="411:51890">
                          KC
                        </p>
                      </div>
                      <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-px items-start min-w-px overflow-clip relative whitespace-nowrap" data-node-id="411:51891" data-name="T">
                        <p className="font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase" data-node-id="411:51892">
                          MEMBER OF CONGRESS
                        </p>
                        <p className="font-['Geist:Medium'] font-medium leading-[1.45] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px]" data-node-id="411:51893">
                          Rep. Ken Calvert
                        </p>
                        <p className="font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px]" data-node-id="411:51894">
                          House · Appropriations
                        </p>
                        <p className="font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:51895">
                          R · CA-41
                        </p>
                      </div>
                      <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-center overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:51896" data-name="Tag">
                        <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:51897">
                          Tier 2
                        </p>
                      </div>
                    </div>
                    <div className="[word-break:break-word] border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[12px] items-start overflow-clip pt-[10px] relative shrink-0 w-full" data-node-id="411:51898" data-name="Row">
                      <p className="font-['Geist:Medium'] font-medium h-[14px] leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase w-[86px]" data-node-id="411:51899">
                        REPRESENTS
                      </p>
                      <p className="font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] w-[200px]" data-node-id="411:51900">
                        Arsenal-1 test range
                      </p>
                    </div>
                    <div className="[word-break:break-word] border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex gap-[12px] items-start overflow-clip pt-[10px] relative shrink-0 w-full" data-node-id="411:51901" data-name="Row">
                      <p className="font-['Geist:Medium'] font-medium h-[14px] leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase w-[86px]" data-node-id="411:51902">
                        ADDED
                      </p>
                      <p className="font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] w-[200px]" data-node-id="411:51903">
                        Meri · Sep 2
                      </p>
                    </div>
                    <div className="content-stretch flex items-start justify-end overflow-clip relative shrink-0 w-full" data-node-id="411:51904" data-name="Open">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--accent,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51905">
                        Open target →
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[12px] shrink-0 w-full" data-node-id="411:51906" data-name="Table card · Congressional targets">
                <div className="border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[12px] items-center overflow-clip px-[20px] py-[14px] relative shrink-0 w-full" data-node-id="411:51907" data-name="H">
                  <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="411:51908">
                    CONGRESSIONAL TARGETS
                  </p>
                  <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:51909">
                    4 records
                  </p>
                  <div className="flex-[1_0_0] h-[10px] min-w-px relative" data-node-id="411:51910" data-name="Spacer" />
                  <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--accent,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51911">
                    Add relationship
                  </p>
                </div>
                <div className="content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-full" data-node-id="411:51912" data-name="Table">
                  <div className="bg-[var(--muted,#f5f5f4)] border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[14px] items-center overflow-clip px-[20px] py-[9px] relative shrink-0 w-full" data-node-id="411:51913" data-name="Table head">
                    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px overflow-clip relative" data-node-id="411:51914" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="411:51915">
                        NAME
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[170px]" data-node-id="411:51916" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="411:51917">
                        TYPE
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[150px]" data-node-id="411:51918" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="411:51919">
                        JURISDICTION
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[200px]" data-node-id="411:51920" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="411:51921">
                        OFFICE
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[100px]" data-node-id="411:51922" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="411:51923">
                        TARGET
                      </p>
                    </div>
                  </div>
                  <div className="border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[14px] items-center overflow-clip px-[20px] py-[12px] relative shrink-0 w-full" data-node-id="411:51924" data-name="Target row">
                    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px overflow-clip relative" data-node-id="411:51925" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.45] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="411:51926">
                        Rep. Mike Fallon
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[170px]" data-node-id="411:51927" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51928">
                        Member of Congress
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[150px]" data-node-id="411:51929" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51930">
                        CA-47 · House
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[200px]" data-node-id="411:51931" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51932">
                        Armed Services
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[100px]" data-node-id="411:51933" data-name="Cell">
                      <div className="bg-[var(--accent-subtle,#f5f5f4)] content-stretch flex items-center overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:51934" data-name="Tag">
                        <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--accent,#0a0a0a)] whitespace-nowrap" data-node-id="411:51935">
                          Tier 1
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[14px] items-center overflow-clip px-[20px] py-[12px] relative shrink-0 w-full" data-node-id="411:51936" data-name="Target row">
                    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px overflow-clip relative" data-node-id="411:51937" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.45] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="411:51938">
                        Sen. Jack Reed
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[170px]" data-node-id="411:51939" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51940">
                        Member of Congress
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[150px]" data-node-id="411:51941" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51942">
                        RI · Senate
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[200px]" data-node-id="411:51943" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51944">
                        Armed Services
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[100px]" data-node-id="411:51945" data-name="Cell">
                      <div className="bg-[var(--accent-subtle,#f5f5f4)] content-stretch flex items-center overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:51946" data-name="Tag">
                        <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--accent,#0a0a0a)] whitespace-nowrap" data-node-id="411:51947">
                          Tier 1
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[14px] items-center overflow-clip px-[20px] py-[12px] relative shrink-0 w-full" data-node-id="411:51948" data-name="Target row">
                    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px overflow-clip relative" data-node-id="411:51949" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.45] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="411:51950">
                        Rep. Ken Calvert
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[170px]" data-node-id="411:51951" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51952">
                        Member of Congress
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[150px]" data-node-id="411:51953" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51954">
                        CA-41 · House
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[200px]" data-node-id="411:51955" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51956">
                        Appropriations
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[100px]" data-node-id="411:51957" data-name="Cell">
                      <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-center overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:51958" data-name="Tag">
                        <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:51959">
                          Tier 2
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[14px] items-center overflow-clip px-[20px] py-[12px] relative shrink-0 w-full" data-node-id="411:51960" data-name="Target row">
                    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px overflow-clip relative" data-node-id="411:51961" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.45] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="411:51962">
                        Assemblymember Dana Ruiz
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[170px]" data-node-id="411:51963" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51964">
                        State legislator
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[150px]" data-node-id="411:51965" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51966">
                        CA · lower
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[200px]" data-node-id="411:51967" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51968">
                        Veterans Affairs
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[100px]" data-node-id="411:51969" data-name="Cell">
                      <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-center overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:51970" data-name="Tag">
                        <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:51971">
                          Current
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[12px] shrink-0 w-full" data-node-id="411:51972" data-name="Table card · Congressional staff">
                <div className="border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[12px] items-center overflow-clip px-[20px] py-[14px] relative shrink-0 w-full" data-node-id="411:51973" data-name="H">
                  <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="411:51974">
                    CONGRESSIONAL STAFF
                  </p>
                  <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:51975">
                    2 records
                  </p>
                  <div className="flex-[1_0_0] h-[10px] min-w-px relative" data-node-id="411:51976" data-name="Spacer" />
                </div>
                <div className="content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-full" data-node-id="411:51977" data-name="Table">
                  <div className="bg-[var(--muted,#f5f5f4)] border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[14px] items-center overflow-clip px-[20px] py-[9px] relative shrink-0 w-full" data-node-id="411:51978" data-name="Table head">
                    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px overflow-clip relative" data-node-id="411:51979" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="411:51980">
                        NAME
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[170px]" data-node-id="411:51981" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="411:51982">
                        TYPE
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[150px]" data-node-id="411:51983" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="411:51984">
                        JURISDICTION
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[200px]" data-node-id="411:51985" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="411:51986">
                        OFFICE
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[100px]" data-node-id="411:51987" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[11px] text-[color:var(--muted-foreground,#78716c)] tracking-[0.66px] uppercase whitespace-nowrap" data-node-id="411:51988">
                        TARGET
                      </p>
                    </div>
                  </div>
                  <div className="border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[14px] items-center overflow-clip px-[20px] py-[12px] relative shrink-0 w-full" data-node-id="411:51989" data-name="Target row">
                    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px overflow-clip relative" data-node-id="411:51990" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.45] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="411:51991">
                        Priya Raman
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[170px]" data-node-id="411:51992" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51993">
                        Personal-office staff
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[150px]" data-node-id="411:51994" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51995">
                        CA-47 · House
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[200px]" data-node-id="411:51996" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:51997">
                        Rep. Fallon office
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[100px]" data-node-id="411:51998" data-name="Cell">
                      <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-center overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:51999" data-name="Tag">
                        <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:52000">
                          Current
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[14px] items-center overflow-clip px-[20px] py-[12px] relative shrink-0 w-full" data-node-id="411:52001" data-name="Target row">
                    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px overflow-clip relative" data-node-id="411:52002" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.45] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="411:52003">
                        Mara Singh
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[170px]" data-node-id="411:52004" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:52005">
                        Committee staff
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[150px]" data-node-id="411:52006" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:52007">
                        RI · Senate
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[200px]" data-node-id="411:52008" data-name="Cell">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:52009">
                        SASC majority
                      </p>
                    </div>
                    <div className="content-stretch flex items-center overflow-clip relative shrink-0 w-[100px]" data-node-id="411:52010" data-name="Cell">
                      <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-center overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:52011" data-name="Tag">
                        <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:52012">
                          Tier 2
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-start overflow-clip px-[20px] py-[12px] relative shrink-0 w-full" data-node-id="411:52013" data-name="Foot">
                  <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] w-[1100px]" data-node-id="411:52014">
                    Targets come from the client’s active strategies. Congressional staff are Directory records already attached to those offices; no staffer is inferred onto an office.
                  </p>
                </div>
              </div>
              <div className="bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[12px] shrink-0 w-full" data-node-id="411:52015" data-name="Suggested by Meri">
                <div className="border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex items-center justify-between overflow-clip px-[20px] py-[14px] relative shrink-0 w-full" data-node-id="411:52016" data-name="H">
                  <div className="content-stretch flex flex-col items-start overflow-clip relative shrink-0" data-node-id="411:52017" data-name="L">
                    <div className="content-stretch flex gap-[6px] items-center relative shrink-0" data-node-id="411:52018" data-name="Info row">
                      <p className="[word-break:break-word] font-['Geist:SemiBold'] font-semibold leading-[1.35] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="411:52019">
                        Suggested by Meri
                      </p>
                      <InfoTip className="bg-[var(--muted,#f5f5f4)] border border-[var(--border-strong,#d6d3d1)] border-solid content-stretch flex items-center justify-center relative rounded-[999px] shrink-0 size-[16px]" />
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[12px] items-center overflow-clip relative shrink-0" data-node-id="411:52021" data-name="R">
                    <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:52022">
                      Updated 2 hours ago · top 6 · weighted score
                    </p>
                    <div className="bg-[var(--card,white)] border border-[var(--border-strong,#d6d3d1)] border-solid content-stretch flex items-center justify-center overflow-clip px-[10px] py-[5px] relative rounded-[8px] shrink-0" data-node-id="411:52023" data-name="Refresh">
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:52024">
                        Refresh
                      </p>
                    </div>
                  </div>
                </div>
                <div className="border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[14px] items-center overflow-clip px-[20px] py-[12px] relative shrink-0 w-full" data-node-id="411:52025" data-name="Suggestion">
                  <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:52026">
                    1
                  </p>
                  <div className="content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start min-w-px overflow-clip relative" data-node-id="411:52027" data-name="T">
                    <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.45] relative shrink-0 text-[14px] text-[color:var(--accent,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="411:52028">
                      Rep. Adam Smith
                    </p>
                    <div className="content-stretch flex gap-[8px] items-center overflow-clip relative shrink-0" data-node-id="411:52029" data-name="Meta">
                      <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-center overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:52030" data-name="Tag">
                        <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:52031">
                          D-WA
                        </p>
                      </div>
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:52032">
                        House · Armed Services
                      </p>
                    </div>
                    <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:52033">
                      6 tracked bills · score 0.82
                    </p>
                  </div>
                  <a className="bg-[var(--card,white)] border border-[var(--border-strong,#d6d3d1)] border-solid content-stretch cursor-pointer flex items-center justify-center overflow-clip px-[10px] py-[5px] relative rounded-[8px] shrink-0" data-node-id="411:52034" data-name="Add">
                    <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] text-left tracking-[-0.039px] whitespace-nowrap" data-node-id="411:52035">
                      + Add
                    </p>
                  </a>
                </div>
                <div className="border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[14px] items-center overflow-clip px-[20px] py-[12px] relative shrink-0 w-full" data-node-id="411:52036" data-name="Suggestion">
                  <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:52037">
                    2
                  </p>
                  <div className="content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start min-w-px overflow-clip relative" data-node-id="411:52038" data-name="T">
                    <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.45] relative shrink-0 text-[14px] text-[color:var(--accent,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="411:52039">
                      Sen. Roger Wicker
                    </p>
                    <div className="content-stretch flex gap-[8px] items-center overflow-clip relative shrink-0" data-node-id="411:52040" data-name="Meta">
                      <div className="bg-[var(--destructive-subtle,#f3e7e5)] content-stretch flex items-center overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:52041" data-name="Tag">
                        <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--destructive-text,#652424)] whitespace-nowrap" data-node-id="411:52042">
                          R-MS
                        </p>
                      </div>
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:52043">
                        Senate · Armed Services
                      </p>
                    </div>
                    <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:52044">
                      5 tracked bills · score 0.77
                    </p>
                  </div>
                  <a className="bg-[var(--card,white)] border border-[var(--border-strong,#d6d3d1)] border-solid content-stretch cursor-pointer flex items-center justify-center overflow-clip px-[10px] py-[5px] relative rounded-[8px] shrink-0" data-node-id="411:52045" data-name="Add">
                    <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] text-left tracking-[-0.039px] whitespace-nowrap" data-node-id="411:52046">
                      + Add
                    </p>
                  </a>
                </div>
                <div className="border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[14px] items-center overflow-clip px-[20px] py-[12px] relative shrink-0 w-full" data-node-id="411:52047" data-name="Suggestion">
                  <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.3] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:52048">
                    3
                  </p>
                  <div className="content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start min-w-px overflow-clip relative" data-node-id="411:52049" data-name="T">
                    <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.45] relative shrink-0 text-[14px] text-[color:var(--accent,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="411:52050">
                      Rep. Ken Calvert
                    </p>
                    <div className="content-stretch flex gap-[8px] items-center overflow-clip relative shrink-0" data-node-id="411:52051" data-name="Meta">
                      <div className="bg-[var(--destructive-subtle,#f3e7e5)] content-stretch flex items-center overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:52052" data-name="Tag">
                        <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--destructive-text,#652424)] whitespace-nowrap" data-node-id="411:52053">
                          R-CA
                        </p>
                      </div>
                      <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:52054">
                        House · Appropriations
                      </p>
                    </div>
                    <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:52055">
                      4 tracked bills · score 0.71
                    </p>
                  </div>
                  <div className="bg-[var(--accent-subtle,#f5f5f4)] content-stretch flex items-center overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:52056" data-name="Tag">
                    <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--success,#3d6b4f)] whitespace-nowrap" data-node-id="411:52057">
                      Added
                    </p>
                  </div>
                </div>
                <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-start overflow-clip px-[20px] py-[12px] relative shrink-0 w-full" data-node-id="411:52058" data-name="Foot">
                  <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--accent,#0a0a0a)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:52059">
                    View all in Intelligence →
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <a className="absolute bg-[rgba(10,10,10,0.45)] block cursor-pointer h-[1040px] left-0 top-0 w-[1440px]" data-node-id="411:52060" data-name="Scrim (click to close)" />
      <div className="absolute bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch flex flex-col items-start left-[440px] overflow-clip rounded-[14px] shadow-[0px_16px_40px_-12px_rgba(12,10,9,0.18),0px_2px_6px_0px_rgba(12,10,9,0.05)] top-[120px] w-[560px]" data-node-id="411:52061" data-name="Dialog">
        <div className="border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex flex-col items-start overflow-clip pb-[14px] pt-[22px] px-[28px] relative shrink-0 w-full" data-node-id="411:52062" data-name="Header">
          <div className="[word-break:break-word] content-stretch flex items-center justify-between overflow-clip relative shrink-0 text-[14px] tracking-[-0.07px] w-full whitespace-nowrap" data-node-id="411:52063" data-name="Row">
            <p className="font-['Geist:SemiBold'] font-semibold leading-[1.35] relative shrink-0 text-[color:var(--foreground,#0a0a0a)]" data-node-id="411:52064">
              Account team · Anduril
            </p>
            <a className="block cursor-pointer font-['Geist:Regular'] font-normal leading-[0] relative shrink-0 text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:52065">
              <p className="leading-[1.45]">✕</p>
            </a>
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[16px] items-start overflow-clip px-[28px] py-[18px] relative shrink-0 w-full" data-node-id="411:52066" data-name="Body">
          <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] w-[500px]" data-node-id="411:52067">
            Who at the firm works this account. The account owner is always on the team. Change that from the header’s Account owner picker.
          </p>
          <div className="border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[12px] items-center overflow-clip py-[8px] relative shrink-0 w-full" data-node-id="411:52068" data-name="Member">
            <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-center justify-center overflow-clip relative rounded-[999px] shrink-0 size-[28px]" data-node-id="411:52069" data-name="Avatar">
              <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:52070">
                JC
              </p>
            </div>
            <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col font-['Geist:Regular'] font-normal gap-px items-start min-w-px overflow-clip relative whitespace-nowrap" data-node-id="411:52071" data-name="T">
              <p className="leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px]" data-node-id="411:52072">
                Jordan Clayton
              </p>
              <p className="leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:52073">
                Account owner · Principal · jordan@capiro.ai
              </p>
            </div>
            <div className="bg-[var(--accent-subtle,#f5f5f4)] content-stretch flex items-center overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-node-id="411:52074" data-name="Tag">
              <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--accent,#0a0a0a)] whitespace-nowrap" data-node-id="411:52075">
                Owner
              </p>
            </div>
          </div>
          <div className="border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[12px] items-center overflow-clip py-[8px] relative shrink-0 w-full" data-node-id="411:52076" data-name="Member">
            <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-center justify-center overflow-clip relative rounded-[999px] shrink-0 size-[28px]" data-node-id="411:52077" data-name="Avatar">
              <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:52078">
                NM
              </p>
            </div>
            <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col font-['Geist:Regular'] font-normal gap-px items-start min-w-px overflow-clip relative whitespace-nowrap" data-node-id="411:52079" data-name="T">
              <p className="leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px]" data-node-id="411:52080">
                Nia Marcus
              </p>
              <p className="leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:52081">
                Senior associate · nia@capiro.ai
              </p>
            </div>
            <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--destructive-text,#652424)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:52082">
              Remove
            </p>
          </div>
          <div className="border-[var(--border,#e7e5e4)] border-b border-solid content-stretch flex gap-[12px] items-center overflow-clip py-[8px] relative shrink-0 w-full" data-node-id="411:52083" data-name="Member">
            <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-center justify-center overflow-clip relative rounded-[999px] shrink-0 size-[28px]" data-node-id="411:52084" data-name="Avatar">
              <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:52085">
                RP
              </p>
            </div>
            <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col font-['Geist:Regular'] font-normal gap-px items-start min-w-px overflow-clip relative whitespace-nowrap" data-node-id="411:52086" data-name="T">
              <p className="leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.039px]" data-node-id="411:52087">
                Ravi Patel
              </p>
              <p className="leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)]" data-node-id="411:52088">
                Analyst · ravi@capiro.ai
              </p>
            </div>
            <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--destructive-text,#652424)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:52089">
              Remove
            </p>
          </div>
          <div className="content-stretch flex gap-[12px] items-end overflow-clip relative shrink-0 w-full" data-node-id="411:52090" data-name="Add">
            <div className="content-stretch flex flex-[1_0_0] flex-col gap-[6px] items-start min-w-px overflow-clip relative" data-node-id="411:52091" data-name="Field · Add a teammate">
              <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:52092">
                Add a teammate
              </p>
              <div className="bg-[var(--card,white)] border border-[var(--border-strong,#d6d3d1)] border-solid content-stretch flex items-center overflow-clip px-[12px] py-[9px] relative rounded-[8px] shrink-0 w-full" data-node-id="411:52093" data-name="Input">
                <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] tracking-[-0.07px] whitespace-nowrap" data-node-id="411:52094">
                  Pick someone
                </p>
                <div className="flex-[1_0_0] h-[10px] min-w-px relative" data-node-id="411:52095" data-name="Spacer" />
                <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:52096">
                  ▾
                </p>
              </div>
            </div>
            <div className="content-stretch flex flex-[1_0_0] flex-col gap-[6px] items-start min-w-px overflow-clip relative" data-node-id="411:52097" data-name="Field · Role (optional)">
              <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.039px] whitespace-nowrap" data-node-id="411:52098">
                Role (optional)
              </p>
              <a className="bg-[var(--card,white)] border border-[var(--border-strong,#d6d3d1)] border-solid content-stretch cursor-pointer flex items-center overflow-clip px-[12px] py-[9px] relative rounded-[8px] shrink-0 w-full" data-node-id="411:52099" data-name="Input">
                <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[14px] text-[color:var(--muted-foreground,#78716c)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="411:52100">
                  e.g. Lead lobbyist
                </p>
              </a>
            </div>
          </div>
          <a className="content-stretch cursor-pointer flex items-center justify-center overflow-clip px-[10px] py-[5px] relative rounded-[8px] shrink-0" data-node-id="411:52101" style={{ backgroundImage: "linear-gradient(169.23620825211316deg, rgb(36, 36, 36) 0%, rgb(10, 10, 10) 100%)" }} data-name="Add to team">
            <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.45] relative shrink-0 text-[13px] text-[color:var(--primary-foreground,white)] text-left tracking-[-0.039px] whitespace-nowrap" data-node-id="411:52102">
              Add to team
            </p>
          </a>
        </div>
        <div className="bg-[var(--muted,#f5f5f4)] border-[var(--border,#e7e5e4)] border-solid border-t content-stretch flex items-center justify-end overflow-clip px-[28px] py-[16px] relative shrink-0 w-full" data-node-id="411:52103" data-name="Footer">
          <a className="bg-[var(--card,white)] border border-[var(--border-strong,#d6d3d1)] border-solid content-stretch cursor-pointer flex items-center justify-center overflow-clip px-[14px] py-[8px] relative rounded-[8px] shrink-0" data-node-id="411:52104" data-name="Done">
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[14px] text-[color:var(--foreground,#0a0a0a)] text-left tracking-[-0.07px] whitespace-nowrap" data-node-id="411:52105">
              Done
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}