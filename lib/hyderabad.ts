import type { BoundsLiteral, RentEntry } from "@/lib/types";

export const HYDERABAD_CENTER = { lat: 17.4065, lng: 78.4772 };
export const HYDERABAD_BOUNDS: BoundsLiteral = { south: 17.18, west: 78.16, north: 17.62, east: 78.70 };

export const METRO_STATIONS = [
  ["Raidurg",17.4425,78.3773],["HITEC City",17.4492,78.3838],["Durgam Cheruvu",17.4374,78.3877],
  ["Madhapur",17.4350,78.3864],["Jubilee Hills Check Post",17.4300,78.4032],["Peddamma Gudi",17.4304,78.4075],
  ["Ameerpet",17.4374,78.4487],["Begumpet",17.4440,78.4567],["Parade Ground",17.4434,78.4970],
  ["Secunderabad East",17.4337,78.4985],["Nagole",17.3917,78.5593],["Miyapur",17.4967,78.3730],
  ["Kukatpally",17.4932,78.4070],["SR Nagar",17.4431,78.4427],["LB Nagar",17.3502,78.5522]
] as const;

export function withinHyderabad(lat:number,lng:number){
  return lat>=HYDERABAD_BOUNDS.south&&lat<=HYDERABAD_BOUNDS.north&&lng>=HYDERABAD_BOUNDS.west&&lng<=HYDERABAD_BOUNDS.east;
}

export function distanceKm(a:{lat:number;lng:number},b:{lat:number;lng:number}){
  const R=6371,dLat=(b.lat-a.lat)*Math.PI/180,dLng=(b.lng-a.lng)*Math.PI/180;
  const x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}

export function isNearMetro(entry:Pick<RentEntry,"lat"|"lng">,radiusKm=1.2){
  return METRO_STATIONS.some(([,lat,lng])=>distanceKm(entry,{lat,lng})<=radiusKm);
}

export function nearestMetro(entry:Pick<RentEntry,"lat"|"lng">){
  let best:{name:string;distanceKm:number}|null=null;
  for(const [name,lat,lng] of METRO_STATIONS){const distance=distanceKm(entry,{lat,lng});if(!best||distance<best.distanceKm)best={name,distanceKm:distance};}
  return best;
}

export function clampBounds(bounds:BoundsLiteral):BoundsLiteral{
  return {south:Math.max(bounds.south,HYDERABAD_BOUNDS.south),west:Math.max(bounds.west,HYDERABAD_BOUNDS.west),north:Math.min(bounds.north,HYDERABAD_BOUNDS.north),east:Math.min(bounds.east,HYDERABAD_BOUNDS.east)};
}
