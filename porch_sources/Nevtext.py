import random

# Define possible biome options
biomes = [
    "Tropical Rainforest",
    "Temperate Forest",
    "Taiga",
    "Desert",
    "Grassland",
    "Mountainous Highland",
    "Arctic Tundra",
    "Coastal Marsh",
    "Archipelagic Islands"
]

# Define possible features for each biome
features = {
    "Tropical Rainforest": ["Ancient Ruins", "Mysterious Cave Entrance", "Enchanted Waterfall"],
    "Temperate Forest": ["Hidden Treasure Trove", "Whispering Old Growth Trees", "Elusive Stag"],
    "Taiga": ["Frozen Lake", "Abandoned Lodge", "Northern Lights"],
    "Desert": ["Oasis with a Secret", "Buried Artifact", "Cursed Pyramid"],
    "Grassland": ["Migrating Herds", "Ancient Battlefield", "Witching Hour Circle"],
    "Mountainous Highland": ["Volcanic Crater Lake", "Eternal Snows", "Inaccessible Summit"],
    "Arctic Tundra": ["Frozen Sea with a Hidden Island", "Icicle Forest", "Aurora-lit Iceberg"],
    "Coastal Marsh": ["Sunken Shipwreck", "Mystical Mangrove Grove", "Bioluminescent Bay"],
    "Archipelagic Islands": ["Castaway's Cove", "Volcanic Hot Springs", "Mermaid Song"]
}

# Choose a random biome
random_biome = random.choice(biomes)

# Choose two random features for the biome
chosen_features = random.sample(features[random_biome], 2)

# Create a brief description of the Nevora world
nevora_world_description = f"""
Welcome to {random_biome}, a land of {chosen_features[0]} and {chosen_features[1]}. Legends speak of ancient powers hidden within these unforgiving lands.
"""

print(nevora_world_description)