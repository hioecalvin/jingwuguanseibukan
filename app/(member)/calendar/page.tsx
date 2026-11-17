"use client";
import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import CompactRecord from "@/components/compact-record";
import {createClient} from "@/lib/supabase/client";
import {formatDate} from "@/lib/format-date";
import {rankCalendarDate} from "@/lib/rank-duration";
import {calendarEntryDate,calendarPeriods,entriesForPeriod,type CalendarEntry} from "@/lib/organisation-calendar";

function EventCard({event,today}:{event:CalendarEntry;today:string}) {
  const date=calendarEntryDate(event);
  const time=(value:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
  return <CompactRecord alwaysCollapsible summary={event.title}
    detail={`${formatDate(date)} · ${event.all_day?'Organisation anniversary':event.classes?.name??'Organisation event'}${date<today?' · Past':''}`}
    className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-neutral-400">Date</dt><dd>{formatDate(date)}</dd></div>
      <div><dt className="text-neutral-400">Time</dt><dd>{event.all_day?'All day':`${time(event.starts_at)}${event.end_at?' – '+time(event.end_at):''} WIB`}</dd></div>
      {!event.all_day&&<div><dt className="text-neutral-400">Location</dt><dd>{event.location||'To be confirmed'}</dd></div>}
      {event.original_date&&<div><dt className="text-neutral-400">Original date</dt><dd>{formatDate(event.original_date)}</dd></div>}
    </dl>
    {event.description&&<p className="mt-3 whitespace-pre-line text-sm text-neutral-300">{event.description}</p>}
  </CompactRecord>;
}
export default function CalendarPage() {
  const client=useMemo(()=>createClient(),[]);
  const router=useRouter();
  const [events,setEvents]=useState<CalendarEntry[]>([]);
  const [today,setToday]=useState(()=>rankCalendarDate());
  const [period,setPeriod]=useState('year');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    const refresh=()=>setToday(rankCalendarDate());
    const timer=window.setInterval(refresh,60_000);
    window.addEventListener('focus',refresh);
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);};
  },[]);
  useEffect(()=>{
    let active=true;
    async function load(){
      setLoading(true);setError('');
      try{
        const {data:{user},error:authError}=await client.auth.getUser();
        if(!active)return;
        if(authError||!user){router.replace('/login');return;}
        const result=await client.from('events').select('id,title,description,location,starts_at,end_at,classes:classes!events_class_id_fkey(name)').order('starts_at',{ascending:true});
        if(!active)return;
        if(result.error)throw new Error();
        setEvents((result.data??[]) as unknown as CalendarEntry[]);
      }catch{if(active)setError('Events could not be loaded. The annual JS dates are still shown.');}
      finally{if(active)setLoading(false);}
    }
    void load();return()=>{active=false;};
  },[client,router,retry]);
  const periods=calendarPeriods(today);
  const selected=periods.find(item=>item.id===period)??periods[0];
  const displayed=entriesForPeriod(events,selected.start,selected.end);
  const past=events.filter(event=>Number.isFinite(Date.parse(event.starts_at))&&calendarEntryDate(event)<today).sort((a,b)=>Date.parse(b.starts_at)-Date.parse(a.starts_at));
  return <main className="mx-auto w-full max-w-6xl space-y-6">
    <header className="border-b border-neutral-800 pb-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-sky-400">Schedule</p>
      <h1 className="mt-2 text-3xl font-bold">Calendar</h1>
      <p className="mt-2 text-sm text-neutral-400">Classes, seminars and annual JS celebrations. Dates and times use Indonesia Western Time (WIB).</p>
    </header>
    <nav aria-label="Calendar periods" className="flex flex-wrap gap-2">
      {periods.map(item=><button type="button" key={item.id} aria-pressed={period===item.id} onClick={()=>setPeriod(item.id)}
        className={`min-h-11 rounded-lg border px-3 py-2 text-sm ${period===item.id?'border-sky-400 bg-sky-950 text-sky-200':'border-neutral-700 text-neutral-300'}`}>{item.label}</button>)}
    </nav>
    <section aria-labelledby="calendar-period-heading" className="space-y-3">
      <h2 id="calendar-period-heading" className="text-xl font-semibold">{selected.label} · {selected.id==='next-year'?Number(today.slice(0,4))+1:selected.id==='year'?today.slice(0,4):`${formatDate(selected.start)} onward`}</h2>
      <p className="text-sm text-neutral-400">{selected.id==='year'?'Includes earlier and upcoming dates this year.':''} JS Birthday and JS Independence Day repeat every year without an end date.</p>
      {loading&&<p role="status">Loading calendar…</p>}
      {error&&<div role="alert" className="text-sm text-red-300">{error} <button type="button" onClick={()=>setRetry(value=>value+1)} className="min-h-11 underline">Retry events</button></div>}
      {displayed.map(event=><EventCard key={event.id} event={event} today={today}/>)}
      {!loading&&!displayed.length&&<p className="rounded-xl border border-neutral-800 p-4 text-sm">No events in this period.</p>}
    </section>
    {!!past.length&&<details className="rounded-xl border border-neutral-800 p-4">
      <summary className="cursor-pointer font-semibold">Past class and organisation events ({past.length})</summary>
      <div className="mt-3 space-y-3">{past.map(event=><EventCard key={event.id} event={event} today={today}/>)}</div>
    </details>}
  </main>;
}
