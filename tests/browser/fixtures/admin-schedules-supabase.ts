type RpcResult = { data: unknown; error: Error | null };

const scope = {
  dojo_id: 'fixture-dojo',
  dojo_name: 'Fixture Dojo',
  class_id: 'fixture-class',
  class_name: 'Fixture Aikido',
};


const multiScope = new URLSearchParams(location.search).has('multi-scope');
const requests: Array<{name: string; column?: string; value?: string}> = [];
Object.assign(window, {scheduleRequests: requests});
const memberView = new URLSearchParams(location.search).has('member-view');
const scopes = [scope, {...scope,dojo_id:'dojo-b',dojo_name:'South Dojo'}, {...scope,dojo_id:'dojo-c',dojo_name:'Kids Dojo',class_id:'class-kids',class_name:'Kungfu Kids'}];
let schedules: Array<Record<string, unknown>> = (memberView || multiScope) ? scopes.map((s,index) => ({...s,schedule_id:String(index),day_of_week:2,start_time:'19:00:00',finish_time:'20:00:00',instructor_id:'fixture-instructor',instructor_name:'Fixture Instructor',instructor_rank:'2nd Dan',instructor_phone:'083813636997',is_active:true,can_manage:!memberView,venue:null,notes:null,updated_at:''})) : [];


function timeMinutes(value: unknown) {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return Number.NaN;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function createClient() {
  return {
    rpc: (name: string, args: Record<string, unknown> = {}) => {
 if (name === 'get_regular_schedules_with_instructor') return {
  eq: async (column: string, value: string): Promise<RpcResult> => {
   requests.push({name, column, value});
   if (!['dojo_id','class_id'].includes(column)) throw Error('Expected category filter');
   await new Promise(resolve => setTimeout(resolve, value === 'dojo-b' ? 300 : 20));
   return {data:schedules.filter(row => row[column] === value).map(row => ({...row})),error:null};
  },
 };
 requests.push({name});
 return (async (): Promise<RpcResult> => {

      await new Promise(resolve => setTimeout(resolve, 20));

      if (name === 'get_dojo_contact_details') return {data:scopes.map(s => ({...s,active:true})),error:null};
      if (name === 'get_manageable_schedule_scopes') {
        return { data: multiScope ? scopes : [scope], error: null };
      }
      if (name === 'get_regular_class_schedules') {
        return { data: schedules.map(row => ({ ...row })), error: null };
      }
      if (name === 'get_schedule_instructor_options') {
        if (!(multiScope ? scopes : [scope]).some(row => row.dojo_id === args.target_dojo_id)) return { data: null, error: new Error('Dojo is outside the assigned scope.') };
        return { data: [{ instructor_id: 'fixture-instructor', instructor_name: 'Fixture Instructor' }], error: null };
      }
      if (name === 'upsert_regular_class_schedule') {
        if (args.target_dojo_id !== scope.dojo_id) return { data: null, error: new Error('Dojo is outside the assigned scope.') };
        if (timeMinutes(args.target_finish_time) <= timeMinutes(args.target_start_time)) {
          return { data: null, error: new Error('Finish time must be after start time.') };
        }
        const scheduleId = typeof args.target_schedule_id === 'string' && args.target_schedule_id
          ? args.target_schedule_id
          : 'fixture-schedule';
        const next = {
          ...scope,
          schedule_id: scheduleId,
          day_of_week: args.target_day_of_week,
          start_time: `${args.target_start_time}:00`,
          finish_time: `${args.target_finish_time}:00`,
          instructor_id: args.target_instructor_id,
          instructor_name: args.target_instructor_id ? 'Fixture Instructor' : null,
          instructor_rank: args.target_instructor_id ? '2nd Dan' : null,
          instructor_phone: args.target_instructor_id ? '083813636997' : null,
          venue: args.target_venue,
          notes: args.target_notes,
          is_active: args.target_is_active,
          can_manage: true,
          updated_at: '2026-09-27T00:00:00.000Z',
        };
        schedules = [...schedules.filter(row => row.schedule_id !== scheduleId), next];
        return { data: scheduleId, error: null };
      }
      return { data: null, error: new Error(`Unexpected fixture RPC: ${name}`) };
      })();
    },
  };
}
