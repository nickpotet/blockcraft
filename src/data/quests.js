export const QUESTS = [
  // ВРЕМЕННО (тестовый режим): вступительный квест 'first_fire' отключён,
  // чтобы первым заданием был сразу заказ на волков. Чтобы вернуть обучение —
  // раскомментируйте блок ниже и поднимите его в начало массива.
  /*
  {
    id: 'first_fire',
    title: 'Первый огонь',
    summary: 'Соберите припасы, изготовьте инструменты и подготовьте безопасный ночлег.',
    feature: 'starter_camp',
    steps: [
      { id: 'wood', text: 'Добудьте 3 дубовых бревна', hint: 'Удерживайте ЛКМ на стволе дерева.', type: 'collect', target: 'wood', count: 3 },
      { id: 'fiber', text: 'Соберите 2 растительных волокна', hint: 'Ломайте листву рукой.', type: 'collect', target: 'fiber', count: 2 },
      { id: 'flint', text: 'Найдите 3 кремня', hint: 'Разбивайте открытый камень рукой.', type: 'collect', target: 'flint', count: 3 },
      { id: 'bench', text: 'Создайте верстак', hint: 'Откройте рюкзак клавишей E: бревно превращается в доски.', type: 'craft', target: 'workbench', count: 1 },
      { id: 'pick', text: 'Создайте каменную кирку', hint: 'Поставьте верстак и используйте его ПКМ.', type: 'craft', target: 'stone_pickaxe', count: 1 },
      { id: 'fire', text: 'Поставьте костёр', hint: 'Рецепт костра доступен у верстака.', type: 'place', target: 'campfire', count: 1 },
      { id: 'shelter', text: 'Поставьте 8 строительных блоков', hint: 'Небольшая стена уже защитит от ночных тварей.', type: 'build', count: 8 }
    ]
  },
  */
  {
    id: 'grey_pack',
    title: 'Вожак серой стаи',
    summary: 'Стая растерзала путников к северу. Найдите логово и приготовьтесь к бою.',
    feature: 'wolf_lair',
    steps: [
      { id: 'reach', text: 'Найдите волчье логово', hint: 'Компас указывает общее направление.', type: 'visit', target: 'wolf_lair', count: 1 },
      { id: 'clues', text: 'Исследуйте 3 волчьих следа', hint: 'Удерживайте F, затем используйте ПКМ на багряных следах.', type: 'clue', target: 'wolf_lair', count: 3 },
      { id: 'alpha', text: 'Одолейте Вожака серой стаи', hint: 'Щит и жареное мясо заметно повысят шансы.', type: 'kill', target: 'alpha_wolf', count: 1 }
    ]
  },
  {
    id: 'marsh_eater',
    title: 'Людоед из трясины',
    summary: 'В затопленных руинах поселилась тварь, утаскивающая охотников под воду.',
    feature: 'bog_ruins',
    steps: [
      { id: 'reach', text: 'Доберитесь до затопленных руин', hint: 'Ищите низину и воду на востоке.', type: 'visit', target: 'bog_ruins', count: 1 },
      { id: 'clues', text: 'Исследуйте 4 улики в трясине', hint: 'Чутьё охотника на F выделяет останки и следы.', type: 'clue', target: 'bog_ruins', count: 4 },
      { id: 'prepare', text: 'Подготовьте арбалет или бомбу', hint: 'Оба рецепта доступны у верстака.', type: 'haveAny', targets: ['crossbow', 'bomb'], count: 1 },
      { id: 'eater', text: 'Убейте Болотного людоеда', hint: 'Не стойте в воде и атакуйте после его рывка.', type: 'kill', target: 'bog_eater', count: 1 }
    ]
  },
  {
    id: 'weeping_wraith',
    title: 'Плачущая полуночница',
    summary: 'Заброшенное святилище тревожит окрестности плачем после заката.',
    feature: 'old_shrine',
    steps: [
      { id: 'reach', text: 'Найдите заброшенное святилище', hint: 'Полуночница появляется только ночью.', type: 'visit', target: 'old_shrine', count: 1 },
      { id: 'clues', text: 'Исследуйте 3 знака у святилища', hint: 'Ищите надломленные руны с помощью чутья.', type: 'clue', target: 'old_shrine', count: 3 },
      { id: 'silver', text: 'Создайте серебряный меч', hint: 'Серебро залегает глубоко; нужна железная кирка.', type: 'have', target: 'silver_sword', count: 1 },
      { id: 'braziers', text: 'Зажгите 3 ритуальных огня ночью', hint: 'Используйте ПКМ на чашах после заката.', type: 'ritual', target: 'old_shrine', count: 3, night: true },
      { id: 'wraith', text: 'Упокойте Плачущую полуночницу', hint: 'Не выходите из освещённого круга.', type: 'kill', target: 'mourning_wraith', count: 1 }
    ]
  },
  {
    id: 'ancient_leshy',
    title: 'Сердце древнего леса',
    summary: 'Три трофея откроют путь к хозяину чащи — Древнему лешему.',
    feature: 'ancient_grove',
    steps: [
      { id: 'reach', text: 'Найдите древнюю рощу', hint: 'Роща лежит дальше всех известных земель.', type: 'visit', target: 'ancient_grove', count: 1 },
      { id: 'ritual', text: 'Поместите три трофея на алтарь', hint: 'Используйте ПКМ на центральном рунном камне.', type: 'bossRitual', target: 'ancient_grove', count: 1 },
      { id: 'leshy', text: 'Убейте Древнего лешего', hint: 'Серебро и картечные бомбы особенно эффективны.', type: 'kill', target: 'ancient_leshy', count: 1 }
    ]
  }
];

export const questById = id => QUESTS.find(quest => quest.id === id);
