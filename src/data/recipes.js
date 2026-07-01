export const RECIPES = [
  { id: 'planks', output: ['planks', 4], ingredients: { wood: 1 }, station: 'hand' },
  { id: 'workbench', output: ['workbench', 1], ingredients: { planks: 4, fiber: 2 }, station: 'hand' },

  { id: 'flint_dagger', output: ['flint_dagger', 1], ingredients: { flint: 2, fiber: 1 }, station: 'hand' },
  { id: 'stone_pickaxe', output: ['stone_pickaxe', 1], ingredients: { flint: 3, planks: 2, fiber: 1 }, station: 'workbench' },
  { id: 'iron_pickaxe', output: ['iron_pickaxe', 1], ingredients: { iron_ingot: 3, planks: 2 }, station: 'workbench' },
  { id: 'wood_axe', output: ['wood_axe', 1], ingredients: { flint: 3, planks: 2, fiber: 1 }, station: 'workbench' },
  { id: 'iron_shovel', output: ['iron_shovel', 1], ingredients: { iron_ingot: 1, planks: 2 }, station: 'workbench' },
  { id: 'steel_sword', output: ['steel_sword', 1], ingredients: { iron_ingot: 2, planks: 1, hide: 1 }, station: 'workbench' },
  { id: 'silver_sword', output: ['silver_sword', 1], ingredients: { silver_ingot: 2, planks: 1, essence: 1 }, station: 'workbench' },
  { id: 'crossbow', output: ['crossbow', 1], ingredients: { planks: 3, iron_ingot: 2, fiber: 2 }, station: 'workbench' },
  { id: 'bolt', output: ['bolt', 8], ingredients: { iron_ingot: 1, planks: 1 }, station: 'workbench' },
  { id: 'bomb', output: ['bomb', 2], ingredients: { coal: 2, flint: 1, essence: 1, fiber: 1 }, station: 'workbench' },
  { id: 'shield', output: ['shield', 1], ingredients: { planks: 6, iron_ingot: 1, hide: 1 }, station: 'workbench' },
  { id: 'leather_armor', output: ['leather_armor', 1], ingredients: { hide: 6, fiber: 2, iron_ingot: 1 }, station: 'workbench' },
  { id: 'chest', output: ['chest', 1], ingredients: { planks: 8 }, station: 'workbench' },
  { id: 'door', output: ['door', 1], ingredients: { planks: 6 }, station: 'workbench' },
  { id: 'torch', output: ['torch', 4], ingredients: { coal: 1, planks: 1, fiber: 1 }, station: 'workbench' },
  { id: 'campfire', output: ['campfire', 1], ingredients: { wood: 4, stone: 3, flint: 1 }, station: 'workbench' },

  { id: 'iron_ingot', output: ['iron_ingot', 1], ingredients: { iron_ore: 1, coal: 1 }, station: 'campfire' },
  { id: 'silver_ingot', output: ['silver_ingot', 1], ingredients: { silver_ore: 1, coal: 1 }, station: 'campfire' },
  { id: 'cooked_meat', output: ['cooked_meat', 1], ingredients: { raw_meat: 1 }, station: 'campfire' },
  { id: 'jerky', output: ['jerky', 2], ingredients: { raw_meat: 2, coal: 1 }, station: 'campfire' },
  { id: 'elixir', output: ['elixir', 1], ingredients: { berries: 3, essence: 1 }, station: 'campfire' },
  { id: 'brick', output: ['brick', 2], ingredients: { dirt: 2, coal: 1 }, station: 'campfire' }
];

export const recipeFor = id => RECIPES.find(recipe => recipe.output[0] === id);
