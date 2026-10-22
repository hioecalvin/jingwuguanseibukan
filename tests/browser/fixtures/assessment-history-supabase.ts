import { waitForFixtureRequest } from './request-gate';

export function createClient(){let calls=0;return {rpc:async(name:string)=>{
 const scenario=new URLSearchParams(window.location.search).get('scenario');
 const attempt=++calls;
 if(scenario==='slow')await waitForFixtureRequest('assessment-history',true);
 if(scenario==='throw-once'&&attempt===1)throw new Error('Private synthetic transport failure');
 if(scenario==='error-once'&&attempt===1)return {data:null,error:new Error('Private RPC failure')};
 if(scenario==='empty')return {data:[],error:null};
 if(name==='get_assessment_result_history')return {data:[
  {result_id:'r1',assessment_number:'2026-0001',member_id:'JS-0103',member_name:'Fixture Member',assessment_date:'2026-10-01',class_name:'Fixture Aikido',dojo_name:'Fixture Dojo',rank_before:'5th Kyu',rank_assessed:'4th Kyu',outcome:'fail',assessor_name:'Fixture Assessor',notes:'Reassess later'},
  {result_id:'r2',assessment_number:'2026-0042',member_id:'JS-0103',member_name:'Fixture Member',assessment_date:'2026-10-18',class_name:'Fixture Aikido',dojo_name:'Fixture Dojo',rank_before:'5th Kyu',rank_assessed:'4th Kyu',outcome:'pass',assessor_name:'Fixture Assessor',notes:'Reassessment passed'},
 ],error:null};
 return {data:null,error:new Error('Unexpected fixture RPC')};
}};}
