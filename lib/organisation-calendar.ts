import {rankCalendarDate} from "@/lib/rank-duration";

export type CalendarEntry = {
  id:string; title:string; description:string|null; location:string|null;
  starts_at:string; end_at:string|null; classes:{name:string}|null;
  all_day?:boolean; original_date?:string;
};
export const ORGANISATION_DATES = [
  {id:"js-birthday",title:"JS Birthday",originalDate:"2009-07-10"},
  {id:"js-independence",title:"JS Independence Day",originalDate:"2021-11-11"},
] as const;

/** Expand annual dates on demand; no expiry year or stored duplicate events. */
export function organisationAnniversaries(year:number):CalendarEntry[] {
  return ORGANISATION_DATES.filter(item=>year>=Number(item.originalDate.slice(0,4))).map(item=>{
    const date=`${year}-${item.originalDate.slice(5)}`;
    const years=year-Number(item.originalDate.slice(0,4));
    return {id:`${item.id}-${year}`,title:item.title,
      description:`${years} ${years===1?'year':'years'} since ${item.originalDate.split('-').reverse().join('/')}. Repeats every year.`,
      location:null,starts_at:`${date}T00:00:00+07:00`,end_at:`${date}T23:59:59+07:00`,
      classes:null,all_day:true,original_date:item.originalDate};
  });
}

function addMonths(date:string,months:number):string {
  const [year,month,day]=date.split('-').map(Number);
  const first=new Date(Date.UTC(year,month-1+months,1));
  const last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  first.setUTCDate(Math.min(day,last));
  return first.toISOString().slice(0,10);
}

export function calendarPeriods(today:string) {
  const year=Number(today.slice(0,4));
  const first=today.slice(0,8)+'01';
  return [
    {id:'year',label:'This year',start:`${year}-01-01`,end:`${year+1}-01-01`},
    {id:'month',label:'Next month',start:addMonths(first,1),end:addMonths(first,2)},
    {id:'three',label:'Next 3 months',start:today,end:addMonths(today,3)},
    {id:'six',label:'Next 6 months',start:today,end:addMonths(today,6)},
    {id:'next-year',label:'Next year',start:`${year+1}-01-01`,end:`${year+2}-01-01`},
  ];
}

export function calendarEntryDate(entry:CalendarEntry):string {
  return entry.all_day?entry.starts_at.slice(0,10):rankCalendarDate(new Date(entry.starts_at));
}

export function entriesForPeriod(events:CalendarEntry[],start:string,end:string):CalendarEntry[] {
  const annual=[] as CalendarEntry[];
  for(let year=Number(start.slice(0,4));year<=Number(end.slice(0,4));year++) annual.push(...organisationAnniversaries(year));
  return [...events,...annual].filter(entry=>{
    if(!Number.isFinite(Date.parse(entry.starts_at)))return false;
    const date=calendarEntryDate(entry);
    return date>=start&&date<end;
  }).sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at)||a.title.localeCompare(b.title));
}
