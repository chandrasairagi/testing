"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatMoney, shortRent } from "@/lib/format";
import { HYDERABAD_BOUNDS, HYDERABAD_CENTER, isNearMetro, METRO_STATIONS } from "@/lib/hyderabad";
import { loadGoogleMaps } from "@/lib/google-maps";
import type { BoundsLiteral, EntryPayload, MapFilters, RentEntry } from "@/lib/types";

const MAP_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID";

const defaultFilters: MapFilters = {
  view: "all", bhk: "", listingKind: "", minRent: "", maxRent: "",
  furnishing: "", gated: "", nearMetro: false, availableNow: false
};

const defaultForm = (): EntryPayload => ({
  entry_type: "rent_report", listing_kind: "whole_flat", locality: "", bhk: 2,
  rent: 30000, deposit: null, furnishing: "Semi-furnished", gated: null,
  maintenance_included: null, availability: "occupied", parking: 0, sqft: null,
  building: null, tenant_preference: null, pets: null, gender_preference: null,
  food_preference: null, smoking_preference: null, notes: null,
  lat: HYDERABAD_CENTER.lat, lng: HYDERABAD_CENTER.lng, contact: null, website: ""
});

function median(values: number[]) {
  if (!values.length) return null;
  const v = [...values].sort((a,b)=>a-b), m = Math.floor(v.length/2);
  return v.length % 2 ? v[m] : Math.round((v[m-1]+v[m])/2);
}

function markerEl(entry: RentEntry) {
  const el = document.createElement("button");
  el.className = `map-pin ${entry.entry_type}`;
  el.textContent = entry.entry_type === "seeker" ? `🔎 ${shortRent(entry.rent)}` : `${shortRent(entry.rent)} · ${entry.bhk}B`;
  return el;
}

function popup(entry: RentEntry) {
  const type = entry.entry_type === "seeker" ? "Seeker" : entry.entry_type === "listing" ? "Available" : "Rent report";
  return `<div class="gm-popup"><b>${type} · ${entry.locality}</b><strong>${entry.entry_type === "seeker" ? "Budget " : ""}${formatMoney(entry.rent)}</strong><span>${entry.bhk} BHK${entry.furnishing ? ` · ${entry.furnishing}` : ""}</span>${entry.building ? `<span>${entry.building}</span>` : ""}</div>`;
}

