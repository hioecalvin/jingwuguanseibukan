import type { Metadata } from "next";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Certificate verification - Jingwuguan Seibukan",
  robots: { index: false, follow: false },
};

type VerificationRecord = {
  certificate_id: string;
  certificate_number: string;
  certificate_status: "pending" | "issued" | "voided";
  member_name: string;
  promoted_rank: string;
  promotion_date: string;
  assessor_name: string | null;
  class_name: string;
  dojo_name: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function statusPresentation(status: VerificationRecord["certificate_status"]) {
  if (status === "issued") {
    return {
      label: "ISSUED - VALID",
      classes: "border-emerald-700 bg-emerald-950/40 text-emerald-200",
      explanation: "This certificate was issued after the complete assessment was submitted.",
    };
  }
  if (status === "voided") {
    return {
      label: "VOID - NOT VALID",
      classes: "border-red-700 bg-red-950/40 text-red-200",
      explanation: "This prepared certificate was voided and must not be accepted.",
    };
  }
  return {
    label: "PENDING - NOT YET VALID",
    classes: "border-amber-700 bg-amber-950/40 text-amber-100",
    explanation: "The assessment has not been finalized. Do not hand over or accept this certificate yet.",
  };
}

export default async function CertificateVerificationPage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = await params;
  let record: VerificationRecord | null = null;

  if (UUID_PATTERN.test(certificateId)) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.rpc(
        "verify_prepared_assessment_certificate",
        { target_certificate_id: certificateId },
      );
      if (!error) {
        record = (Array.isArray(data) ? data[0] : data) as VerificationRecord | null;
      }
    } catch {
      record = null;
    }
  }

  if (!record) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center px-5 py-12">
        <section className="w-full rounded-2xl border border-red-800 bg-neutral-950 p-6 text-center shadow-xl sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-300">Certificate verification</p>
          <h1 className="mt-4 text-3xl font-bold text-white">Certificate not found</h1>
          <p className="mt-3 text-neutral-300">This barcode does not match a Jingwuguan Seibukan certificate record.</p>
        </section>
      </main>
    );
  }

  const presentation = statusPresentation(record.certificate_status);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-5 py-12">
      <section className="w-full overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-950 shadow-2xl">
        <header className="border-b border-neutral-800 bg-neutral-900 px-6 py-6 text-center sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">Jingwuguan Seibukan</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Certificate verification</h1>
        </header>

        <div className="space-y-6 p-6 sm:p-10">
          <div role="status" className={`rounded-xl border p-4 text-center ${presentation.classes}`}>
            <p className="text-xl font-bold">{presentation.label}</p>
            <p className="mt-2 text-sm">{presentation.explanation}</p>
          </div>

          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-neutral-500">Name</dt><dd className="mt-1 text-lg font-semibold text-white">{record.member_name}</dd></div>
            <div><dt className="text-neutral-500">Promoted rank</dt><dd className="mt-1 text-lg font-semibold text-white">{record.promoted_rank}</dd></div>
            <div><dt className="text-neutral-500">Promotion date</dt><dd className="mt-1 font-medium text-neutral-200">{record.promotion_date}</dd></div>
            <div><dt className="text-neutral-500">Assessor</dt><dd className="mt-1 font-medium text-neutral-200">{record.assessor_name ?? "Not recorded"}</dd></div>
            <div><dt className="text-neutral-500">Class</dt><dd className="mt-1 font-medium text-neutral-200">{record.class_name}</dd></div>
            <div><dt className="text-neutral-500">Dojo</dt><dd className="mt-1 font-medium text-neutral-200">{record.dojo_name ?? "Not assigned"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-neutral-500">Certificate number</dt><dd className="mt-1 break-all font-mono text-neutral-200">{record.certificate_number}</dd></div>
          </dl>

          <p className="border-t border-neutral-800 pt-5 text-xs leading-5 text-neutral-500">
            This page verifies the current database record only. It does not provide a certificate download, member document library, or proof of identity.
          </p>
        </div>
      </section>
    </main>
  );
}
