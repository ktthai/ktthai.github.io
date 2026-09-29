export const specialItemSets = [
  { name: "Unfinished Reverie's Diadem Halo", items: [3160099, 3160151] },
  {
    name: 'Soul Liberator',
    items: [
      1000059, 1010070, 1020004, 1040054, 1040055, 1050017, 1060011, 1070014, 1080048, 1090010,
      1200043, 1210067, 1220018, 1230039, 1250026, 1260020, 1270029, 1280018, 1400011, 1400012,
      1420006, 1420007, 1430005, 1440006, 1460003, 1640003, 1640004, 1650001,
    ],
  },
  { name: 'Soluna Blade', items: [41233] },
  { name: 'Destructive Robe', items: [19406, 19407] },
  { name: "Irusan's Bell", items: [3100003] },
  { name: "Fleur's Grass Tiara", items: [29322, 2110270, 2110274] },
];

export const specialItemMap = new Map();
for (const set of specialItemSets) {
  for (const id of set.items) specialItemMap.set(id, set.name);
}
