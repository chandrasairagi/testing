import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMoney, titleFromSlug } from "@/lib/format";
import { getSupabaseServer } from "@/lib/supabase-server";
import type { RentEntry } from "@/lib/types";

export const dynamic = "force-dynamic";
type Props={params:Promise<{locality:string}>};
const cols="id,entry_type,listing_kind,locality,bhk,rent,deposit,furnishing,gated,maintenance_included,availability,parking,sqft,building,tenant_preference,pets,gender_preference,food_preference,smoking_preference,notes,lat,lng,status,is_verified,created_at";

async function getEntries(locality:string):Promise<RentEntry[]>{const {data,error}=await getSupabaseServer().from("rent_entries").select(cols).eq("status","active").in("moderation_status",["unreviewed","approved"]).ilike("locality",`%${locality}%`).order("created_at",{ascending:false}).limit(500);if(error){console.error(error);return [];}return (data??[]) as RentEntry[];}
function median(v:number[]){if(!v.length)return null;v=[...v].sort((a,b)=>a-b);const m=Math.floor(v.length/2);return v.length%2?v[m]:Math.round((v[m-1]+v[m])/2);}

export async function generateMetadata({params}:Props):Promise<Metadata>{const {locality:slug}=await params;const locality=titleFromSlug(slug);return {title:`${locality} rent prices`,description:`See reported rents, median prices and available homes in ${locality}, Hyderabad.`};}

export default async function LocalityPage({params}:Props){
  const {locality:slug}=await params;const locality=titleFromSlug(slug);if(!locality||locality.length>80)notFound();
  const entries=await getEntries(locality),rentRows=entries.filter(e=>e.entry_type!=="seeker"),listings=entries.filter(e=>e.entry_type==="listing"),allRents=rentRows.map(e=>e.rent);
  const byBhk=[1,2,3,4].map(b=>{const rents=rentRows.filter(e=>b===4?e.bhk>=4:e.bhk===b).map(e=>e.rent);return {bhk:b===4?"4+":String(b),count:rents.length,median:median(rents),average:rents.length?Math.round(rents.reduce((s,v)=>s+v,0)/rents.length):null};});
  return <main className="page-shell"><nav className="page-nav"><Link className="brand" href="/">hyderabad<span>.rent</span></Link><Link href="/">← Back to map</Link></nav><div className="eyebrow">Hyderabad locality intelligence</div><h1>{locality} rent prices</h1><p className="intro">Community rent reports and current listings for {locality}. Statistics improve as more Hyderabad renters contribute.</p><section className="locality-metrics"><div className="locality-metric"><small>MEDIAN RENT</small><strong>{formatMoney(median(allRents))}</strong></div><div className="locality-metric"><small>DATA POINTS</small><strong>{rentRows.length}</strong></div><div className="locality-metric"><small>AVAILABLE</small><strong>{listings.length}</strong></div><div className="locality-metric"><small>VERIFIED</small><strong>{entries.filter(e=>e.is_verified).length}</strong></div></section><section className="page-card"><h2>Rent by BHK</h2><table className="simple-table"><thead><tr><th>Home</th><th>Median</th><th>Average</th><th>Data points</th></tr></thead><tbody>{byBhk.map(r=><tr key={r.bhk}><td>{r.bhk} BHK</td><td>{formatMoney(r.median)}</td><td>{formatMoney(r.average)}</td><td>{r.count}</td></tr>)}</tbody></table></section><section className="page-card" style={{marginTop:14}}><h2>Recent listings</h2>{listings.length===0?<p className="intro">No active listings in this locality yet.</p>:<table className="simple-table"><thead><tr><th>Type</th><th>Rent</th><th>Furnishing</th><th>Building</th></tr></thead><tbody>{listings.slice(0,20).map(e=><tr key={e.id}><td><Link href={`/entry/${e.id}`}>{e.listing_kind==="room"?"Room":`${e.bhk} BHK`}</Link></td><td>{formatMoney(e.rent)}</td><td>{e.furnishing??"—"}</td><td>{e.building??"—"}</td></tr>)}</tbody></table>}</section></main>;
}
