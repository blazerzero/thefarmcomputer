const WIKI_BASE = "https://stardewvalleywiki.com";

export interface BundleItem {
  name: string;
  quantity: number;
  quality?: "Silver" | "Gold";
}

export interface Bundle {
  name: string;
  room: string;
  items: BundleItem[];
  /** How many items must be contributed. May be less than items.length for choice bundles. */
  items_required: number;
  reward: string;
  wiki_url: string;
}

export const BUNDLES: Bundle[] = [
  // ── Crafts Room ─────────────────────────────────────────────────────────────
  {
    name: "Spring Foraging Bundle",
    room: "Crafts Room",
    items: [
      { name: "Wild Horseradish", quantity: 1 },
      { name: "Daffodil", quantity: 1 },
      { name: "Leek", quantity: 1 },
      { name: "Dandelion", quantity: 1 },
    ],
    items_required: 4,
    reward: "Spring Seeds ×30",
    wiki_url: `${WIKI_BASE}/Bundles#Spring_Foraging_Bundle`,
  },
  {
    name: "Summer Foraging Bundle",
    room: "Crafts Room",
    items: [
      { name: "Grape", quantity: 1 },
      { name: "Spice Berry", quantity: 1 },
      { name: "Sweet Pea", quantity: 1 },
    ],
    items_required: 3,
    reward: "Summer Seeds ×30",
    wiki_url: `${WIKI_BASE}/Bundles#Summer_Foraging_Bundle`,
  },
  {
    name: "Fall Foraging Bundle",
    room: "Crafts Room",
    items: [
      { name: "Common Mushroom", quantity: 1 },
      { name: "Wild Plum", quantity: 1 },
      { name: "Hazelnut", quantity: 1 },
      { name: "Blackberry", quantity: 1 },
    ],
    items_required: 4,
    reward: "Fall Seeds ×30",
    wiki_url: `${WIKI_BASE}/Bundles#Fall_Foraging_Bundle`,
  },
  {
    name: "Winter Foraging Bundle",
    room: "Crafts Room",
    items: [
      { name: "Winter Root", quantity: 1 },
      { name: "Crystal Fruit", quantity: 1 },
      { name: "Snow Yam", quantity: 1 },
      { name: "Crocus", quantity: 1 },
    ],
    items_required: 4,
    reward: "Winter Seeds ×30",
    wiki_url: `${WIKI_BASE}/Bundles#Winter_Foraging_Bundle`,
  },
  {
    name: "Construction Bundle",
    room: "Crafts Room",
    items: [
      { name: "Wood", quantity: 99 },
      { name: "Stone", quantity: 99 },
      { name: "Hardwood", quantity: 10 },
    ],
    items_required: 3,
    reward: "Charcoal Kiln ×1",
    wiki_url: `${WIKI_BASE}/Bundles#Construction_Bundle`,
  },
  {
    name: "Exotic Foraging Bundle",
    room: "Crafts Room",
    items: [
      { name: "Coconut", quantity: 1 },
      { name: "Cactus Fruit", quantity: 1 },
      { name: "Cave Carrot", quantity: 1 },
      { name: "Red Mushroom", quantity: 1 },
      { name: "Purple Mushroom", quantity: 1 },
      { name: "Maple Syrup", quantity: 1 },
      { name: "Oak Resin", quantity: 1 },
      { name: "Pine Tar", quantity: 1 },
      { name: "Morel", quantity: 1 },
    ],
    items_required: 5,
    reward: "Autumn's Bounty ×5",
    wiki_url: `${WIKI_BASE}/Bundles#Exotic_Foraging_Bundle`,
  },

  // ── Pantry ───────────────────────────────────────────────────────────────────
  {
    name: "Spring Crops Bundle",
    room: "Pantry",
    items: [
      { name: "Parsnip", quantity: 1 },
      { name: "Green Bean", quantity: 1 },
      { name: "Cauliflower", quantity: 1 },
      { name: "Potato", quantity: 1 },
    ],
    items_required: 4,
    reward: "Speed-Gro ×20",
    wiki_url: `${WIKI_BASE}/Bundles#Spring_Crops_Bundle`,
  },
  {
    name: "Summer Crops Bundle",
    room: "Pantry",
    items: [
      { name: "Tomato", quantity: 1 },
      { name: "Hot Pepper", quantity: 1 },
      { name: "Blueberry", quantity: 1 },
      { name: "Melon", quantity: 1 },
    ],
    items_required: 4,
    reward: "Quality Sprinkler ×1",
    wiki_url: `${WIKI_BASE}/Bundles#Summer_Crops_Bundle`,
  },
  {
    name: "Fall Crops Bundle",
    room: "Pantry",
    items: [
      { name: "Corn", quantity: 1 },
      { name: "Eggplant", quantity: 1 },
      { name: "Pumpkin", quantity: 1 },
      { name: "Yam", quantity: 1 },
    ],
    items_required: 4,
    reward: "Bee House ×1",
    wiki_url: `${WIKI_BASE}/Bundles#Fall_Crops_Bundle`,
  },
  {
    name: "Quality Crops Bundle",
    room: "Pantry",
    items: [
      { name: "Parsnip", quantity: 5, quality: "Gold" },
      { name: "Melon", quantity: 5, quality: "Gold" },
      { name: "Pumpkin", quantity: 5, quality: "Gold" },
      { name: "Corn", quantity: 5, quality: "Gold" },
    ],
    items_required: 4,
    reward: "Preserves Jar ×1",
    wiki_url: `${WIKI_BASE}/Bundles#Quality_Crops_Bundle`,
  },
  {
    name: "Animal Bundle",
    room: "Pantry",
    items: [
      { name: "Large Milk", quantity: 1 },
      { name: "Egg", quantity: 1 },
      { name: "Large Egg", quantity: 1 },
      { name: "Large Goat Milk", quantity: 1 },
      { name: "Wool", quantity: 1 },
      { name: "Duck Egg", quantity: 1 },
    ],
    items_required: 6,
    reward: "Milk Pail ×1",
    wiki_url: `${WIKI_BASE}/Bundles#Animal_Bundle`,
  },
  {
    name: "Artisan Bundle",
    room: "Pantry",
    items: [
      { name: "Truffle Oil", quantity: 1 },
      { name: "Cloth", quantity: 1 },
      { name: "Goat Cheese", quantity: 1 },
      { name: "Cheese", quantity: 1 },
      { name: "Honey", quantity: 1 },
      { name: "Jelly", quantity: 1 },
      { name: "Apple", quantity: 1 },
      { name: "Apricot", quantity: 1 },
      { name: "Orange", quantity: 1 },
      { name: "Peach", quantity: 1 },
      { name: "Pomegranate", quantity: 1 },
      { name: "Cherry", quantity: 1 },
    ],
    items_required: 6,
    reward: "Keg ×1",
    wiki_url: `${WIKI_BASE}/Bundles#Artisan_Bundle`,
  },

  // ── Fish Tank ────────────────────────────────────────────────────────────────
  {
    name: "River Fish Bundle",
    room: "Fish Tank",
    items: [
      { name: "Sunfish", quantity: 1 },
      { name: "Catfish", quantity: 1 },
      { name: "Shad", quantity: 1 },
      { name: "Tiger Trout", quantity: 1 },
    ],
    items_required: 4,
    reward: "Bait ×30",
    wiki_url: `${WIKI_BASE}/Bundles#River_Fish_Bundle`,
  },
  {
    name: "Lake Fish Bundle",
    room: "Fish Tank",
    items: [
      { name: "Largemouth Bass", quantity: 1 },
      { name: "Carp", quantity: 1 },
      { name: "Bullhead", quantity: 1 },
      { name: "Sturgeon", quantity: 1 },
    ],
    items_required: 4,
    reward: "Dressed Spinner ×1",
    wiki_url: `${WIKI_BASE}/Bundles#Lake_Fish_Bundle`,
  },
  {
    name: "Ocean Fish Bundle",
    room: "Fish Tank",
    items: [
      { name: "Sardine", quantity: 1 },
      { name: "Tuna", quantity: 1 },
      { name: "Red Snapper", quantity: 1 },
      { name: "Tilapia", quantity: 1 },
    ],
    items_required: 4,
    reward: "Warp Totem: Beach ×5",
    wiki_url: `${WIKI_BASE}/Bundles#Ocean_Fish_Bundle`,
  },
  {
    name: "Night Fishing Bundle",
    room: "Fish Tank",
    items: [
      { name: "Walleye", quantity: 1 },
      { name: "Bream", quantity: 1 },
      { name: "Eel", quantity: 1 },
    ],
    items_required: 3,
    reward: "Small Glow Ring ×1",
    wiki_url: `${WIKI_BASE}/Bundles#Night_Fishing_Bundle`,
  },
  {
    name: "Specialty Fish Bundle",
    room: "Fish Tank",
    items: [
      { name: "Pufferfish", quantity: 1 },
      { name: "Ghostfish", quantity: 1 },
      { name: "Sandfish", quantity: 1 },
      { name: "Woodskip", quantity: 1 },
    ],
    items_required: 4,
    reward: "Copper Pan ×1",
    wiki_url: `${WIKI_BASE}/Bundles#Specialty_Fish_Bundle`,
  },
  {
    name: "Crab Pot Bundle",
    room: "Fish Tank",
    items: [
      { name: "Lobster", quantity: 1 },
      { name: "Crayfish", quantity: 1 },
      { name: "Crab", quantity: 1 },
      { name: "Cockle", quantity: 1 },
      { name: "Mussel", quantity: 1 },
      { name: "Shrimp", quantity: 1 },
      { name: "Snail", quantity: 1 },
      { name: "Periwinkle", quantity: 1 },
      { name: "Oyster", quantity: 1 },
      { name: "Clam", quantity: 1 },
    ],
    items_required: 5,
    reward: "Crab Pot ×3",
    wiki_url: `${WIKI_BASE}/Bundles#Crab_Pot_Bundle`,
  },

  // ── Boiler Room ──────────────────────────────────────────────────────────────
  {
    name: "Blacksmith's Bundle",
    room: "Boiler Room",
    items: [
      { name: "Copper Bar", quantity: 1 },
      { name: "Iron Bar", quantity: 1 },
      { name: "Gold Bar", quantity: 1 },
    ],
    items_required: 3,
    reward: "Furnace ×1",
    wiki_url: `${WIKI_BASE}/Bundles#Blacksmith.27s_Bundle`,
  },
  {
    name: "Geologist's Bundle",
    room: "Boiler Room",
    items: [
      { name: "Quartz", quantity: 1 },
      { name: "Earth Crystal", quantity: 1 },
      { name: "Frozen Tear", quantity: 1 },
      { name: "Fire Quartz", quantity: 1 },
    ],
    items_required: 4,
    reward: "Explosive Ammo ×5",
    wiki_url: `${WIKI_BASE}/Bundles#Geologist.27s_Bundle`,
  },
  {
    name: "Adventurer's Bundle",
    room: "Boiler Room",
    items: [
      { name: "Slime", quantity: 99 },
      { name: "Bat Wing", quantity: 10 },
      { name: "Solar Essence", quantity: 1 },
      { name: "Void Essence", quantity: 1 },
    ],
    items_required: 4,
    reward: "Small Magnet Ring ×1",
    wiki_url: `${WIKI_BASE}/Bundles#Adventurer.27s_Bundle`,
  },

  // ── Bulletin Board ───────────────────────────────────────────────────────────
  {
    name: "Chef's Bundle",
    room: "Bulletin Board",
    items: [
      { name: "Maple Syrup", quantity: 1 },
      { name: "Fiddlehead Fern", quantity: 1 },
      { name: "Truffle", quantity: 1 },
      { name: "Poppy", quantity: 1 },
      { name: "Maki Roll", quantity: 1 },
      { name: "Fried Egg", quantity: 1 },
    ],
    items_required: 6,
    reward: "Pink Cake ×1",
    wiki_url: `${WIKI_BASE}/Bundles#Chef.27s_Bundle`,
  },
  {
    name: "Dye Bundle",
    room: "Bulletin Board",
    items: [
      { name: "Red Mushroom", quantity: 1 },
      { name: "Sea Urchin", quantity: 1 },
      { name: "Sunflower", quantity: 1 },
      { name: "Duck Feather", quantity: 1 },
      { name: "Aquamarine", quantity: 1 },
      { name: "Red Cabbage", quantity: 1 },
    ],
    items_required: 6,
    reward: "Seed Maker ×1",
    wiki_url: `${WIKI_BASE}/Bundles#Dye_Bundle`,
  },
  {
    name: "Field Research Bundle",
    room: "Bulletin Board",
    items: [
      { name: "Purple Mushroom", quantity: 1 },
      { name: "Nautilus Shell", quantity: 1 },
      { name: "Chub", quantity: 1 },
      { name: "Frozen Geode", quantity: 1 },
    ],
    items_required: 4,
    reward: "Recycling Machine ×1",
    wiki_url: `${WIKI_BASE}/Bundles#Field_Research_Bundle`,
  },
  {
    name: "Fodder Bundle",
    room: "Bulletin Board",
    items: [
      { name: "Wheat", quantity: 10 },
      { name: "Hay", quantity: 10 },
      { name: "Apple", quantity: 3 },
    ],
    items_required: 3,
    reward: "Heater ×1",
    wiki_url: `${WIKI_BASE}/Bundles#Fodder_Bundle`,
  },
  {
    name: "Enchanter's Bundle",
    room: "Bulletin Board",
    items: [
      { name: "Oak Resin", quantity: 1 },
      { name: "Wine", quantity: 1 },
      { name: "Rabbit's Foot", quantity: 1 },
      { name: "Pomegranate", quantity: 1 },
    ],
    items_required: 4,
    reward: "Jukebox ×1",
    wiki_url: `${WIKI_BASE}/Bundles#Enchanter.27s_Bundle`,
  },

  // ── Vault ────────────────────────────────────────────────────────────────────
  {
    name: "2,500g Bundle",
    room: "Vault",
    items: [{ name: "Gold", quantity: 2500 }],
    items_required: 1,
    reward: "Chocolate Cake ×3",
    wiki_url: `${WIKI_BASE}/Bundles#2.2C500g_Bundle`,
  },
  {
    name: "5,000g Bundle",
    room: "Vault",
    items: [{ name: "Gold", quantity: 5000 }],
    items_required: 1,
    reward: "Quality Fertilizer ×30",
    wiki_url: `${WIKI_BASE}/Bundles#5.2C000g_Bundle`,
  },
  {
    name: "10,000g Bundle",
    room: "Vault",
    items: [{ name: "Gold", quantity: 10000 }],
    items_required: 1,
    reward: "Lightning Rod ×1",
    wiki_url: `${WIKI_BASE}/Bundles#10.2C000g_Bundle`,
  },
  {
    name: "25,000g Bundle",
    room: "Vault",
    items: [{ name: "Gold", quantity: 25000 }],
    items_required: 1,
    reward: "Iridium Sprinkler ×1",
    wiki_url: `${WIKI_BASE}/Bundles#25.2C000g_Bundle`,
  },
];

/** Case-insensitive substring match on bundle name. */
export function getBundle(query: string): Bundle | null {
  const q = query.toLowerCase();
  return BUNDLES.find((b) => b.name.toLowerCase().includes(q)) ?? null;
}
