import Image from "next/image";

export function BrandLogo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative h-10 w-10 shrink-0 sm:h-11 sm:w-11">
        <Image
          src="/brand/vtripplanner-scenic-mark.png"
          alt=""
          fill
          priority
          sizes="44px"
          className="object-contain"
        />
      </span>

      <span className="text-[20px] font-bold tracking-[-0.025em] text-white sm:text-[22px]">
        VTrip
        <span className="text-emerald-300">Planner</span>
      </span>
    </span>
  );
}
