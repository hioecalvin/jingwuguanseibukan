type RpcResult = { data: unknown; error: Error | null };

const scope = {
  class_id: 'fixture-class',
  class_name: 'Fixture Aikido',
  dojo_id: 'fixture-dojo',
  dojo_name: 'Fixture Dojo',
};

const assessor = {
  member_id: 'fixture-assessor',
  full_name: 'Sensei Fixture',
};

const candidates = [
  {
    membership_id: 'membership-high', user_id: 'user-high', full_name: 'Akira Senior', avatar_url: null,
    ...scope, rank_before_id: 'rank-1kyu', rank_before_name: '1st Kyu', sub_rank_before_id: null,
    sub_rank_before_name: null, rank_to_id: 'rank-shodan', rank_to_name: 'Shodan', sub_rank_to_id: null,
    sub_rank_to_name: null, is_rank_promotion: true, level_to: 'yudansha',
  },
  {
    membership_id: 'membership-middle', user_id: 'user-middle', full_name: 'Budi Middle', avatar_url: null,
    ...scope, rank_before_id: 'rank-3kyu', rank_before_name: '3rd Kyu', sub_rank_before_id: null,
    sub_rank_before_name: null, rank_to_id: 'rank-2kyu', rank_to_name: '2nd Kyu', sub_rank_to_id: null,
    sub_rank_to_name: null, is_rank_promotion: true, level_to: 'mudansha',
  },
  {
    membership_id: 'membership-low', user_id: 'user-low', full_name: 'Citra Junior', avatar_url: null,
    ...scope, rank_before_id: 'rank-5kyu', rank_before_name: '5th Kyu', sub_rank_before_id: null,
    sub_rank_before_name: null, rank_to_id: 'rank-4kyu', rank_to_name: '4th Kyu', sub_rank_to_id: null,
    sub_rank_to_name: null, is_rank_promotion: true, level_to: 'mudansha',
  },
] as const;

let preparedRows: Array<Record<string, unknown>> = [];
let preparedSummary: Array<Record<string, unknown>> = [];
let submission: Record<string, unknown> | null = null;

function snapshot() {
  return {
    preparedRows: preparedRows.map(row => ({ ...row })),
    submission: submission ? { ...submission } : null,
  };
}

Object.defineProperty(window, '__assessmentFixture', { get: snapshot });

function wait() {
  return new Promise(resolve => setTimeout(resolve, 20));
}

export function createClient() {
  return {
    from: (name: string) => ({
      select: () => ({
        order: async (): Promise<RpcResult> => {
          await wait();
          if (name !== 'admin_visible_members') {
            return { data: null, error: new Error(`Unexpected fixture table: ${name}`) };
          }
          return { data: [scope], error: null };
        },
      }),
    }),
    rpc: async (name: string, args: Record<string, unknown> = {}): Promise<RpcResult> => {
      await wait();
      if (name === 'get_active_grading_assessors') return { data: [assessor], error: null };
      if (name === 'get_prepared_bulk_assessments') return { data: preparedSummary.map(row => ({ ...row })), error: null };
      if (name === 'get_bulk_assessment_candidates') {
        if (args.target_class_id !== scope.class_id || args.target_dojo_id !== scope.dojo_id) {
          return { data: null, error: new Error('Assessment scope is outside the fixture Admin assignment.') };
        }
        return { data: candidates.map(row => ({ ...row })), error: null };
      }
      if (name === 'prepare_bulk_assessment') {
        const selected = Array.isArray(args.selected_candidates) ? args.selected_candidates as Array<Record<string, unknown>> : [];
        if (selected.length !== candidates.length || args.assessor_member_id !== assessor.member_id || args.external_assessor_name !== 'External Shihan') {
          return { data: null, error: new Error('The complete roster and both required assessors must be prepared together.') };
        }
        const assessmentDate = String(args.assessment_date);
        preparedRows = candidates.map((candidate, index) => ({
          ...candidate,
          prepared_assessment_id: 'prepared-fixture', status: 'pending', assessment_date: assessmentDate,
          member_assessor_id: assessor.member_id, external_assessor_name: 'External Shihan',
          member_id: `JS-${100 + index}`, aikikai_registration_number: null, class_logo_url: '/fixture-class-logo.png',
          certificate_id: `certificate-${index + 1}`, certificate_number: `JSG-${index + 1}`,
          certificate_status: 'pending', outcome: null, notes: null, instructor_name: null,
          prepared_at: '2026-09-27T00:00:00.000Z', prepared_by: 'fixture-super-admin',
          prepared_by_name: 'Fixture Super Admin',
        }));
        preparedSummary = [{
          prepared_assessment_id: 'prepared-fixture', ...scope, assessment_date: assessmentDate,
          status: 'pending', candidate_count: candidates.length, certificate_count: candidates.length,
        }];
        return { data: { prepared_assessment_id: 'prepared-fixture' }, error: null };
      }
      if (name === 'get_prepared_bulk_assessment') {
        if (args.target_prepared_assessment_id !== 'prepared-fixture') {
          return { data: null, error: new Error('Unknown prepared assessment.') };
        }
        return { data: preparedRows.map(row => ({ ...row })), error: null };
      }
      if (name === 'finalize_prepared_bulk_assessment') {
        const decisions = Array.isArray(args.decisions) ? args.decisions as Array<Record<string, unknown>> : [];
        const uniqueMemberships = new Set(decisions.map(row => row.membership_id));
        if (decisions.length !== candidates.length || uniqueMemberships.size !== candidates.length) {
          return { data: null, error: new Error('Every prepared candidate must be submitted exactly once.') };
        }
        const decisionMap = new Map(decisions.map(row => [row.membership_id, row]));
        preparedRows = preparedRows.map(row => {
          const decision = decisionMap.get(row.membership_id);
          const passed = decision?.outcome === 'pass';
          return {
            ...row,
            status: 'submitted', outcome: decision?.outcome, notes: decision?.notes,
            instructor_name: decision?.instructor_name,
            certificate_status: passed ? 'issued' : 'voided',
          };
        });
        preparedSummary = preparedSummary.map(row => ({ ...row, status: 'submitted' }));
        const passingNames = ['Akira Senior', 'Budi Middle'];
        submission = {
          decisions: decisions.map(row => ({ ...row })),
          promotedMemberships: ['membership-high', 'membership-middle'],
          unchangedMemberships: ['membership-low'],
          announcementClassId: scope.class_id,
          announcementDojoId: scope.dojo_id,
          announcementOrder: passingNames,
        };
        return {
          data: {
            batch_id: 'batch-fixture', announcement_id: 'announcement-fixture', idempotent: false,
            candidate_count: 3, passed_count: 2, failed_count: 1,
            submitted_at: '2026-09-27T01:00:00.000Z',
          },
          error: null,
        };
      }
      if (name === 'record_prepared_assessment_certificate_print') return { data: null, error: null };
      return { data: null, error: new Error(`Unexpected fixture RPC: ${name}`) };
    },
  };
}
