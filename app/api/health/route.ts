import { NextResponse } from "next/server";
import { getSupabaseServer, hasSupabaseConfig } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabaseConfig()) return NextResponse.json({ ok:false,supabase:false,googleMapsKeyConfigured:Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) },{status:503});
  const supabase=getSupabaseServer();
  const {error}=await supabase.from("rent_entries").select("id",{head:true,count:"exact"}).limit(1);
  return NextResponse.json({ok:!error,supabase:!error,googleMapsKeyConfigured:Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)},{status:error?503:200});
}
