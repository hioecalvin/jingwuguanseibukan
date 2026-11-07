import { dojoPhoneLink } from "@/lib/dojo-contact";

export default function ScheduleInstructor({ name, rank, phone }: {
  name: string | null;
  rank: string | null;
  phone: string | null;
}) {
  const link = dojoPhoneLink(phone);
  return <div className="space-y-1 text-sm">
    <p>{name ?? "To be confirmed"}{name && rank ? ` / ${rank}` : ""}</p>
    {name && <p className="text-neutral-400">Contact: {link
      ? <a className="text-sky-300 underline" href={link}>{phone}</a>
      : "Not provided"}</p>}
  </div>;
}
