"""Batch 5: Sōzō structures (3D dioramas rendered by render3d/structures.ts)."""

STRUCTURES = [
    # reference id, Sōzō name, biome, size, contains
    ("village_plains", "Meadow Village", "Plains, meadows", "Large", "Cottages, a well, farms; chests with food and tools"),
    ("village_taiga", "Taiga Village", "Taiga", "Large", "Log cabins and pine trees; chests with food and tools"),
    ("village_snowy", "Snowy Village", "Snowy plains", "Large", "Snow-roofed cabins; chests with food and tools"),
    ("village_savanna", "Savanna Village", "Savanna", "Large", "Thatched huts and acacia trees; chests with food and tools"),
    ("village_desert", "Desert Village", "Desert", "Large", "Sandstone houses and cactus; chests with food and tools"),
    ("forest_abandoned_camp", "Camp", "Most land biomes", "Small", "A tent, campfire and a Chest with supplies"),
    ("swamp_hut", "Swamp Hut", "Swamp", "Small", "A hut on stilts; home to a Witch"),
    ("jungle_pyramid", "Jungle Temple", "Jungle", "Medium", "Mossy stepped temple; treasure Chest"),
    ("desert_pyramid", "Desert Temple", "Desert", "Medium", "Sandstone temple with towers; treasure Chest"),
    ("igloo", "Igloo", "Snowy plains", "Small", "A snow dome with a bed and a Chest"),
    ("mineshaft", "Mineshaft", "Underground", "Large", "Timber-braced tunnels, rails and Carts with Chests"),
    ("mineshaft_mesa", "Badlands Mineshaft", "Badlands", "Large", "Mineshaft dug into red badlands rock"),
    ("trail_ruins", "Old Ruins", "Forests, taiga", "Medium", "Crumbling brick walls and pillars; Painted Pots"),
    ("buried_treasure", "Buried Treasure", "Beaches", "Small", "A Chest buried in the sand; found with a Map"),
    ("shipwreck", "Shipwreck", "Oceans", "Medium", "A sunken boat; Chests with maps and supplies"),
    ("shipwreck_beached", "Beached Shipwreck", "Beaches", "Medium", "A wrecked boat run aground; Chests"),
    ("ocean_ruin_cold", "Cold Ocean Ruins", "Cold oceans", "Medium", "Sunken stone ruins with kelp; a Chest"),
    ("ocean_ruin_warm", "Warm Ocean Ruins", "Warm oceans", "Medium", "Sunken sandstone ruins with coral; a Chest"),
]

STRUCTURE_FOLD = "_abandoned_camp"  # every biome camp folds into "Camp"