export default function RentMapApp() {
  const mapHost = useRef<HTMLDivElement>(null);
  const searchHost = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const markerClass = useRef<typeof google.maps.marker.AdvancedMarkerElement | null>(null);
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const metroMarkers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const pickingRef = useRef(false);
  const loadEntriesRef = useRef<(bounds?: BoundsLiteral) => Promise<void>>(async () => {});

  const [entries,setEntries] = useState<RentEntry[]>([]);
  const [filters,setFilters] = useState(defaultFilters);
  const [loading,setLoading] = useState(true);
  const [mapReady,setMapReady] = useState(false);
  const [mapError,setMapError] = useState("");
  const [pinsVisible,setPinsVisible] = useState(true);
  const [metroVisible,setMetroVisible] = useState(false);
  const [selected,setSelected] = useState<RentEntry | null>(null);
  const [toast,setToast] = useState("");
  const [form,setForm] = useState<EntryPayload>(defaultForm());
  const [formOpen,setFormOpen] = useState(false);
  const [picking,setPicking] = useState(false);
  const [saving,setSaving] = useState(false);
  const [watchOpen,setWatchOpen] = useState(false);
  const [watchEmail,setWatchEmail] = useState("");

  const notify = (message:string) => { setToast(message); window.setTimeout(()=>setToast(""),2600); };

  const loadEntries = useCallback(async (bounds?:BoundsLiteral) => {
    const b = bounds || HYDERABAD_BOUNDS;
    const q = new URLSearchParams({south:String(b.south),west:String(b.west),north:String(b.north),east:String(b.east)});
    if (filters.view !== "all") q.set("view",filters.view);
    if (filters.bhk) q.set("bhk",filters.bhk);
    if (filters.listingKind) q.set("listingKind",filters.listingKind);
    if (filters.minRent) q.set("minRent",filters.minRent);
    if (filters.maxRent) q.set("maxRent",filters.maxRent);
    if (filters.furnishing) q.set("furnishing",filters.furnishing);
    if (filters.gated) q.set("gated",filters.gated);
    setLoading(true);
    try {
      const r = await fetch(`/api/entries?${q}`,{cache:"no-store"});
      if (!r.ok) throw new Error();
      const data = await r.json();
      let list:RentEntry[] = data.entries || [];
      if (filters.nearMetro) list = list.filter(e=>isNearMetro(e));
      if (filters.availableNow) list = list.filter(e=>e.entry_type === "listing" && (e.availability === "asap" || !e.availability));
      setEntries(list);
    } catch { notify("Could not load live rental data."); }
    finally { setLoading(false); }
  },[filters]);

  useEffect(()=>{ loadEntriesRef.current = loadEntries; },[loadEntries]);
  useEffect(()=>{ pickingRef.current = picking; },[picking]);

  useEffect(()=>{
    if (!MAP_KEY) { setMapError("Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in Vercel to enable Google Maps."); return; }
    let cancelled=false;
    loadGoogleMaps(MAP_KEY).then(async()=>{
      if (cancelled || !mapHost.current) return;
      const {Map,InfoWindow} = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
      const {AdvancedMarkerElement} = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
      markerClass.current = AdvancedMarkerElement;
      const map = new Map(mapHost.current,{center:HYDERABAD_CENTER,zoom:12,mapId:MAP_ID,mapTypeControl:false,streetViewControl:false,restriction:{latLngBounds:HYDERABAD_BOUNDS,strictBounds:false}});
      mapRef.current=map; infoRef.current=new InfoWindow(); setMapReady(true);

      map.addListener("idle",()=>{
        const b=map.getBounds(); if(!b) return;
        const ne=b.getNorthEast(), sw=b.getSouthWest();
        loadEntriesRef.current({south:sw.lat(),west:sw.lng(),north:ne.lat(),east:ne.lng()});
      });
      map.addListener("click",(ev:google.maps.MapMouseEvent)=>{
        if (!pickingRef.current || !ev.latLng) return;
        setForm(f=>({...f,lat:ev.latLng!.lat(),lng:ev.latLng!.lng()})); setPicking(false); setFormOpen(true); notify("Location selected.");
      });

      if (searchHost.current) {
        const {PlaceAutocompleteElement} = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
        const ac = new PlaceAutocompleteElement();
        ac.placeholder="Search locality, society or landmark…"; ac.includedRegionCodes=["in"];
        ac.locationRestriction=new google.maps.LatLngBounds({lat:HYDERABAD_BOUNDS.south,lng:HYDERABAD_BOUNDS.west},{lat:HYDERABAD_BOUNDS.north,lng:HYDERABAD_BOUNDS.east});
        searchHost.current.replaceChildren(ac);
        ac.addEventListener("gmp-select",async(e:any)=>{
          const place=e.placePrediction.toPlace(); await place.fetchFields({fields:["location","viewport","displayName"]});
          if(place.viewport) map.fitBounds(place.viewport,60); else if(place.location){map.panTo(place.location);map.setZoom(15);}
        });
      }
    }).catch(()=>setMapError("Google Maps could not load. Check the API key, billing and enabled APIs."));
    return()=>{cancelled=true;};
  // map bootstraps once; filter changes are handled below
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{
    const map=mapRef.current; if(!mapReady || !map) return;
    const b=map.getBounds(); if(!b) return;
    const ne=b.getNorthEast(),sw=b.getSouthWest();
    loadEntries({south:sw.lat(),west:sw.lng(),north:ne.lat(),east:ne.lng()});
  },[filters,mapReady,loadEntries]);

  useEffect(()=>{
    if(!mapReady || !markerClass.current || !mapRef.current) return;
    markers.current.forEach(m=>m.map=null); markers.current=[];
    if(!pinsVisible) return;
    for(const entry of entries){
      const m=new markerClass.current({map:mapRef.current,position:{lat:entry.lat,lng:entry.lng},content:markerEl(entry),title:`${entry.locality} ${formatMoney(entry.rent)}`,gmpClickable:true});
      m.addEventListener("gmp-click",()=>{setSelected(entry);infoRef.current?.setContent(popup(entry));infoRef.current?.open({map:mapRef.current!,anchor:m});});
      markers.current.push(m);
    }
  },[entries,mapReady,pinsVisible]);

  const stats=useMemo(()=>{
    const rents=entries.filter(e=>e.entry_type!=="seeker").map(e=>e.rent);
    return {count:entries.length,median:median(rents),listings:entries.filter(e=>e.entry_type==="listing").length,seekers:entries.filter(e=>e.entry_type==="seeker").length};
  },[entries]);

  function toggleMetro(){
    const map=mapRef.current,C=markerClass.current; if(!map||!C)return;
    if(metroVisible){metroMarkers.current.forEach(m=>m.map=null);metroMarkers.current=[];setMetroVisible(false);return;}
    metroMarkers.current=METRO_STATIONS.map(([name,lat,lng])=>{const el=document.createElement("div");el.className="metro-dot";el.title=name;return new C({map,position:{lat,lng},content:el,title:name});}); setMetroVisible(true);
  }

  async function submitEntry(e:FormEvent){
    e.preventDefault(); setSaving(true);
    try{const r=await fetch("/api/entries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not save");setFormOpen(false);setForm(defaultForm());notify("Published to the Hyderabad map.");const map=mapRef.current;if(map){const b=map.getBounds();if(b){const ne=b.getNorthEast(),sw=b.getSouthWest();loadEntries({south:sw.lat(),west:sw.lng(),north:ne.lat(),east:ne.lng()});}}}catch(err){notify(err instanceof Error?err.message:"Could not save");}finally{setSaving(false);}
  }

  async function saveWatch(){
    const center=mapRef.current?.getCenter(); if(!center||!watchEmail){notify("Enter an email first.");return;}
    const r=await fetch("/api/watches",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:watchEmail,lat:center.lat(),lng:center.lng(),radius_km:2,duration_months:3,bhk:filters.bhk||null,max_rent:filters.maxRent||null,listing_kind:filters.listingKind||null,furnishing:filters.furnishing||null})});
    if(r.ok){setWatchOpen(false);setWatchEmail("");notify("Watch saved.");} else {const d=await r.json();notify(d.error||"Could not save watch.");}
  }

  function openForm(type:EntryType){
    setForm({...defaultForm(),entry_type:type,availability:type==="rent_report"?"occupied":"asap"}); setFormOpen(true);
  }

  return <div className="app-shell">
    <header className="topbar"><Link href="/" className="brand">hyderabad<span>.rent</span></Link><div className="place-search" ref={searchHost}/><div className="top-actions"><button onClick={()=>setWatchOpen(true)}>🔔 Watch</button><button className="primary" onClick={()=>openForm("rent_report")}>＋ Add</button></div></header>
    <main className="workspace">
      <aside className="sidebar">
        <div><div className="eyebrow">Hyderabad rental map</div><h1>Know the rent before you rent.</h1><p className="intro">Community rent reports, direct homes and renter demand on one map.</p></div>
        <div className="tabs">{(["all","listing","seeker"] as const).map(v=><button key={v} className={filters.view===v?"active":""} onClick={()=>setFilters(f=>({...f,view:v}))}>{v==="all"?"All":v==="listing"?"Homes":"Seekers"}</button>)}</div>
        <div className="filter-grid">
          <label>BHK<select value={filters.bhk} onChange={e=>setFilters(f=>({...f,bhk:e.target.value}))}><option value="">Any</option>{[1,2,3,4,5].map(x=><option key={x} value={x}>{x}{x===5?"+":""} BHK</option>)}</select></label>
          <label>Type<select value={filters.listingKind} onChange={e=>setFilters(f=>({...f,listingKind:e.target.value}))}><option value="">Any</option><option value="whole_flat">Whole flat</option><option value="room">Room</option></select></label>
          <label>Min ₹<input inputMode="numeric" value={filters.minRent} onChange={e=>setFilters(f=>({...f,minRent:e.target.value}))}/></label>
          <label>Max ₹<input inputMode="numeric" value={filters.maxRent} onChange={e=>setFilters(f=>({...f,maxRent:e.target.value}))}/></label>
          <label>Furnishing<select value={filters.furnishing} onChange={e=>setFilters(f=>({...f,furnishing:e.target.value}))}><option value="">Any</option><option>Furnished</option><option>Semi-furnished</option><option>Unfurnished</option></select></label>
          <label>Society<select value={filters.gated} onChange={e=>setFilters(f=>({...f,gated:e.target.value}))}><option value="">Any</option><option value="true">Gated</option><option value="false">Not gated</option></select></label>
        </div>
        <div className="chips"><button className={filters.nearMetro?"active":""} onClick={()=>setFilters(f=>({...f,nearMetro:!f.nearMetro}))}>🚇 Near Metro</button><button className={filters.availableNow?"active":""} onClick={()=>setFilters(f=>({...f,availableNow:!f.availableNow}))}>🔑 Available now</button></div>
        <div className="stats"><span><b>{stats.count}</b> visible</span><span><b>{formatMoney(stats.median)}</b> median</span><span><b>{stats.listings}</b> homes</span><span><b>{stats.seekers}</b> seekers</span></div>
        <div className="add-grid"><button onClick={()=>openForm("rent_report")}>💰 Share my rent</button><button onClick={()=>openForm("listing")}>🏠 List a home</button><button onClick={()=>openForm("seeker")}>🔎 Find a home</button></div>
        <div className="results-head"><b>{loading?"Loading…":`${entries.length} results`}</b><button onClick={()=>setPinsVisible(v=>!v)}>{pinsVisible?"Hide pins":"Show pins"}</button></div>
        <div className="results">{entries.map(e=>{const metro=nearestMetro(e);return <div role="button" tabIndex={0} className={`result-card ${selected?.id===e.id?"selected":""}`} key={e.id} onClick={()=>{setSelected(e);mapRef.current?.panTo({lat:e.lat,lng:e.lng});mapRef.current?.setZoom(15);}}><div><span className={`kind ${e.entry_type}`}>{e.entry_type==="rent_report"?"Rent report":e.entry_type==="listing"?"Available":"Seeker"}</span><strong>{e.locality}</strong></div><b>{e.entry_type==="seeker"?"Budget ":""}{formatMoney(e.rent)}</b><span>{e.bhk} BHK · {e.listing_kind==="room"?"Room":"Whole flat"}{metro?` · ${metro.distanceKm.toFixed(1)} km to ${metro.name}`:""}</span><Link href={`/entry/${e.id}`} onClick={ev=>ev.stopPropagation()}>View details →</Link></div>})}</div>
        <div className="sidebar-links"><Link href="/rent/gachibowli">Gachibowli stats</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
      </aside>
      <section className="map-panel"><div ref={mapHost} className="map"/><div className="map-tools"><button className={metroVisible?"active":""} onClick={toggleMetro}>🚇</button><button onClick={()=>navigator.geolocation?.getCurrentPosition(p=>{mapRef.current?.panTo({lat:p.coords.latitude,lng:p.coords.longitude});mapRef.current?.setZoom(15);})}>◎</button><button onClick={()=>{mapRef.current?.panTo(HYDERABAD_CENTER);mapRef.current?.setZoom(12);}}>⌂</button></div>{mapError&&<div className="map-error"><h2>Map setup needed</h2><p>{mapError}</p><code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code></div>}{picking&&<div className="pick-banner">Click the map to choose the location <button onClick={()=>{setPicking(false);setFormOpen(true)}}>Cancel</button></div>}</section>
    </main>

    {formOpen&&<div className="modal-backdrop" onMouseDown={()=>setFormOpen(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">{form.entry_type==="rent_report"?"Rental transparency":form.entry_type==="listing"?"Direct listing":"Flat hunt"}</div><h2>{form.entry_type==="rent_report"?"Share what you pay":form.entry_type==="listing"?"List a home or room":"Post what you need"}</h2></div><button onClick={()=>setFormOpen(false)}>×</button></div><form onSubmit={submitEntry} className="form-grid">
      {form.entry_type!=="rent_report"&&<label>Type<select value={form.listing_kind} onChange={e=>setForm(f=>({...f,listing_kind:e.target.value as any}))}><option value="whole_flat">Whole flat</option><option value="room">Room</option></select></label>}
      <label>Locality<input required value={form.locality} onChange={e=>setForm(f=>({...f,locality:e.target.value}))} placeholder="Kondapur"/></label>
      <label>BHK<select value={form.bhk} onChange={e=>setForm(f=>({...f,bhk:Number(e.target.value)}))}>{[1,2,3,4,5].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>{form.entry_type==="seeker"?"Budget":"Monthly rent"}<input type="number" required min="1000" value={form.rent} onChange={e=>setForm(f=>({...f,rent:Number(e.target.value)}))}/></label>
      {form.entry_type!=="seeker"&&<><label>Deposit<input type="number" value={form.deposit??""} onChange={e=>setForm(f=>({...f,deposit:e.target.value?Number(e.target.value):null}))}/></label><label>Furnishing<select value={form.furnishing??""} onChange={e=>setForm(f=>({...f,furnishing:e.target.value as any}))}><option>Furnished</option><option>Semi-furnished</option><option>Unfurnished</option></select></label><label>Building / society<input value={form.building??""} onChange={e=>setForm(f=>({...f,building:e.target.value||null}))}/></label></>}
      {form.entry_type!=="rent_report"&&<label>Contact <small>(private)</small><input required value={form.contact??""} onChange={e=>setForm(f=>({...f,contact:e.target.value||null}))}/></label>}
      <label className="full">Notes<textarea rows={3} value={form.notes??""} onChange={e=>setForm(f=>({...f,notes:e.target.value||null}))}/></label>
      <div className="location-box full"><span>📍 {form.lat.toFixed(5)}, {form.lng.toFixed(5)}</span><button type="button" onClick={()=>{setFormOpen(false);setPicking(true)}}>Choose on map</button></div>
      <input tabIndex={-1} className="honeypot" value={form.website??""} onChange={e=>setForm(f=>({...f,website:e.target.value}))}/>
      <div className="modal-actions full"><button type="button" onClick={()=>setFormOpen(false)}>Cancel</button><button className="primary" disabled={saving}>{saving?"Saving…":"Publish"}</button></div>
    </form></div></div>}

    {watchOpen&&<div className="modal-backdrop" onMouseDown={()=>setWatchOpen(false)}><div className="modal small" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">Saved search</div><h2>Watch this area</h2></div><button onClick={()=>setWatchOpen(false)}>×</button></div><p className="intro">We’ll store this watch using the current map center and filters. Email delivery is the next beta step.</p><label>Email<input type="email" value={watchEmail} onChange={e=>setWatchEmail(e.target.value)} placeholder="you@example.com"/></label><div className="modal-actions"><button onClick={()=>setWatchOpen(false)}>Cancel</button><button className="primary" onClick={saveWatch}>Save watch</button></div></div></div>}

    {toast&&<div className="toast">{toast}</div>}
  </div>;
}

function nearestMetro(entry:Pick<RentEntry,"lat"|"lng">){
  let best:{name:string;distanceKm:number}|null=null;
  for(const [name,lat,lng] of METRO_STATIONS){const dx=(entry.lat-lat)*111,dy=(entry.lng-lng)*105;const d=Math.sqrt(dx*dx+dy*dy);if(!best||d<best.distanceKm)best={name,distanceKm:d};}
  return best;
}

type EntryType = "rent_report"|"listing"|"seeker";
