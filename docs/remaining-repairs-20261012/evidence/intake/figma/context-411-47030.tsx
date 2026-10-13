const imgDot = "https://www.figma.com/api/mcp/asset/cd2a55c9-d577-48fe-9a78-312ef4d41b9b.svg";
const imgDot1 = "https://www.figma.com/api/mcp/asset/b4cf6086-fc4a-4aa2-9281-9f909b9f2c12.svg";

type V2ChipProps = {
  className?: string;
  label?: string;
  tone?: "Red solid";
};

function V2Chip({ className, label = "Critical · 3", tone = "Red solid" }: V2ChipProps) {
  return (
    <div className={className || "bg-[var(--destructive,#7a2e2e)] content-stretch flex gap-[6px] h-[22px] items-center pl-[8px] pr-[9px] relative rounded-[var(--radius-full,999px)]"} data-node-id="12:390">
      <div className="relative shrink-0 size-[6px]" data-node-id="12:391" data-name="Dot">
        <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgDot} />
      </div>
      <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[12px] text-[color:var(--primary-foreground,white)] whitespace-nowrap" data-node-id="12:392">
        {label}
      </p>
    </div>
  );
}

export default function Identity() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative size-full" data-node-id="411:47030" data-name="Identity">
      <div className="content-stretch flex items-center justify-center relative rounded-[var(--radius-lg,10px)] shrink-0 size-[52px]" data-node-id="411:47031" style={{ backgroundImage: "linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 100%), linear-gradient(148.631504458068deg, rgb(36, 36, 36) 0%, rgb(10, 10, 10) 100%)" }} data-name="v2/Monogram">
        <p className="[word-break:break-word] font-['Geist:SemiBold'] font-semibold leading-[1.35] relative shrink-0 text-[16px] text-[color:var(--muted-foreground,#78716c)] tracking-[-0.08px] whitespace-nowrap" data-node-id="I411:47031;12:499">
          AN
        </p>
      </div>
      <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px overflow-clip relative" data-node-id="411:47032" data-name="Name stack">
        <div className="content-stretch flex gap-[10px] items-center overflow-clip relative shrink-0" data-node-id="411:47033" data-name="Name row">
          <p className="[word-break:break-word] font-['Geist:SemiBold'] font-semibold leading-[1.2] relative shrink-0 text-[#0a0a0a] text-[22px] tracking-[-0.44px] whitespace-nowrap" data-node-id="411:47034">
            Anduril
          </p>
          <div className="bg-[var(--card,white)] border border-[var(--input,#e7e5e4)] border-solid content-stretch flex gap-[6px] h-[22px] items-center pl-[8px] pr-[9px] relative rounded-[var(--radius-full,999px)] shrink-0" data-node-id="411:47035" data-name="v2/Chip">
            <div className="relative shrink-0 size-[6px]" data-node-id="I411:47035;12:406" data-name="Dot">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgDot1} />
            </div>
            <p className="[word-break:break-word] font-['Geist:Medium'] font-medium leading-[1.2] relative shrink-0 text-[#0a0a0a] text-[12px] whitespace-nowrap" data-node-id="I411:47035;12:407">
              Active client
            </p>
          </div>
          <V2Chip className="bg-[var(--destructive,#7a2e2e)] content-stretch flex gap-[6px] h-[22px] items-center pl-[8px] pr-[9px] relative rounded-[var(--radius-full,999px)] shrink-0" />
        </div>
        <p className="[word-break:break-word] font-['Geist:Regular'] font-normal leading-[1.4] relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] whitespace-nowrap" data-node-id="411:47037">
          Defense technology · Costa Mesa, CA · anduril.com
        </p>
      </div>
    </div>
  );
}