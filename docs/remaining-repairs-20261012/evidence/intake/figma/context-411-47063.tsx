const imgIconLandmark = "https://www.figma.com/api/mcp/asset/bf57b0f3-0b27-476b-b0a0-90e2c05e82a1.svg";
const imgOpenModal = "https://www.figma.com/api/mcp/asset/044a40fb-57c2-448d-b2f7-b82c1eee789c.svg";

export default function GovernmentInfoX6Y0W2H1() {
  return (
    <button className="bg-[var(--card,white)] border border-[var(--border,#e7e5e4)] border-solid content-stretch cursor-pointer drop-shadow-[0px_2px_4px_rgba(12,10,9,0.04),0px_1px_1px_rgba(12,10,9,0.04)] flex flex-col items-start justify-between p-[16px] relative rounded-[var(--radius-2xl,16px)] size-full" data-node-id="411:47063" data-name="Government info · {x:6, y:0, w:2, h:1}">
      <div className="content-stretch flex gap-[8px] items-center overflow-clip relative shrink-0 w-full" data-node-id="I411:47063;20:394" data-name="Top">
        <div className="bg-[var(--muted,#f5f5f4)] content-stretch flex items-center justify-center overflow-clip relative rounded-[6px] shrink-0 size-[22px]" data-node-id="I411:47063;20:395" data-name="Icon box">
          <div className="relative shrink-0 size-[13px]" data-node-id="I411:47063;20:396" data-name="Icon">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconLandmark} />
          </div>
        </div>
        <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Medium'] font-medium leading-[1.2] min-w-px relative text-[12px] text-[color:var(--muted-foreground,#78716c)] text-left" data-node-id="I411:47063;20:398">
          Government info
        </p>
        <div className="relative shrink-0 size-[13px]" data-node-id="I411:47063;20:399" data-name="Open modal">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgOpenModal} />
        </div>
      </div>
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0 text-left w-full whitespace-nowrap" data-node-id="I411:47063;20:401" data-name="Value block">
        <p className="font-['Geist:SemiBold'] font-semibold leading-[1.2] relative shrink-0 text-[#0a0a0a] text-[22px] tracking-[-0.44px]" data-node-id="I411:47063;20:402">
          Active
        </p>
        <p className="font-['Geist:Regular'] font-normal leading-[1.4] min-w-full overflow-hidden relative shrink-0 text-[12px] text-[color:var(--muted-foreground,#78716c)] text-ellipsis w-[min-content]" data-node-id="I411:47063;20:403">
          SAM.gov · CAGE 1ABC2 · exp. Jun 2027
        </p>
      </div>
    </button>
  );
}