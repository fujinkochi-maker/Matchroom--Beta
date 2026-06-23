import wbc from "@/assets/WBC.png";
import wba from "@/assets/WBA.png";
import ibf from "@/assets/IBF.png";
import wbo from "@/assets/WBO.png";
import ibo from "@/assets/IBO.png";
import ring from "@/assets/RING.png";

const BELT_IMAGES: Record<string, string> = {
  WBC: wbc,
  WBA: wba,
  IBF: ibf,
  WBO: wbo,
  IBO: ibo,
  RING: ring,
};

export function BeltIcon({
  name,
  className = "h-5 w-auto inline",
}: {
  name: string;
  className?: string;
}) {
  const src = BELT_IMAGES[name];
  if (!src)
    return (
      <span className="bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
        {name}
      </span>
    );
  return <img src={src} alt={name} title={name} className={className} />;
}
