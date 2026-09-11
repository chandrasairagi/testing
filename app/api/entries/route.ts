import { NextRequest, NextResponse } from "next/server";
import { clampBounds, distanceKm, HYDERABAD_BOUNDS } from "@/lib/hyderabad";
import { allowRequest, requestFingerprint } from "@/lib/rate-limit";
import { getSupabaseServer, hasSupabaseConfig } from "@/lib/supabase-server";
import { validateEntryPayload } from "@/lib/validation";
import type { BoundsLiteral, RentEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

const PUBLIC_COLUMNS = ["id","entry_type","listing_kind","locality","bhk","rent","deposit","furnishing","gated","maintenance_included","availability","parking","sqft","building","tenant_preference","pets","gender_preference","food_preference","smoking_preference","notes","lat","lng","status","is_verified","created_at"].join(",");

function numberParam(value:string|null,fallback:number){if(value==null||value==="")return fallback;const n=Number(value);return Number.isFinite(n)?n:fallback;}
function publicEntry(row:Record<string,unknown>):RentEntry{return {
  id:String(row.id),entry_type:row.entry_type as RentEntry["entry_type"],listing_kind:row.listing_kind as RentEntry["listing_kind"],locality:String(row.locality),bhk:Number(row.bhk),rent:Number(row.rent),deposit:row.deposit==null?null:Number(row.deposit),furnishing:(row.furnishing as RentEntry["furnishing"])??null,gated:row.gated==null?null:Boolean(row.gated),maintenance_included:row.maintenance_included==null?null:Boolean(row.maintenance_included),availability:(row.availability as RentEntry["availability"])??null,parking:row.parking==null?null:Number(row.parking),sqft:row.sqft==null?null:Number(row.sqft),building:row.building==null?null:String(row.building),tenant_preference:row.tenant_preference==null?null:String(row.tenant_preference),pets:row.pets==null?null:String(row.pets),gender_preference:row.gender_preference==null?null:String(row.gender_preference),food_preference:row.food_preference==null?null:String(row.food_preference),smoking_preference:row.smoking_preference==null?null:String(row.smoking_preference),notes:row.notes==null?null:String(row.notes),lat:Number(row.lat),lng:Number(row.lng),status:row.status as RentEntry["status"],is_verified:Boolean(row.is_verified),created_at:String(row.created_at)
};}

export async function GET(request:NextRequest){
  if(!hasSupabaseConfig())return NextResponse.json({error:"Supabase is not configured."},{status:503});
  const p=request.nextUrl.searchParams;
  const bounds=clampBounds({south:numberParam(p.get("south"),HYDERABAD_BOUNDS.south),west:numberParam(p.get("west"),HYDERABAD_BOUNDS.west),north:numberParam(p.get("north"),HYDERABAD_BOUNDS.north),east:numberParam(p.get("east"),HYDERABAD_BOUNDS.east)} satisfies BoundsLiteral);
  const supabase=getSupabaseServer();
  let q=supabase.from("rent_entries").select(PUBLIC_COLUMNS).eq("status","active").in("moderation_status",["unreviewed","approved"]).gte("lat",bounds.south).lte("lat",bounds.north).gte("lng",bounds.west).lte("lng",bounds.east).order("created_at",{ascending:false}).limit(600);
  const view=p.get("view");if(view==="listing"||view==="seeker"||view==="rent_report")q=q.eq("entry_type",view);
  const kind=p.get("listingKind");if(kind==="whole_flat"||kind==="room")q=q.eq("listing_kind",kind);
  const bhk=Number(p.get("bhk"));if(Number.isFinite(bhk)&&bhk>=1&&bhk<=5)q=q.eq("bhk",bhk);
  const minRent=Number(p.get("minRent"));if(Number.isFinite(minRent)&&minRent>0)q=q.gte("rent",minRent);
  const maxRent=Number(p.get("maxRent"));if(Number.isFinite(maxRent)&&maxRent>0)q=q.lte("rent",maxRent);
  const furnishing=p.get("furnishing");if(["Furnished","Semi-furnished","Unfurnished"].includes(furnishing??""))q=q.eq("furnishing",furnishing!);
  const gated=p.get("gated");if(gated==="true"||gated==="false")q=q.eq("gated",gated==="true");
  const locality=p.get("locality");if(locality?.trim())q=q.ilike("locality",`%${locality.trim().slice(0,80)}%`);
  const {data,error}=await q;if(error){console.error("entries GET error",error);return NextResponse.json({error:"Could not load rental entries."},{status:500});}
  return NextResponse.json({entries:(data??[]).map(row=>publicEntry(row as Record<string,unknown>))},{headers:{"Cache-Control":"public, s-maxage=15, stale-while-revalidate=45"}});
}

export async function POST(request:NextRequest){
  if(!hasSupabaseConfig())return NextResponse.json({error:"Supabase is not configured."},{status:503});
  const rate=allowRequest(requestFingerprint(request),"entry",8,60*60*1000);if(!rate.allowed)return NextResponse.json({error:"Too many submissions from this browser/network. Try again later."},{status:429});
  let raw:unknown;try{raw=await request.json();}catch{return NextResponse.json({error:"Invalid JSON."},{status:400});}
  const validation=validateEntryPayload(raw);if(!validation.data)return NextResponse.json({error:validation.error??"Invalid submission."},{status:400});
  const {contact,website:_website,...entry}=validation.data;const supabase=getSupabaseServer();
  const cutoff=new Date(Date.now()-14*24*60*60*1000).toISOString();
  const {data:candidates}=await supabase.from("rent_entries").select("id,entry_type,locality,bhk,rent,building,lat,lng,created_at").eq("entry_type",entry.entry_type).eq("bhk",entry.bhk).eq("rent",entry.rent).ilike("locality",entry.locality).gte("created_at",cutoff).limit(20);
  const duplicate=(candidates??[]).some(c=>distanceKm({lat:Number(c.lat),lng:Number(c.lng)},{lat:entry.lat,lng:entry.lng})<=.15||(Boolean(entry.building)&&Boolean(c.building)&&String(c.building).trim().toLowerCase()===String(entry.building).trim().toLowerCase()));
  if(duplicate)return NextResponse.json({error:"A very similar entry was added recently. Check the map before submitting it again."},{status:409});
  const expiresAt=entry.entry_type==="rent_report"?null:new Date(Date.now()+90*24*60*60*1000).toISOString();
  const {data:createdId,error:insertError}=await supabase.rpc("submit_rent_entry",{p_entry_type:entry.entry_type,p_listing_kind:entry.listing_kind,p_locality:entry.locality,p_bhk:entry.bhk,p_rent:entry.rent,p_deposit:entry.deposit??null,p_furnishing:entry.furnishing??null,p_gated:entry.gated??null,p_maintenance_included:entry.maintenance_included??null,p_availability:entry.availability??null,p_parking:entry.parking??null,p_sqft:entry.sqft??null,p_building:entry.building??null,p_tenant_preference:entry.tenant_preference??null,p_pets:entry.pets??null,p_gender_preference:entry.gender_preference??null,p_food_preference:entry.food_preference??null,p_smoking_preference:entry.smoking_preference??null,p_notes:entry.notes??null,p_lat:entry.lat,p_lng:entry.lng,p_expires_at:expiresAt,p_contact:contact??null});
  if(insertError||!createdId){console.error("entries POST error",insertError);return NextResponse.json({error:"Could not save the entry."},{status:500});}
  const {data:created,error:fetchError}=await supabase.from("rent_entries").select(PUBLIC_COLUMNS).eq("id",createdId).single();
  if(fetchError||!created){console.error("entries POST fetch error",fetchError);return NextResponse.json({id:createdId},{status:201});}
  return NextResponse.json({entry:publicEntry(created as Record<string,unknown>)},{status:201});
}
