export default function SearchPage() {
  return (
    <div className="h-full flex flex-col gap-4">
      <div className="shrink-0 pt-2">
        <h1 className="text-[22px] font-bold text-black">Search</h1>
        <p className="text-[12px] text-[#9A9A9A] mt-0.5">Find anything across your school</p>
      </div>
      <div className="dash-card rounded-2xl flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[14px] font-semibold text-[#9A9A9A]">Coming soon</p>
          <p className="text-[11px] text-[#9A9A9A]/60 mt-1">Search across assignments, resources and more</p>
        </div>
      </div>
    </div>
  );
}
