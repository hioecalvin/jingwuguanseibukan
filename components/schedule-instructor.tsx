import { instructorWhatsAppLink } from "@/lib/dojo-contact";

export default function ScheduleInstructor({ name, rank, whatsapp }: {
  name: string | null;
  rank: string | null;
  whatsapp: string | null;
}) {
  const link = instructorWhatsAppLink(whatsapp);
  return <div className="space-y-1 text-sm">
    <p>{name ?? "To be confirmed"}{name && rank ? ` / ${rank}` : ""}</p>
    {name && <p className="text-neutral-400">Contact: {link
      ? <a className="break-all text-sky-300 underline" href={link} target="_blank" rel="noopener noreferrer">{link.slice("https://".length)}</a>
      : "WhatsApp not provided"}</p>}
  </div>;
}
