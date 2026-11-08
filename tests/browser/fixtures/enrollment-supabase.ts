type EnrollmentRequest = {
  request_id: string;
  class_id: string;
  class_name: string;
  dojo_id: string | null;
  dojo_name: string | null;
  request_status: "pending" | "approved" | "rejected" | "cancelled";
  member_note: string | null;
  requested_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  membership_id: string | null;
};

const available = [{
  class_id: "fixture-kung-fu",
  class_name: "Fixture Kung Fu",
  dojo_id: "fixture-dojo",
  dojo_name: "Fixture Central Dojo",
}];

let requests: EnrollmentRequest[] = [{
  request_id: "rejected-request",
  class_id: "fixture-kung-fu",
  class_name: "Fixture Kung Fu",
  dojo_id: "fixture-dojo",
  dojo_name: "Fixture Central Dojo",
  request_status: "rejected",
  member_note: "Original request",
  requested_at: "2026-09-01T00:00:00.000Z",
  reviewed_at: "2026-09-02T00:00:00.000Z",
  rejection_reason: "Please confirm your dojo before applying again.",
  membership_id: null,
}];

export function createClient() {
  return {
    rpc: async (name: string, args?: Record<string, string | null>) => {
      await new Promise(resolve => setTimeout(resolve, 25));

      if (name === "get_my_available_class_enrollments") {
        return { data: available, error: null };
      }

      if (name === "get_my_class_enrollment_requests") {
        return { data: requests.map(request => ({ ...request })), error: null };
      }

      if (name === "request_class_enrollment") {
        requests = [{
          request_id: "resubmitted-request",
          class_id: args?.target_class_id ?? "fixture-kung-fu",
          class_name: "Fixture Kung Fu",
          dojo_id: args?.target_dojo_id ?? null,
          dojo_name: args?.target_dojo_id ? "Fixture Central Dojo" : null,
          request_status: "pending",
          member_note: args?.request_note ?? null,
          requested_at: "2026-09-16T00:00:00.000Z",
          reviewed_at: null,
          rejection_reason: null,
          membership_id: null,
        }, ...requests];
        return { data: null, error: null };
      }

      if (name === "cancel_class_enrollment_request") {
        requests = requests.map(request => request.request_id === args?.target_request_id
          ? { ...request, request_status: "cancelled" }
          : request);
        return { data: null, error: null };
      }

      return { data: null, error: new Error(`Unexpected fixture RPC: ${name}`) };
    },
  };
}
