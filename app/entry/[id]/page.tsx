import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EntryActions from "@/components/EntryActions";
import { formatMoney } from "@/lib/format";
import { distanceKm, nearestMetro } from "@/lib/hyderabad";
import { getSupabaseServer } from "@/lib/supabase-server";
import type { RentEntry } from "@/lib/types";

type Props={params:Promise<{id:string}>};
const cols="id,entry_type,listing_kind,locality,bhk,rent,deposit,furnishing,gated,maintenance_included,availability,parking,sqft,building,tenant_preference,pets,gender_preference,food_preference,smoking_preference,notes,lat,lng,status,is_verified,created_at";

async function getEntry(id:string){const {data}=await getSupabaseServer().from("rent_entries").select(cols).eq("id",id).single();return data as RentEntry|null;}
function median(v:number[]){if(!v.length)return null;v=[...v].sort((a,b)=>a-b);const m=Math.floor(v.length/2);return v.length%2?v[m]:Math.round((v[m-1]+v[m])/2);}

export async function generateMetadata({params}:Props):Promise<Metadata>{const {id}=await params;const e=await getEntry(id);return {title:e?`${e.locality} · ${e.bhk} BHK · ${formatMoney(e.rent)}`:"Rental entry"};}

export default async function EntryPage({params}:Props){
  const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();const entry=await getEntry(id);if(!entry)notFound();
  const supabase=getSupabaseServer();
  const {data:localRows}=await supabase.from("rent_entries").select("rent").eq("locality",entry.locality).eq("bhk",entry.bhk).neq("entry_type","seeker").limit(200);
  const localMedian=median((localRows??[]).map(x=>Number(x.rent)));const diff=localMedian?Math.round(((entry.rent-localMedian)/localMedian)*100):null;
  const opposite=entry.entry_type==="listing"?"seeker":entry.entry_type==="seeker"?"listing":null;
  let matches=0;if(opposite){const {data}=await supabase.from("rent_entries").select(cols).eq("entry_type",opposite).eq("listing_kind",entry.listing_kind).eq("bhk",entry.bhk).limit(200);matches=(data??[]).filter(x=>distanceKm(entry,{lat:Number(x.lat),lng:Number(x.lng)})<=3&&(entry.entry_type==="listing"?entry.rent<=Number(x.rent):Number(x.rent)<=entry.rent)).length;}
  const metro=nearestMetro(entry);
  return <main className="page-shell"><nav className="page-nav"><Link className="brand" href="/">hyderabad<span>.rent</span></Link><Link href="/">← Back to map</Link></nav><div className="entry-layout"><section className="page-card"><div className="eyebrow">{entry.entry_type==="listing"?"Available home":entry.entry_type==="seeker"?"Seeker":"Community rent report"}</div><h1>{entry.locality}</h1><div className="detail-card"><h2>{entry.entry_type==="seeker"?"Budget ":""}{formatMoney(entry.rent)} <small>/ month</small></h2><p>{entry.bhk} BHK · {entry.listing_kind==="room"?"Room":"Whole flat"}{entry.furnishing?` · ${entry.furnishing}`:""}</p>{entry.building&&<p><b>{entry.building}</b></p>}{entry.deposit!=null&&<p>Deposit: {formatMoney(entry.deposit)}</p>}{entry.notes&&<p>{entry.notes}</p>}</div><EntryActions entryId={entry.id} title={`${entry.locality} ${entry.bhk} BHK`}/></section><aside className="page-card"><div className="metric-grid"><div className="metric"><small>LOCAL MEDIAN</small><strong>{formatMoney(localMedian)}</strong></div><div className="metric"><small>VS MEDIAN</small><strong>{diff==null?"—":`${diff>0?"+":""}${diff}%`}</strong></div><div className="metric"><small>NEARBY MATCHES</small><strong>{matches}</strong></div></div>{metro&&<div className="stat-card" style={{marginTop:10}}><b>🚇 {metro.name}</b><p>{metro.distanceKm.toFixed(1)} km straight-line distance</p></div>}<Link className="button button-soft" href={`/rent/${encodeURIComponent(entry.locality.toLowerCase().replace(/\s+/g,"-"))}`}>View {entry.locality} rent stats →</Link></aside></div></main>;
}
