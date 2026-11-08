import Image from "next/image";

const dojoLogos: Record<string, string> = {
  chushin: "chushin-zhongxin",
  "chushin dojo": "chushin-zhongxin",
  zhongxin: "chushin-zhongxin",
  "zhongxin dojo": "chushin-zhongxin",
  kagami: "kagami",
  "kagami dojo": "kagami",
  hayashitane: "hayashitane",
  "hayashitane dojo": "hayashitane",
  uac: "uac",
  "ubm aikido club": "uac",
};

export default function DojoLogo({ name, className = "" }: { name: string; className?: string }) {
  const logo = dojoLogos[name.trim().toLowerCase().replace(/\s+/g, " ")];
  return <Image
    src={logo ? `/logos/dojos/${logo}.png` : "/logos/organization/logo-js.png"}
    alt={logo ? `${name} logo` : "Jingwuguan Seibukan logo"}
    width={48}
    height={48}
    className={`h-12 w-12 shrink-0 rounded-full bg-white object-contain ${className}`}
  />;
}
