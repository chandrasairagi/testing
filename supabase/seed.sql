-- Optional starter data so the map is not empty on day one.
insert into public.rent_entries
(entry_type,listing_kind,locality,bhk,rent,deposit,furnishing,gated,maintenance_included,availability,parking,sqft,building,notes,lat,lng)
values
('rent_report','whole_flat','Gachibowli',2,36000,72000,'Semi-furnished',true,false,'occupied',1,1180,'Near DLF','Maintenance extra',17.4401,78.3489),
('rent_report','whole_flat','Kondapur',2,32000,64000,'Semi-furnished',false,true,'occupied',1,1100,null,null,17.4698,78.3630),
('listing','whole_flat','Financial District',3,52000,104000,'Furnished',true,null,'asap',2,1680,'Nanakramguda','Available immediately',17.4163,78.3421),
('rent_report','whole_flat','Madhapur',1,24000,48000,'Furnished',false,null,'occupied',0,650,null,'Walkable to metro',17.4486,78.3908),
('listing','whole_flat','Kokapet',3,47000,94000,'Semi-furnished',true,null,'next_month',1,1600,null,'Gated community',17.3948,78.3374),
('listing','room','HITEC City',3,15000,30000,'Furnished',true,null,'asap',1,1200,null,'One room available in shared 3BHK',17.4435,78.3772),
('seeker','whole_flat','Kondapur',2,38000,null,null,null,null,'asap',1,null,null,'Looking near office, need parking',17.4585,78.3660);
