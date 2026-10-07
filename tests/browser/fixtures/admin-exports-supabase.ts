const user = { id: '00000000-0000-4000-8000-000000000001' };

const certificates = [
  {
    certificate_id: 'certificate-1',
    certificate_number: 'JS-AIK-2026-0001',
    membership_id: 'membership-1',
    member_id: 'JS0001',
    aikikai_registration_number: 'A12345',
    member_name: 'Fixture Member',
    class_name: 'Aikido',
    dojo_name: 'Brisbane Fixture Dojo',
    rank_name: '1st Kyu',
    promotion_date: '2026-09-01',
    assessor_type: 'external',
    assessor_member_id: null,
    assessor_name: 'Fixture Assessor',
    certificate_created_at: '2026-09-01T02:00:00Z',
    certificate_created_by_name: 'Fixture Administrator',
    latest_print_at: '2026-09-01T03:00:00Z',
    latest_print_by_name: 'Fixture Administrator',
    print_count: 1,
    certificate_status: 'valid',
    revoked_at: null,
    revoke_reason: null,
    revoked_by_name: null,
  },
];

const reports = [
  {
    audit_id: 'report-1',
    document_reference: 'JS-REPORT-2026-0001',
    report_type: 'official_member_record',
    generated_at: '2026-09-02T02:00:00Z',
    generated_by: user.id,
    generated_by_name: 'Fixture Administrator',
    generated_by_role: 'super_admin',
    membership_id: 'membership-1',
    member_id: 'JS0001',
    member_name: 'Fixture Member',
    class_name: 'Aikido',
    dojo_name: 'Brisbane Fixture Dojo',
    membership_status: 'active',
  },
];

const archive = [
  {
    archive_id: 'archive-1',
    document_group: 'certificates',
    document_type: 'grade_certificate',
    document_reference: 'JS-AIK-2026-0001',
    membership_id: 'membership-1',
    user_id: user.id,
    member_id: 'JS0001',
    aikikai_registration_number: 'A12345',
    member_name: 'Fixture Member',
    class_id: 'class-1',
    class_name: 'Aikido',
    dojo_id: 'dojo-1',
    dojo_name: 'Brisbane Fixture Dojo',
    document_subject: '1st Kyu',
    effective_date: '2026-09-01',
    generated_by: user.id,
    generated_by_name: 'Fixture Administrator',
    generated_at: '2026-09-01T02:00:00Z',
    document_status: 'valid',
    print_count: 1,
    last_printed_at: '2026-09-01T03:00:00Z',
    revoked_at: null,
    revoked_by: null,
    revoked_by_name: null,
    revoke_reason: null,
    metadata: { fixture: true },
  },
];

export function createClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
    },
    rpc: async (name: string) => {
      if (name === 'get_certificate_history') return { data: certificates, error: null };
      if (name === 'get_certificate_print_log') return { data: [], error: null };
      if (name === 'get_member_report_history') return { data: reports, error: null };
      if (name === 'search_document_archive') return { data: archive, error: null };
      return { data: null, error: new Error(`Unexpected fixture RPC: ${name}`) };
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => table === 'profiles'
            ? { data: { id: user.id, full_name: 'Fixture Administrator', is_super_admin: true }, error: null }
            : { data: null, error: new Error(`Unexpected fixture table: ${table}`) },
        }),
      }),
    }),
  };
}
