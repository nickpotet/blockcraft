const block = (name, description, blockType, rarity = 'common') => ({
  name, description, category: 'Строительство', action: 'place', block: blockType, stack: 64, rarity
});

export const ITEMS = {
  grass: block('Дёрн', 'Плотный пласт земли с травой. Подходит для двора и земляных укреплений.', 'grass'),
  dirt: block('Земля', 'Мягкий строительный материал. Можно обжечь в кирпич.', 'dirt'),
  stone: block('Камень', 'Надёжный материал для фундамента, стен и кострища.', 'stone'),
  sand: block('Песок', 'Сыпучий материал с речных берегов.', 'sand'),
  wood: block('Дубовое бревно', 'Прочная древесина для досок, топлива и построек.', 'wood'),
  leaves: block('Листва', 'Живая листва для укрытий и маскировки.', 'leaves'),
  planks: block('Дубовые доски', 'Главный материал для дома, мебели и рукоятей.', 'planks'),
  brick: block('Обожжённый кирпич', 'Прочный негорючий блок для защищённых стен.', 'brick', 'crafted'),

  flint: { name: 'Кремень', category: 'Материал', description: 'Острый каменный осколок для первых инструментов и бомб.', stack: 64, rarity: 'common' },
  fiber: { name: 'Растительное волокно', category: 'Материал', description: 'Крепкие волокна для обмоток, тетивы и кожаной брони.', stack: 64, rarity: 'common' },
  coal: { name: 'Уголь', category: 'Материал', description: 'Долго горит. Нужен для плавки, факелов и взрывчатки.', stack: 64, rarity: 'common' },
  iron_ore: { name: 'Железная руда', category: 'Материал', description: 'Тяжёлая руда. Переплавляется в железо на костре.', stack: 64, rarity: 'crafted' },
  iron_ingot: { name: 'Железный слиток', category: 'Материал', description: 'Основа надёжных инструментов, оружия и фурнитуры.', stack: 64, rarity: 'crafted' },
  silver_ore: { name: 'Серебряная руда', category: 'Материал', description: 'Редкая жила в глубоком камне. Серебро губительно для нечисти.', stack: 64, rarity: 'rare' },
  silver_ingot: { name: 'Серебряный слиток', category: 'Материал', description: 'Холодный металл для оружия против потусторонних тварей.', stack: 64, rarity: 'rare' },
  hide: { name: 'Шкура', category: 'Материал', description: 'Выделанная звериная шкура для доспеха и щита.', stack: 64, rarity: 'crafted' },
  essence: { name: 'Чудовищная эссенция', category: 'Алхимия', description: 'Мерцающий остаток нечисти. Опасный алхимический реагент.', stack: 32, rarity: 'rare' },

  stone_pickaxe: { name: 'Каменная кирка', category: 'Инструмент', description: 'Добывает камень, уголь и железо. Серебряную жилу не возьмёт.', action: 'tool', tool: 'pickaxe', tier: 1, speed: 3.1, damage: 2, durability: 80, stack: 1, rarity: 'crafted' },
  iron_pickaxe: { name: 'Железная кирка', category: 'Инструмент', description: 'Быстро разбивает камень и способна добывать серебро.', action: 'tool', tool: 'pickaxe', tier: 2, speed: 5.2, damage: 3, durability: 220, stack: 1, rarity: 'rare' },
  wood_axe: { name: 'Лесорубный топор', category: 'Инструмент', description: 'Рубит брёвна и доски, а в бою наносит тяжёлый удар.', action: 'tool', tool: 'axe', tier: 1, speed: 4.2, damage: 4, cooldown: .85, durability: 120, stack: 1, rarity: 'crafted' },
  iron_shovel: { name: 'Железная лопата', category: 'Инструмент', description: 'Быстро копает землю, дёрн и песок.', action: 'tool', tool: 'shovel', tier: 1, speed: 5.5, damage: 2, durability: 180, stack: 1, rarity: 'crafted' },

  flint_dagger: { name: 'Кремнёвый нож', category: 'Оружие', description: 'Простой нож из кремня и древка. Первое оружие охотника.', action: 'weapon', damage: 3, cooldown: .45, durability: 90, stack: 1, rarity: 'common' },
  steel_sword: { name: 'Стальной меч', category: 'Оружие', description: 'Сбалансированный клинок против зверей и плотских чудовищ.', action: 'weapon', damage: 7, cooldown: .55, durability: 200, stack: 1, rarity: 'crafted' },
  silver_sword: { name: 'Серебряный меч', category: 'Оружие', description: 'Хрупкий серебряный клинок. Особенно силён против полуночниц.', action: 'weapon', damage: 4, specterDamage: 11, cooldown: .6, durability: 160, stack: 1, rarity: 'rare' },
  crossbow: { name: 'Арбалет', category: 'Оружие', description: 'Бьёт на восемнадцать шагов. Для выстрела нужен болт.', action: 'ranged', damage: 6, range: 18, cooldown: 1.2, durability: 160, stack: 1, rarity: 'rare' },
  bolt: { name: 'Арбалетный болт', category: 'Боеприпас', description: 'Короткий железный болт с деревянным древком.', stack: 64, rarity: 'crafted' },
  bomb: { name: 'Картечная бомба', category: 'Оружие', description: 'Поражает всех чудовищ рядом с целью, не разрушая постройки.', action: 'bomb', damage: 12, range: 10, radius: 4, stack: 16, rarity: 'rare' },
  shield: { name: 'Дубовый щит', category: 'Защита', description: 'В поднятом состоянии поглощает 60% фронтального урона.', action: 'equipShield', block: .6, durability: 180, stack: 1, rarity: 'crafted' },
  leather_armor: { name: 'Кожаный доспех', category: 'Защита', description: 'Лёгкий доспех, уменьшающий любой входящий урон на 20%.', action: 'equipArmor', armor: .2, durability: 250, stack: 1, rarity: 'rare' },

  berries: { name: 'Лесные ягоды', category: 'Еда', description: 'Кислые северные ягоды. Восстанавливают 2 сытости.', action: 'food', food: 2, stack: 32, rarity: 'common' },
  raw_meat: { name: 'Сырое мясо', category: 'Еда', description: 'Даёт 2 сытости, но иногда вызывает краткую слабость.', action: 'food', food: 2, risk: .25, stack: 16, rarity: 'common' },
  cooked_meat: { name: 'Жареное мясо', category: 'Еда', description: 'Сытная горячая пища. Восстанавливает 8 сытости.', action: 'food', food: 8, stack: 16, rarity: 'crafted' },
  jerky: { name: 'Дорожное вяленое мясо', category: 'Еда', description: 'Надёжный запас для долгого пути. Восстанавливает 5 сытости.', action: 'food', food: 5, stack: 32, rarity: 'crafted' },
  elixir: { name: 'Лечебный эликсир', category: 'Алхимия', description: 'Горький отвар, восстанавливающий 8 здоровья. Перезарядка 12 секунд.', action: 'heal', heal: 8, cooldown: 12, stack: 8, rarity: 'rare' },

  workbench: { ...block('Верстак', 'Открывает ремесленные рецепты инструментов, оружия и экипировки.', 'workbench', 'crafted'), stack: 16 },
  campfire: { ...block('Костёр', 'Готовит пищу, плавит руду, отпугивает нечисть и задаёт место возрождения.', 'campfire', 'crafted'), stack: 16 },
  chest: { ...block('Сундук', 'Хранит восемнадцать стаков отдельно от рюкзака.', 'chest', 'crafted'), stack: 16 },
  torch: { ...block('Факел', 'Даёт тёплый свет и мешает чудовищам появляться рядом.', 'torch', 'crafted'), stack: 64 },
  door: { ...block('Дубовая дверь', 'Закрывает вход в дом и открывается правой кнопкой мыши.', 'door', 'crafted'), stack: 16 }
};

export const ITEM_IDS = Object.keys(ITEMS);
export const ITEM_ICON = id => `${import.meta.env.BASE_URL}textures/items/${id}.png`;

export function createStack(id, count = 1, durability = null) {
  const item = ITEMS[id];
  if (!item) return null;
  return { id, count, durability: durability ?? item.durability ?? null };
}

export function itemStats(id) {
  const item = ITEMS[id];
  if (!item) return '';
  const stats = [];
  if (item.damage) stats.push(`Урон: ${item.damage}`);
  if (item.specterDamage) stats.push(`Против нечисти: ${item.specterDamage}`);
  if (item.food) stats.push(`Сытость: +${item.food}`);
  if (item.heal) stats.push(`Здоровье: +${item.heal}`);
  if (item.armor) stats.push(`Защита: ${Math.round(item.armor * 100)}%`);
  if (item.block) stats.push(`Блок: ${Math.round(item.block * 100)}%`);
  if (item.durability) stats.push(`Прочность: ${item.durability}`);
  return stats.join(' · ');
}
