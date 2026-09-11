import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer, hasSupabaseConfig } from "@/lib/supabase-server";
import { allowRequest, requestFingerprint } from "@/lib/rate-limit";

const REASONS = new Set(["spam","duplicate","wrong_price","not_available","other"]);

export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig()) return NextResponse.json({error:"Supabase is not configured."},{status:503});
  const rate=allowRequest(requestFingerprint(request),"report",12,60*60*1000);
  if(!rate.allowed) return NextResponse.json({error:"Too many reports. Try again later."},{status:429});
  let body:Record<string,unknown>;
  try{body=await request.json() as Record<string,unknown>;}catch{return NextResponse.json({error:"Invalid JSON."},{status:400});}
  const entryId=typeof body.entry_id==="string"?body.entry_id.trim():"";
  const reason=typeof body.reason==="string"?body.reason:"other";
  const details=typeof body.details==="string"?body.details.trim().slice(0,500):null;
  if(!/^[0-9a-f-]{36}$/i.test(entryId)) return NextResponse.json({error:"Invalid entry."},{status:400});
  if(!REASONS.has(reason)) return NextResponse.json({error:"Invalid reason."},{status:400});
  const {error}=await getSupabaseServer().from("entry_reports").insert({entry_id:entryId,reason,details});
  if(error){console.error("report POST error",error);return NextResponse.json({error:"Could not submit the report."},{status:500});}
  return NextResponse.json({ok:true},{status:201});
}
