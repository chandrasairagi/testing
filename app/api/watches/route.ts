import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer, hasSupabaseConfig } from "@/lib/supabase-server";
import { isValidEmail } from "@/lib/validation";
import { withinHyderabad } from "@/lib/hyderabad";
import { allowRequest, requestFingerprint } from "@/lib/rate-limit";

const FURNISHING=new Set(["Furnished","Semi-furnished","Unfurnished"]);
const LISTING_KINDS=new Set(["whole_flat","room"]);

export async function POST(request:NextRequest){
  if(!hasSupabaseConfig()) return NextResponse.json({error:"Supabase is not configured."},{status:503});
  const rate=allowRequest(requestFingerprint(request),"watch",6,60*60*1000);
  if(!rate.allowed) return NextResponse.json({error:"Too many alerts created. Try again later."},{status:429});
  let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>;}catch{return NextResponse.json({error:"Invalid JSON."},{status:400});}
  const email=typeof body.email==="string"?body.email.trim():"",lat=Number(body.lat),lng=Number(body.lng);
  const radiusKm=Math.min(Math.max(Number(body.radius_km)||1,.5),10),durationMonths=Math.min(Math.max(Number(body.duration_months)||1,1),12);
  const bhkRaw=Number(body.bhk),bhk=Number.isFinite(bhkRaw)&&bhkRaw>=1&&bhkRaw<=5?bhkRaw:null;
  const maxRentRaw=Number(body.max_rent),maxRent=Number.isFinite(maxRentRaw)&&maxRentRaw>=1000&&maxRentRaw<=1_000_000?maxRentRaw:null;
  const listingKind=typeof body.listing_kind==="string"&&LISTING_KINDS.has(body.listing_kind)?body.listing_kind:null;
  const furnishing=typeof body.furnishing==="string"&&FURNISHING.has(body.furnishing)?body.furnishing:null;
  if(!isValidEmail(email)) return NextResponse.json({error:"Enter a valid email."},{status:400});
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||!withinHyderabad(lat,lng)) return NextResponse.json({error:"Choose a Hyderabad location."},{status:400});
  const expiresAt=new Date();expiresAt.setMonth(expiresAt.getMonth()+durationMonths);
  const {error}=await getSupabaseServer().from("watch_areas").insert({email,lat,lng,radius_km:radiusKm,expires_at:expiresAt.toISOString(),bhk,max_rent:maxRent,listing_kind:listingKind,furnishing});
  if(error){console.error("watch POST error",error);return NextResponse.json({error:"Could not save the watch."},{status:500});}
  return NextResponse.json({ok:true},{status:201});
}
