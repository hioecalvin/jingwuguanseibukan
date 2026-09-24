"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";

import BulkGradeCertificatesPDF from "@/components/BulkGradeCertificatesPDF";
import type {
  CertificateAudit,
  CertificateRecord,
  GradeCertificateProps,
} from "@/components/GradeCertificatePDF";
import { createClient } from "@/lib/supabase/client";

type ScopeRow = {
  class_id: string;
  class_name: string;
  dojo_id: string | null;
  dojo_name: string | null;
};

type GradingAssessor = {
  member_id: string;
  full_name: string;
};

type Candidate = {
  membership_id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  class_id: string;
  class_name: string;
  dojo_id: string | null;
  dojo_name: string | null;
  rank_before_id: string | null;
  rank_before_name: string | null;
  sub_rank_before_id: string | null;
  sub_rank_before_name: string | null;
  rank_to_id: string;
  rank_to_name: string;
  sub_rank_to_id: string | null;
  sub_rank_to_name: string | null;
  is_rank_promotion: boolean;
  level_to: "mudansha" | "yudansha";
};

type CandidateDecision = {
  included: boolean;
  instructorName: string;
  outcome: "pass" | "fail";
  notes: string;
};

type SubmissionResult = {
  batch_id?: string;
  announcement_id?: string | null;
  idempotent?: boolean;
  candidate_count?: number;
  passed_count?: number;
  failed_count?: number;
  submitted_at?: string;
};

type PreparedAssessmentSummary = {
  prepared_assessment_id: string;
  class_id: string;
  class_name: string;
  dojo_id: string | null;
  dojo_name: string | null;
  assessment_date: string;
  status: "pending" | "submitted";
  candidate_count: number;
  certificate_count: number;
};

type PreparedCandidate = Candidate & {
  prepared_assessment_id: string;
  status: "pending" | "submitted";
  assessment_date: string;
  member_assessor_id: string | null;
  external_assessor_name: string | null;
  member_id: string | null;
  aikikai_registration_number: string | null;
  class_logo_url: string | null;
  certificate_id: string | null;
  certificate_number: string | null;
  certificate_status: "pending" | "issued" | "voided" | null;
  outcome: "pass" | "fail" | null;
  notes: string | null;
  instructor_name: string | null;
  prepared_at: string;
  prepared_by: string;
  prepared_by_name: string;
};

function todayInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function gradeLabel(rank: string | null, subRank: string | null) {
  return [rank, subRank].filter(Boolean).join(" · ") || "Not assigned";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function BulkAssessmentsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [scopeRows, setScopeRows] = useState<ScopeRow[]>([]);
  const [assessors, setAssessors] = useState<GradingAssessor[]>([]);
  const [classId, setClassId] = useState("");
  const [dojoId, setDojoId] = useState("");
  const [assessmentDate, setAssessmentDate] = useState(todayInputValue);
  const [assessorMemberId, setAssessorMemberId] = useState("");
  const [externalAssessorName, setExternalAssessorName] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [decisions, setDecisions] = useState<Record<string, CandidateDecision>>({});
  const [submissionKey, setSubmissionKey] = useState("");
  const [preparedAssessments, setPreparedAssessments] = useState<PreparedAssessmentSummary[]>([]);
  const [selectedPreparedAssessmentId, setSelectedPreparedAssessmentId] = useState("");
  const [preparedAssessmentId, setPreparedAssessmentId] = useState("");
  const [preparedRows, setPreparedRows] = useState<PreparedCandidate[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingCertificates, setGeneratingCertificates] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    setError(null);
    const [scopeResponse, assessorResponse, preparedResponse] = await Promise.all([
      supabase
        .from("admin_visible_members")
        .select("class_id,class_name,dojo_id,dojo_name")
        .order("class_name"),
      supabase.rpc("get_active_grading_assessors"),
      supabase.rpc("get_prepared_bulk_assessments"),
    ]);

    if (scopeResponse.error || assessorResponse.error || preparedResponse.error) {
      console.error("Assessment catalog load failed", {
        scope: scopeResponse.error,
        assessors: assessorResponse.error,
        preparedAssessments: preparedResponse.error,
      });
      setError("Unable to load your assessment scope. Please retry.");
      setLoadingCatalog(false);
      return;
    }

    const scopes = (scopeResponse.data ?? []) as ScopeRow[];
    setScopeRows(scopes);
    setAssessors((assessorResponse.data ?? []) as GradingAssessor[]);
    setPreparedAssessments(
      (preparedResponse.data ?? []) as PreparedAssessmentSummary[],
    );
    setClassId((current) => {
      if (current) return current;
      return scopes[0]?.class_id ?? "";
    });
    setLoadingCatalog(false);
  }, [supabase]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const classes = useMemo(() => {
    const unique = new Map<string, string>();
    for (const row of scopeRows) unique.set(row.class_id, row.class_name);
    return [...unique.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [scopeRows]);

  const dojos = useMemo(() => {
    const unique = new Map<string, string>();
    for (const row of scopeRows) {
      if (row.class_id === classId && row.dojo_id && row.dojo_name) {
        unique.set(row.dojo_id, row.dojo_name);
      }
    }
    return [...unique.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classId, scopeRows]);

  const includedCandidates = candidates.filter(
    (candidate) => decisions[candidate.membership_id]?.included,
  );
  const passedCount = includedCandidates.filter(
    (candidate) => decisions[candidate.membership_id]?.outcome === "pass",
  ).length;
  const failedCount = includedCandidates.length - passedCount;
  const requiresMemberAssessor = includedCandidates.some(
    (candidate) => candidate.level_to === "mudansha",
  );
  const requiresExternalAssessor = includedCandidates.some(
    (candidate) => candidate.level_to === "yudansha",
  );
  const preparedCertificateCandidates = preparedRows.filter(
    (candidate) =>
      candidate.certificate_id &&
      candidate.certificate_number &&
      candidate.certificate_status !== "voided",
  );
  const preparedStatus = preparedRows[0]?.status ?? null;
  const isPreparedPending = preparedStatus === "pending";

  function resetSubmissionState() {
    setReviewing(false);
    setConfirmed(false);
    setResult(null);
    setSuccess(null);
  }

  function clearPreparedAssessment() {
    setPreparedAssessmentId("");
    setPreparedRows([]);
    resetSubmissionState();
  }

  function updateDecision(
    membershipId: string,
    update: Partial<CandidateDecision>,
  ) {
    setDecisions((current) => ({
      ...current,
      [membershipId]: {
        ...current[membershipId],
        ...update,
      },
    }));
    resetSubmissionState();
  }

  async function loadRoster() {
    if (!classId || !assessmentDate) {
      setError("Select a class and assessment date first.");
      return;
    }

    setLoadingRoster(true);
    setError(null);
    resetSubmissionState();
    const { data, error: rosterError } = await supabase.rpc(
      "get_bulk_assessment_candidates",
      {
        target_class_id: classId,
        target_dojo_id: dojoId || null,
      },
    );
    setLoadingRoster(false);

    if (rosterError) {
      console.error("Assessment roster load failed", rosterError);
      setCandidates([]);
      setDecisions({});
      setError("Unable to load eligible candidates for this scope.");
      return;
    }

    const rows = (data ?? []) as Candidate[];
    const nextDecisions: Record<string, CandidateDecision> = {};
    for (const candidate of rows) {
      nextDecisions[candidate.membership_id] = {
        included: false,
        instructorName: "",
        outcome: "pass",
        notes: "",
      };
    }
    setCandidates(rows);
    setDecisions(nextDecisions);
    setSubmissionKey(crypto.randomUUID());
    clearPreparedAssessment();
    if (rows.length === 0) {
      setError("No active members with a configured next grade were found.");
    }
  }

  async function loadPreparedAssessment(
    targetId: string,
    preserveSubmissionState = false,
  ) {
    setLoadingRoster(true);
    setError(null);
    const { data, error: preparedError } = await supabase.rpc(
      "get_prepared_bulk_assessment",
      { target_prepared_assessment_id: targetId },
    );
    setLoadingRoster(false);
    if (preparedError) {
      console.error("Prepared assessment load failed", preparedError);
      setError("Unable to open the prepared assessment.");
      return;
    }
    const rows = (data ?? []) as PreparedCandidate[];
    if (rows.length === 0) {
      setError("The prepared assessment has no candidates.");
      return;
    }
    const first = rows[0];
    const nextDecisions: Record<string, CandidateDecision> = {};
    for (const row of rows) {
      nextDecisions[row.membership_id] = {
        included: true,
        instructorName: row.instructor_name ?? "",
        outcome: row.outcome ?? "pass",
        notes: row.notes ?? "",
      };
    }
    setPreparedAssessmentId(targetId);
    setPreparedRows(rows);
    setCandidates(rows);
    setDecisions(nextDecisions);
    setClassId(first.class_id);
    setDojoId(first.dojo_id ?? "");
    setAssessmentDate(first.assessment_date);
    setAssessorMemberId(first.member_assessor_id ?? "");
    setExternalAssessorName(first.external_assessor_name ?? "");
    setSubmissionKey(crypto.randomUUID());
    if (!preserveSubmissionState) {
      setResult(null);
      setReviewing(false);
      setConfirmed(false);
      setSuccess(
        `Prepared assessment opened with ${rows.length} candidates and ${rows.filter((row) => row.certificate_id).length} certificates.`,
      );
    }
  }

  async function prepareAssessment() {
    if (preparing || preparedAssessmentId || !validateForReview()) return;
    setPreparing(true);
    setError(null);
    setSuccess(null);
    const selectedCandidates = includedCandidates.map((candidate) => ({
      membership_id: candidate.membership_id,
      expected_rank_to_id: candidate.rank_to_id,
      expected_sub_rank_to_id: candidate.sub_rank_to_id,
    }));
    const { data, error: prepareError } = await supabase.rpc(
      "prepare_bulk_assessment",
      {
        preparation_key: submissionKey,
        target_class_id: classId,
        assessment_date: assessmentDate,
        assessor_member_id: assessorMemberId || null,
        external_assessor_name: externalAssessorName.trim() || null,
        target_dojo_id: dojoId || null,
        selected_candidates: selectedCandidates,
      },
    );
    setPreparing(false);
    if (prepareError) {
      console.error("Assessment preparation failed", prepareError);
      setError("The roster and pending certificates were not prepared. Review the selections and retry.");
      return;
    }
    const response = (data ?? {}) as { prepared_assessment_id?: string };
    if (!response.prepared_assessment_id) {
      setError("The preparation completed without a usable assessment reference.");
      return;
    }
    await loadPreparedAssessment(response.prepared_assessment_id);
    await loadCatalog();
  }

  function validateForReview() {
    setError(null);
    if (includedCandidates.length === 0) {
      setError("Include at least one candidate before reviewing.");
      return false;
    }
    if (requiresMemberAssessor && !assessorMemberId) {
      setError("Select an internal Member assessor for Mudansha candidates.");
      return false;
    }
    if (requiresExternalAssessor && !externalAssessorName.trim()) {
      setError("Enter the external assessor for Yudansha candidates.");
      return false;
    }
    if (!submissionKey) {
      setError("Reload the candidate roster before reviewing.");
      return false;
    }
    return true;
  }

  function openReview() {
    if (!validateForReview()) return;
    setConfirmed(false);
    setReviewing(true);
    requestAnimationFrame(() => {
      document.getElementById("assessment-review")?.focus();
    });
  }

  async function submitAssessment() {
    if (submitting || result || !confirmed || !validateForReview()) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!preparedAssessmentId) {
      setError("Prepare and print the pending certificates before submitting results.");
      return;
    }
    const payload = includedCandidates.map((candidate) => {
      const decision = decisions[candidate.membership_id];
      return {
        membership_id: candidate.membership_id,
        outcome: decision.outcome,
        instructor_name: decision.instructorName.trim() || null,
        notes: decision.notes.trim() || null,
      };
    });

    const { data, error: submitError } = await supabase.rpc(
      "finalize_prepared_bulk_assessment",
      {
        target_prepared_assessment_id: preparedAssessmentId,
        submission_key: submissionKey,
        decisions: payload,
      },
    );
    setSubmitting(false);

    if (submitError) {
      console.error("Bulk assessment submission failed", submitError);
      setError(
        "The assessment was not confirmed. Review the current grades and retry with the same submission.",
      );
      return;
    }

    const response = (data ?? {}) as SubmissionResult;
    await loadPreparedAssessment(preparedAssessmentId, true);
    await loadCatalog();
    setResult(response);
    setReviewing(false);
    setSuccess(
      `${response.candidate_count ?? includedCandidates.length} results recorded together: ${response.passed_count ?? passedCount} passed and ${response.failed_count ?? failedCount} failed. Passing certificates are issued; failed certificates are voided.`,
    );
  }

  async function downloadBulkCertificates() {
    if (!preparedAssessmentId || preparedCertificateCandidates.length === 0 || generatingCertificates) {
      return;
    }

    setGeneratingCertificates(true);
    setError(null);

    try {
      const certificates: GradeCertificateProps[] = [];

      for (const candidate of preparedCertificateCandidates) {
        if (!candidate.certificate_id || !candidate.certificate_number) continue;
        const promotion: CertificateRecord = {
          promotion_history_id: candidate.certificate_id,
          membership_id: candidate.membership_id,
          user_id: candidate.user_id,
          member_id: candidate.member_id,
          aikikai_registration_number: candidate.aikikai_registration_number,
          full_name: candidate.full_name,
          class_id: candidate.class_id,
          class_name: candidate.class_name,
          class_logo_url: candidate.class_logo_url,
          dojo_name: candidate.dojo_name,
          rank_id: candidate.rank_to_id,
          rank_name: gradeLabel(candidate.rank_to_name, candidate.sub_rank_to_name),
          effective_date: candidate.assessment_date,
          promoted_by: null,
          promoted_by_name: null,
          assessor_type: candidate.level_to === "yudansha" ? "external" : "member",
          assessor_member_id: candidate.level_to === "mudansha" ? candidate.member_assessor_id : null,
          assessor_name: candidate.level_to === "yudansha"
            ? candidate.external_assessor_name
            : assessors.find((item) => item.member_id === candidate.member_assessor_id)?.full_name ?? null,
        };
        const audit: CertificateAudit = {
          certificate_id: candidate.certificate_id,
          certificate_number: candidate.certificate_number,
          generated_at: candidate.prepared_at,
          generated_by: candidate.prepared_by,
          generated_by_name: candidate.prepared_by_name,
          generated_by_role: "Super Admin",
          print_type: "original",
        };
        const verificationUrl =
          `${window.location.origin}/certificate/verify/${candidate.certificate_id}`;
        const barcodePayload = [
          "JSGCERT",
          "v=1",
          `id=${candidate.certificate_id}`,
          `name=${encodeURIComponent(candidate.full_name)}`,
          `rank=${encodeURIComponent(promotion.rank_name)}`,
          `date=${candidate.assessment_date}`,
          `assessor=${encodeURIComponent(promotion.assessor_name ?? "Not recorded")}`,
          `verify=${verificationUrl}`,
        ].join("|");
        const verificationBarcodeUrl = await QRCode.toDataURL(barcodePayload, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 240,
        });

        certificates.push({
          record: promotion,
          audit,
          organisationLogoUrl: `${window.location.origin}/js-logo.jpeg`,
          categoryLogoUrl: promotion.class_logo_url
            ? promotion.class_logo_url.startsWith("http")
              ? promotion.class_logo_url
              : `${window.location.origin}${promotion.class_logo_url}`
            : null,
          verificationBarcodeUrl,
        });
      }

      const blob = await pdf(
        <BulkGradeCertificatesPDF certificates={certificates} />,
      ).toBlob();
      const { error: printError } = await supabase.rpc(
        "record_prepared_assessment_certificate_print",
        { target_prepared_assessment_id: preparedAssessmentId },
      );
      if (printError) throw printError;
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `pending-grading-certificates-${assessmentDate}-${preparedAssessmentId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
      setSuccess(
        `${certificates.length} prepared certificate${certificates.length === 1 ? "" : "s"} downloaded in one PDF. They remain pending until all results are submitted.`,
      );
    } catch (certificateError) {
      console.error("Bulk certificate generation failed", certificateError);
      setError(
        "The pending certificate PDF was not completed. No assessment result was submitted; retry the print action.",
      );
    } finally {
      setGeneratingCertificates(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-12">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">
            Grading administration
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Bulk Assessments
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
            Prepare the complete roster and pending certificates before assessment
            day, then record every Pass or Fail and submit all results together.
          </p>
        </div>
        <Link
          href="/admin"
          className="self-start rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-900"
        >
          ← Admin
        </Link>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-200">
          <p>{success}</p>
          {result?.announcement_id && (
            <p className="mt-1 text-emerald-300">
              A class grading-results announcement was published.
            </p>
          )}
        </div>
      )}

      {preparedAssessments.some((item) => item.status === "pending") && !preparedAssessmentId && (
        <section className="rounded-2xl border border-violet-800 bg-violet-950/20 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Open a prepared assessment</h2>
          <p className="mt-1 text-sm text-neutral-300">
            Resume the saved roster on assessment day. Every candidate must receive one result.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedPreparedAssessmentId}
              onChange={(event) => setSelectedPreparedAssessmentId(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white"
            >
              <option value="">Select pending assessment</option>
              {preparedAssessments.filter((item) => item.status === "pending").map((item) => (
                <option key={item.prepared_assessment_id} value={item.prepared_assessment_id}>
                  {item.assessment_date} · {item.class_name}{item.dojo_name ? ` · ${item.dojo_name}` : ""} · {item.candidate_count} candidates
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selectedPreparedAssessmentId || loadingRoster}
              onClick={() => void loadPreparedAssessment(selectedPreparedAssessmentId)}
              className="rounded-lg bg-violet-500 px-5 py-2.5 font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Open roster
            </button>
          </div>
        </section>
      )}

      <section aria-labelledby="assessment-scope-heading" className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 sm:p-6">
        <h2 id="assessment-scope-heading" className="text-lg font-semibold text-white">
          1. Assessment scope
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm text-neutral-300">
            <span className="mb-2 block font-medium">Class</span>
            <select
              value={classId}
              disabled={loadingCatalog || submitting || Boolean(preparedAssessmentId)}
              onChange={(event) => {
                setClassId(event.target.value);
                setDojoId("");
                setCandidates([]);
                setDecisions({});
                clearPreparedAssessment();
              }}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white"
            >
              <option value="">Select class</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-neutral-300">
            <span className="mb-2 block font-medium">Dojo (optional)</span>
            <select
              value={dojoId}
              disabled={!classId || submitting || Boolean(preparedAssessmentId)}
              onChange={(event) => {
                setDojoId(event.target.value);
                setCandidates([]);
                setDecisions({});
                clearPreparedAssessment();
              }}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white"
            >
              <option value="">All dojos</option>
              {dojos.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-neutral-300">
            <span className="mb-2 block font-medium">Assessment date</span>
            <input
              type="date"
              value={assessmentDate}
              min={preparedAssessmentId ? undefined : todayInputValue()}
              disabled={submitting || Boolean(preparedAssessmentId)}
              onChange={(event) => {
                setAssessmentDate(event.target.value);
                clearPreparedAssessment();
              }}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              disabled={!classId || !assessmentDate || loadingRoster || submitting || Boolean(preparedAssessmentId)}
              onClick={() => void loadRoster()}
              className="w-full rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-neutral-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingRoster ? "Loading roster…" : "Load eligible roster"}
            </button>
          </div>
        </div>
        {loadingCatalog && <p className="mt-4 text-sm text-neutral-400">Loading your Admin scope…</p>}
      </section>

      <section aria-labelledby="assessment-assessor-heading" className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 sm:p-6">
        <h2 id="assessment-assessor-heading" className="text-lg font-semibold text-white">
          2. Assessors
        </h2>
        <p className="mt-1 text-sm text-neutral-400">
          Mudansha rows use the internal Member assessor. Yudansha rows use the external assessor.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="text-sm text-neutral-300">
            <span className="mb-2 block font-medium">Internal Member assessor</span>
            <select
              value={assessorMemberId}
              disabled={submitting || Boolean(preparedAssessmentId)}
              onChange={(event) => {
                setAssessorMemberId(event.target.value);
                clearPreparedAssessment();
              }}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white"
            >
              <option value="">Select active grading assessor</option>
              {assessors.map((assessor) => (
                <option key={assessor.member_id} value={assessor.member_id}>{assessor.full_name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-neutral-300">
            <span className="mb-2 block font-medium">External assessor</span>
            <input
              type="text"
              value={externalAssessorName}
              maxLength={200}
              disabled={submitting || Boolean(preparedAssessmentId)}
              onChange={(event) => {
                setExternalAssessorName(event.target.value);
                clearPreparedAssessment();
              }}
              placeholder="Full name for Yudansha grading"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white placeholder:text-neutral-600"
            />
          </label>
        </div>
      </section>

      <section aria-labelledby="assessment-roster-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="assessment-roster-heading" className="text-lg font-semibold text-white">
              3. Candidate roster
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              Included {includedCandidates.length} of {candidates.length} eligible candidates.
            </p>
          </div>
          {candidates.length > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting || Boolean(preparedAssessmentId)}
                onClick={() => {
                  for (const candidate of candidates) updateDecision(candidate.membership_id, { included: true });
                }}
                className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-900"
              >
                Include all
              </button>
              <button
                type="button"
                disabled={submitting || Boolean(preparedAssessmentId)}
                onClick={() => {
                  for (const candidate of candidates) updateDecision(candidate.membership_id, { included: false });
                }}
                className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-900"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {candidates.map((candidate) => {
          const decision = decisions[candidate.membership_id];
          if (!decision) return null;
          const controlPrefix = `candidate-${candidate.membership_id}`;
          return (
            <article key={candidate.membership_id} className={`rounded-2xl border p-4 sm:p-5 ${decision.included ? "border-amber-700 bg-amber-950/10" : "border-neutral-800 bg-neutral-900/50"}`}>
              <div className="grid gap-5 xl:grid-cols-[minmax(15rem,1.2fr)_minmax(12rem,1fr)_minmax(14rem,1.2fr)]">
                <div className="flex items-start gap-3">
                  {candidate.avatar_url ? (
                    <img src={candidate.avatar_url} alt="" className="h-12 w-12 rounded-full border border-neutral-700 object-cover" />
                  ) : (
                    <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-sm font-bold text-neutral-300">
                      {initials(candidate.full_name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <label className="flex min-h-11 items-center gap-3 font-semibold text-white">
                      <input
                        type="checkbox"
                        checked={decision.included}
                        disabled={submitting || Boolean(preparedAssessmentId)}
                        onChange={(event) => updateDecision(candidate.membership_id, { included: event.target.checked })}
                        className="h-5 w-5 rounded border-neutral-600 bg-neutral-950 text-amber-500"
                      />
                      <span>Include {candidate.full_name}</span>
                    </label>
                    <p className="mt-1 text-sm text-neutral-400">Home dojo: {candidate.dojo_name ?? "Not assigned"}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-neutral-500">{candidate.level_to}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3 text-sm">
                  <p className="text-neutral-500">Current grade</p>
                  <p className="mt-1 font-medium text-neutral-200">{gradeLabel(candidate.rank_before_name, candidate.sub_rank_before_name)}</p>
                  <p className="mt-3 text-neutral-500">Target grade</p>
                    <p className="mt-1 font-semibold text-amber-300">{gradeLabel(candidate.rank_to_name, candidate.sub_rank_to_name)}</p>
                    {candidate.is_rank_promotion && (
                      <span className="mt-2 inline-flex rounded-full border border-violet-800 px-2 py-1 text-xs font-medium text-violet-200">
                        Certificate eligible if passed
                      </span>
                    )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <label htmlFor={`${controlPrefix}-outcome`} className="text-sm text-neutral-300">
                    <span className="mb-1 block font-medium">Result</span>
                    <select
                      id={`${controlPrefix}-outcome`}
                      value={decision.outcome}
                      disabled={!decision.included || submitting || !isPreparedPending}
                      onChange={(event) => updateDecision(candidate.membership_id, { outcome: event.target.value as "pass" | "fail" })}
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white disabled:opacity-50"
                    >
                      <option value="pass">Pass</option>
                      <option value="fail">Fail</option>
                    </select>
                  </label>
                  <label htmlFor={`${controlPrefix}-instructor`} className="text-sm text-neutral-300">
                    <span className="mb-1 block font-medium">Home instructor</span>
                    <input
                      id={`${controlPrefix}-instructor`}
                      type="text"
                      value={decision.instructorName}
                      maxLength={200}
                      disabled={!decision.included || submitting || !isPreparedPending}
                      onChange={(event) => updateDecision(candidate.membership_id, { instructorName: event.target.value })}
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white disabled:opacity-50"
                    />
                  </label>
                  <label htmlFor={`${controlPrefix}-notes`} className="text-sm text-neutral-300 sm:col-span-2 xl:col-span-1 2xl:col-span-2">
                    <span className="mb-1 block font-medium">Notes</span>
                    <textarea
                      id={`${controlPrefix}-notes`}
                      value={decision.notes}
                      maxLength={2000}
                      rows={2}
                      disabled={!decision.included || submitting || !isPreparedPending}
                      onChange={(event) => updateDecision(candidate.membership_id, { notes: event.target.value })}
                      className="w-full resize-y rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white disabled:opacity-50"
                    />
                  </label>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {candidates.length > 0 && (
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {preparedAssessmentId ? "Review and submit all results" : "Prepare roster and certificates"}
              </h2>
              <p className="mt-1 text-sm text-neutral-400">
                {preparedAssessmentId
                  ? `${includedCandidates.length} fixed candidates · ${passedCount} Pass · ${failedCount} Fail`
                  : `${includedCandidates.length} selected for the saved assessment roster`}
              </p>
            </div>
            {preparedAssessmentId ? (
              <button
                type="button"
                disabled={!isPreparedPending || includedCandidates.length === 0 || submitting || Boolean(result)}
                onClick={openReview}
                className="rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-neutral-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Review all results
              </button>
            ) : (
              <button
                type="button"
                disabled={includedCandidates.length === 0 || preparing || submitting}
                onClick={() => void prepareAssessment()}
                className="rounded-lg bg-violet-500 px-5 py-2.5 font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {preparing ? "Preparing…" : "Prepare roster and pending certificates"}
              </button>
            )}
          </div>
        </section>
      )}

      {reviewing && (
        <section
          id="assessment-review"
          tabIndex={-1}
          aria-labelledby="assessment-review-heading"
          className="rounded-2xl border-2 border-amber-600 bg-neutral-900 p-4 outline-none sm:p-6"
        >
          <h2 id="assessment-review-heading" className="text-xl font-bold text-white">Confirm assessment submission</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-300">
            This atomic submission records every prepared candidate together. Passing
            candidates are promoted and their certificates become issued; failed
            candidates remain unchanged and their prepared certificates become void.
          </p>
          <dl className="mt-5 grid gap-3 rounded-xl bg-neutral-950/70 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-neutral-500">Date</dt><dd className="mt-1 font-medium text-white">{assessmentDate}</dd></div>
            <div><dt className="text-neutral-500">Included</dt><dd className="mt-1 font-medium text-white">{includedCandidates.length}</dd></div>
            <div><dt className="text-neutral-500">Pass</dt><dd className="mt-1 font-medium text-emerald-300">{passedCount}</dd></div>
            <div><dt className="text-neutral-500">Fail</dt><dd className="mt-1 font-medium text-red-300">{failedCount}</dd></div>
          </dl>
          <label className="mt-5 flex items-start gap-3 rounded-xl border border-neutral-700 p-4 text-sm text-neutral-200">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-neutral-600 bg-neutral-950 text-amber-500"
            />
            <span>I confirm the scope, assessors, target grades, Pass/Fail results, and notes shown above.</span>
          </label>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setReviewing(false)}
              className="rounded-lg border border-neutral-700 px-5 py-2.5 font-medium text-neutral-200 hover:bg-neutral-800"
            >
              Back to editing
            </button>
            <button
              type="button"
              disabled={!confirmed || submitting || Boolean(result)}
              onClick={() => void submitAssessment()}
              className="rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold text-neutral-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting once…" : "Confirm and submit once"}
            </button>
          </div>
        </section>
      )}

      {preparedAssessmentId && preparedCertificateCandidates.length > 0 && (
        <section className="rounded-2xl border border-violet-800 bg-violet-950/20 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Prepared certificates</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-300">
            Download and print one multi-page PDF before assessment day for the {preparedCertificateCandidates.length} certificate-eligible candidate{preparedCertificateCandidates.length === 1 ? "" : "s"}.
            The database status remains Pending. Final submission issues Pass certificates and voids Fail certificates.
          </p>
          <p className="mt-2 text-sm font-medium text-violet-200">
            Current status: {preparedStatus === "pending" ? "Pending assessment" : "Results submitted"}
          </p>
          <button
            type="button"
            disabled={generatingCertificates || preparedCertificateCandidates.every((item) => item.certificate_status === "voided")}
            onClick={() => void downloadBulkCertificates()}
            className="mt-4 rounded-lg bg-violet-500 px-5 py-2.5 font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generatingCertificates
              ? "Preparing certificate PDF…"
              : "Download all prepared certificates"}
          </button>
        </section>
      )}
    </div>
  );
}
