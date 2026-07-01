import * as THREE from 'three';
import './style.css';
import { ITEMS, ITEM_ICON, createStack, itemStats } from './data/items.js';
import { RECIPES } from './data/recipes.js';
import { Inventory } from './systems/inventory.js';
import { EnemySystem } from './systems/enemies.js';
import { QuestSystem } from './systems/quests.js';
import { GameAudio } from './systems/audio.js';
import { QUESTS } from './data/quests.js';

const CHUNK_SIZE = 16;
const RENDER_DISTANCE = 2;
const SEA_LEVEL = 4;
const REACH = 6;
const SAVE_KEY = 'blockcraft-world-v4';

const BLOCKS = {
  grass: { name: 'Дёрн', hardness: .55, tool: 'shovel', drop: 'grass', handDrop: true },
  dirt: { name: 'Земля', hardness: .5, tool: 'shovel', drop: 'dirt', handDrop: true },
  stone: { name: 'Камень', hardness: 2.5, tool: 'pickaxe', tier: 1, drop: 'stone' },
  sand: { name: 'Песок', hardness: .45, tool: 'shovel', drop: 'sand', handDrop: true },
  wood: { name: 'Дуб', hardness: 1.4, tool: 'axe', drop: 'wood', handDrop: true },
  leaves: { name: 'Листва', hardness: .25, alpha: true, drop: 'fiber', handDrop: true },
  planks: { name: 'Доски', hardness: 1, tool: 'axe', drop: 'planks', handDrop: true },
  brick: { name: 'Кирпич', hardness: 2, tool: 'pickaxe', tier: 1, drop: 'brick' },
  coal_ore: { name: 'Угольная жила', hardness: 2.6, tool: 'pickaxe', tier: 1, drop: 'coal' },
  iron_ore_block: { name: 'Железная жила', hardness: 3, tool: 'pickaxe', tier: 1, drop: 'iron_ore' },
  silver_ore_block: { name: 'Серебряная жила', hardness: 3.6, tool: 'pickaxe', tier: 2, drop: 'silver_ore' },
  workbench: { name: 'Верстак', hardness: 1.3, tool: 'axe', drop: 'workbench', station: true, handDrop: true },
  campfire: { name: 'Костёр', hardness: .7, tool: 'pickaxe', drop: 'campfire', station: true, handDrop: true, small: true },
  chest: { name: 'Сундук', hardness: 1.2, tool: 'axe', drop: 'chest', station: true, handDrop: true },
  torch: { name: 'Факел', hardness: .1, drop: 'torch', station: true, handDrop: true, torch: true },
  door: { name: 'Дубовая дверь', hardness: 1, tool: 'axe', drop: 'door', station: true, handDrop: true, door: true },
  door_open: { name: 'Открытая дверь', hardness: 1, tool: 'axe', drop: 'door', station: true, handDrop: true, door: true, open: true },
  bedrock: { name: 'Бедрок', hardness: Infinity },
  water: { name: 'Вода', hardness: Infinity, water: true }
};

class BlockCraft {
  constructor() {
    this.container = document.querySelector('#game');
    this.world = new Map();
    this.edits = new Map();
    this.loadedChunks = new Set();
    this.currentChunk = null;
    this.meshes = [];
    this.worldDrops = [];
    this.particles = [];
    this.features = [];
    this.featureGroups = [];
    this.featureObjects = [];
    this.containers = new Map();
    this.campfires = new Map();
    this.inventory = new Inventory();
    this.equipment = { armor: null, shield: null };
    this.selected = 0;
    this.cursorStack = null;
    this.inventoryOpen = false;
    this.journalOpen = false;
    this.senseActive = false;
    this.stationContext = 'hand';
    this.chestContext = null;
    this.keys = new Set();
    this.velocity = new THREE.Vector3();
    this.player = { position: new THREE.Vector3(0, 12, 0), radius: .31, height: 1.78, eye: 1.62, grounded: false };
    this.spawnPoint = new THREE.Vector3(0, 8, 0);
    this.health = 20;
    this.hunger = 20;
    this.weakness = 0;
    this.elixirCooldown = 0;
    this.survivalTimer = 0;
    this.regenTimer = 0;
    this.attackTimer = 0;
    this.timeOfDay = .25;
    this.totalTime = 0;
    this.runStats = { startedAt: Date.now(), deaths: 0, crafted: 0, killed: 0 };
    this.settings = this.loadSettings();
    this.audio = new GameAudio(this.settings.volume);
    this.yaw = 0;
    this.pitch = 0;
    this.playing = false;
    this.hadPointerLock = false;
    this.lookInput = new THREE.Vector2();
    this.lookAccum = new THREE.Vector2();
    this.lastTime = performance.now();
    this.saveTimer = null;
    this.primaryHeld = false;
    this.blocking = false;
    this.mining = null;
    this.textureLoader = new THREE.TextureLoader();
    this.textureCache = new Map();

    this.initScene();
    this.initUI();
    this.bindEvents();
    this.loadOrGenerateWorld();
    this.buildWorldMeshes();
    this.buildFeatureMeshes();
    this.spawnPlayer(this.loadedSave);
    this.renderAllUI();
    this.animate();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x5b6971);
    this.scene.fog = new THREE.Fog(0x697379, 14, 42);
    this.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .06, 120);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .8;
    this.container.append(this.renderer.domElement);

    this.hemi = new THREE.HemisphereLight(0xbfd4e8, 0x3a4530, 1.0);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff4e0, 1.8);
    this.sun.position.set(-22, 36, 18);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 90 });
    this.sun.shadow.bias = -.0007;
    this.scene.add(this.sun, this.sun.target);

    this.sunDisc = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ color: 0xb62b32, fog: false, side: THREE.DoubleSide }));
    this.scene.add(this.sunDisc);

    this.lightPool = Array.from({ length: 8 }, () => {
      const light = new THREE.PointLight(0xffa040, 0, 8, 1.6);
      this.scene.add(light);
      return light;
    });
    this.torchPositions = [];

    this.createClouds();

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 20;
    this.outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.012, 1.012, 1.012)), new THREE.LineBasicMaterial({ color: 0x171717, transparent: true, opacity: .75, depthTest: false }));
    this.outline.visible = false;
    this.outline.renderOrder = 10;
    this.scene.add(this.outline);

    this.heldRoot = new THREE.Group();
    this.heldRoot.position.set(.55, -.5, -1);
    this.camera.add(this.heldRoot);

    this.enemies = new EnemySystem(this.scene, {
      drop: (id, count, position) => this.dropItem(id, count, position),
      killed: (name, type) => {
        this.runStats.killed++;
        this.quest?.event('kill', type);
        this.audio.play('hit');
        this.showToast(`${name} повержен`);
        this.renderQuestUI();
        this.scheduleSave();
      }
    });
  }

  loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('blockcraft-settings-v1')) || {};
      const settings = { sensitivity: .00264, volume: .55, renderDistance: 2, brightness: 1, ...saved };
      if (saved.sensitivity === .0022) settings.sensitivity = .00264; // апгрейд старой базовой чувствительности
      return settings;
    } catch { return { sensitivity: .00264, volume: .55, renderDistance: 2, brightness: 1 }; }
  }

  createClouds() {
    const material = new THREE.MeshLambertMaterial({ color: 0x8d9798, transparent: true, opacity: .72, depthWrite: false });
    this.clouds = new THREE.Group();
    const patterns = [[[0,0],[1,0],[2,0],[1,1],[2,1],[3,0]], [[0,0],[1,0],[2,0],[3,0],[1,1],[2,1]], [[0,0],[1,0],[2,0],[0,1],[1,1]]];
    for (let i = 0; i < 9; i++) {
      const cloud = new THREE.Group();
      for (const [x, z] of patterns[i % patterns.length]) {
        const cube = new THREE.Mesh(new THREE.BoxGeometry(3, .65, 3), material);
        cube.position.set(x * 2.8, 0, z * 2.8);
        cloud.add(cube);
      }
      cloud.position.set(-45 + (i * 17) % 90, 20 + (i % 3) * 2, -38 + (i * 23) % 76);
      this.clouds.add(cloud);
    }
    this.scene.add(this.clouds);
  }

  initUI() {
    for (const id of ['start-screen','pause-screen','hud','crosshair','tooltip','toast','hotbar','region-status','inventory-screen','inventory-grid','craft-list','item-details','container-section','container-grid','mining-progress','health-value','hunger-value','health-fill','hunger-fill','time-status','station-title','journal-screen','journal-content','objective-title','objective-text','objective-progress','compass-arrow','compass-distance','boss-bar','boss-name','boss-fill','damage-flash','victory-screen','victory-stats']) this[this.camel(id)] = document.querySelector(`#${id}`);
    this.equipmentEl = document.querySelector('#equipment');
    this.cursorStackEl = document.querySelector('#cursor-stack');
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('button');
      slot.className = 'slot';
      slot.dataset.slot = i;
      slot.addEventListener('click', () => this.selectSlot(i));
      this.hotbar.append(slot);
    }
  }

  camel(value) { return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase()); }

  bindEvents() {
    document.querySelector('#play-button').addEventListener('click', () => this.lock());
    document.querySelector('#resume-button').addEventListener('click', () => this.lock());
    document.querySelector('#new-world-button').addEventListener('click', () => this.createNewWorld());
    document.querySelector('#menu-new-world-button').addEventListener('click', () => this.createNewWorld());
    document.querySelector('#help-button').addEventListener('click', () => this.toggleHelp(true));
    document.querySelector('#back-button').addEventListener('click', () => this.toggleHelp(false));
    document.querySelector('#inventory-close').addEventListener('click', () => this.closeInventory());
    document.querySelector('#journal-close').addEventListener('click', () => this.closeJournal());
    document.querySelector('#victory-continue').addEventListener('click', () => this.closeVictory());
    const sensitivity = document.querySelector('#setting-sensitivity');
    const volume = document.querySelector('#setting-volume');
    const renderDistance = document.querySelector('#setting-distance');
    const brightness = document.querySelector('#setting-brightness');
    sensitivity.value = this.settings.sensitivity;
    volume.value = this.settings.volume;
    renderDistance.value = this.settings.renderDistance;
    brightness.value = this.settings.brightness;
    sensitivity.addEventListener('input', () => this.updateSetting('sensitivity', Number(sensitivity.value)));
    volume.addEventListener('input', () => this.updateSetting('volume', Number(volume.value)));
    renderDistance.addEventListener('change', () => this.updateSetting('renderDistance', Number(renderDistance.value)));
    brightness.addEventListener('input', () => this.updateSetting('brightness', Number(brightness.value)));

    document.addEventListener('pointerlockchange', () => this.onLockChange());
    document.addEventListener('mousemove', event => {
      if (this.cursorStack) {
        this.cursorStackEl.style.left = `${event.clientX + 12}px`;
        this.cursorStackEl.style.top = `${event.clientY + 12}px`;
      }
      if (!this.playing) return;
      // Копим движение и применяем его раз в кадр (см. updatePlayer). Отсечка
      // выбросов глушит рывок при захвате указателя и пики ускорения мыши ОС,
      // из-за которых сенс «плыл» при зажатой кнопке.
      const MAX = 140;
      this.lookAccum.x += THREE.MathUtils.clamp(event.movementX, -MAX, MAX);
      this.lookAccum.y += THREE.MathUtils.clamp(event.movementY, -MAX, MAX);
    });
    document.addEventListener('keydown', event => {
      if (event.code === 'KeyE') {
        event.preventDefault();
        if (this.journalOpen) return;
        this.inventoryOpen ? this.closeInventory() : this.openInventory();
        return;
      }
      if (event.code === 'KeyJ') {
        event.preventDefault();
        if (this.inventoryOpen) return;
        this.journalOpen ? this.closeJournal() : this.openJournal();
        return;
      }
      if (event.code === 'KeyF' && this.playing) {
        this.senseActive = true;
        this.audio.play('sense');
        return;
      }
      if (event.code === 'Escape' && this.inventoryOpen) { this.closeInventory(); return; }
      if (event.code === 'Escape' && this.journalOpen) { this.closeJournal(); return; }
      if (event.code === 'Escape' && this.playing && document.pointerLockElement !== this.renderer.domElement) { this.pauseGame(); return; }
      this.keys.add(event.code);
      if (event.code.startsWith('Digit')) {
        const slot = Number(event.code.slice(5)) - 1;
        if (slot >= 0 && slot < 9) this.selectSlot(slot);
      }
      if (event.code === 'Space') event.preventDefault();
    });
    document.addEventListener('keyup', event => {
      this.keys.delete(event.code);
      if (event.code === 'KeyF') this.senseActive = false;
    });
    document.addEventListener('wheel', event => {
      if (!this.playing) return;
      this.selectSlot((this.selected + Math.sign(event.deltaY) + 9) % 9);
    }, { passive: true });
    document.addEventListener('mousedown', event => {
      if (!this.playing) return;
      if (event.button === 0) {
        this.tryAttack();
        this.primaryHeld = true;
      }
      if (event.button === 2) this.useSelected();
    });
    document.addEventListener('mouseup', event => {
      if (event.button === 0) { this.primaryHeld = false; this.resetMining(); }
      if (event.button === 2) this.blocking = false;
    });
    document.addEventListener('contextmenu', event => event.preventDefault());
    addEventListener('resize', () => this.onResize());
    addEventListener('beforeunload', () => this.saveWorld());
  }

  lock() {
    this.audio.unlock();
    this.startPlaying();
    try { this.renderer.domElement.requestPointerLock()?.catch(() => {}); } catch {}
  }

  startPlaying() {
    this.playing = true;
    this.inventoryOpen = false;
    this.journalOpen = false;
    this.lookInput.set(0, 0);
    this.lookAccum.set(0, 0);
    this.startScreen.classList.remove('visible');
    this.pauseScreen.classList.remove('visible');
    this.inventoryScreen.classList.remove('visible');
    this.journalScreen.classList.remove('visible');
    this.hud.style.display = 'block';
    this.crosshair.style.display = 'block';
  }

  pauseGame() {
    this.playing = false;
    this.keys.clear();
    this.pauseScreen.classList.add('visible');
    this.hud.style.display = 'none';
    this.crosshair.style.display = 'none';
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    if (key === 'volume') this.audio.setVolume(value);
    if (key === 'renderDistance') {
      this.loadedChunks.clear();
      this.currentChunk = null;
      this.ensureChunksAt(this.worldToChunk(this.player.position.x), this.worldToChunk(this.player.position.z));
    }
    localStorage.setItem('blockcraft-settings-v1', JSON.stringify(this.settings));
  }

  openJournal() {
    if (this.startScreen.classList.contains('visible')) return;
    this.journalOpen = true;
    this.playing = false;
    this.keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    this.hud.style.display = 'none';
    this.crosshair.style.display = 'none';
    this.renderJournal();
    this.journalScreen.classList.add('visible');
  }

  closeJournal() {
    if (!this.journalOpen) return;
    this.journalOpen = false;
    this.journalScreen.classList.remove('visible');
    this.lock();
  }

  onLockChange() {
    const locked = document.pointerLockElement === this.renderer.domElement;
    if (locked) { this.hadPointerLock = true; this.startPlaying(); }
    else if (this.hadPointerLock && !this.inventoryOpen && !this.journalOpen) { this.hadPointerLock = false; this.pauseGame(); }
  }

  toggleHelp(show) {
    document.querySelector('#menu-panel').classList.toggle('hidden', show);
    document.querySelector('#help-panel').classList.toggle('hidden', !show);
  }

  grantStartingKit() {
    const kit = [
      ['silver_sword', 1], ['steel_sword', 1],  ['crossbow', 1],
      ['bolt', 32],        ['bomb', 8],          ['elixir', 8],
      ['cooked_meat', 20], ['torch', 12],        ['workbench', 1],
      ['campfire', 1],     ['iron_pickaxe', 1],  ['wood_axe', 1],
    ];
    for (const [id, count] of kit) this.inventory.add(id, count);
    // Сразу одеваем лучшее
    this.equipment = {
      armor: { id: 'leather_armor', count: 1, durability: 250 },
      shield: { id: 'shield', count: 1, durability: 180 },
    };
    this.skipTutorial();
  }

  skipTutorial() {
    // ВРЕМЕННО (тестовый режим): обучающий квест 'first_fire' отключён в quests.js,
    // поэтому заказ на волков (grey_pack) теперь нулевой. Пропускаем его разведку
    // и следы — сразу ведём к бою с вожаком.
    const s = this.quest?.state;
    if (!s) return;
    if (s.questIndex === 0 && s.stepIndex < 2) {
      s.stepIndex = 2;
      s.progress = 0;
    }
  }

  createNewWorld() {
    localStorage.removeItem(SAVE_KEY);
    this.inventory = new Inventory();
    this.equipment = { armor: null, shield: null };
    this.health = this.hunger = 20;
    this.timeOfDay = .25;
    this.containers.clear(); this.campfires.clear(); this.enemies.clear();
    this.generateWorld(Math.floor(Math.random() * 100000)); // создаёт свежий quest
    this.grantStartingKit(); // выдаёт снаряжение/броню и пропускает обучение уже на новом квесте
    this.buildWorldMeshes(); this.buildFeatureMeshes(); this.spawnPlayer(false); this.renderAllUI();
    this.showToast('Новая сага началась'); this.lock();
  }

  selectSlot(index) {
    this.selected = index;
    this.renderHotbar();
    const stack = this.inventory.get(index);
    if (stack) this.showItem(stack.id);
    this.rebuildHeldItem();
  }

  selectedStack() { return this.inventory.get(this.selected); }
  selectedItem() { const stack = this.selectedStack(); return stack ? ITEMS[stack.id] : null; }

  openInventory(station = null, chestKey = null) {
    if (this.startScreen.classList.contains('visible')) return;
    this.inventoryOpen = true;
    this.playing = false;
    this.keys.clear();
    this.stationContext = station ?? this.nearbyStation() ?? 'hand';
    this.chestContext = chestKey;
    if (document.pointerLockElement) document.exitPointerLock();
    this.hud.style.display = 'none'; this.crosshair.style.display = 'none';
    this.inventoryScreen.classList.add('visible');
    this.renderInventory();
    this.renderCrafting();
  }

  closeInventory() {
    if (!this.inventoryOpen) return;
    if (this.cursorStack) {
      const left = this.inventory.add(this.cursorStack.id, this.cursorStack.count, this.cursorStack.durability);
      if (left) this.dropItem(this.cursorStack.id, left, this.player.position);
      this.cursorStack = null;
    }
    this.inventoryOpen = false;
    this.chestContext = null;
    this.inventoryScreen.classList.remove('visible');
    this.renderAllUI();
    this.lock();
  }

  nearbyStation() {
    if (this.findNearestBlock('workbench', 3.5)) return 'workbench';
    const fire = this.findNearestBlock('campfire', 3.5);
    if (fire && (this.campfires.get(this.key(fire.x, fire.y, fire.z))?.fuel ?? 0) > 0) return 'campfire';
    return 'hand';
  }

  renderAllUI() { this.renderHotbar(); this.renderInventory(); this.renderStatus(); this.renderQuestUI(); this.rebuildHeldItem(); }

  renderQuestUI() {
    if (!this.quest || !this.objectiveTitle) return;
    const quest = this.quest.quest, step = this.quest.step;
    this.objectiveTitle.textContent = this.quest.complete ? 'Сага завершена' : quest.title;
    this.objectiveText.textContent = this.quest.complete ? 'Северные земли открыты для свободной игры.' : step?.text ?? '';
    const needed = step?.count ?? 1;
    this.objectiveProgress.textContent = step && needed > 1 ? `${Math.min(this.quest.state.progress,needed)} / ${needed}` : '';
    const hintEl = document.querySelector('#objective-hint');
    if (hintEl) hintEl.textContent = step?.hint ?? '';
  }

  renderJournal() {
    if (!this.quest || !this.journalContent) return;
    this.journalContent.innerHTML = '';
    QUESTS.forEach((display, questIndex) => {
      if (questIndex > this.quest.state.questIndex) return;
      const section = document.createElement('section');
      const active = questIndex === this.quest.state.questIndex && !this.quest.complete;
      section.className = `journal-contract ${active ? 'active' : 'complete'}`;
      section.innerHTML = `<small>${active ? 'Текущий контракт' : 'Завершено'}</small><h3>${display.title}</h3><p>${display.summary}</p>`;
      display.steps.forEach((step,index) => {
        const state = !active || index < this.quest.state.stepIndex ? 'done' : index === this.quest.state.stepIndex ? 'current' : '';
        section.insertAdjacentHTML('beforeend', `<div class="journal-step ${state}"><i>${state==='done'?'✓':'◆'}</i><span><b>${step.text}</b>${state==='current'?`<small>${step.hint}</small>`:''}</span></div>`);
      });
      this.journalContent.append(section);
    });
    const completed = document.createElement('section');
    completed.className = 'journal-completed';
    completed.innerHTML = `<small>Путь охотника</small><strong>Трофеи: ${this.quest.state.trophies.length} / 3</strong>`;
    this.journalContent.append(completed);
  }

  renderHotbar() {
    [...this.hotbar.children].forEach((element, index) => {
      const stack = this.inventory.get(index);
      element.classList.toggle('selected', index === this.selected);
      element.classList.toggle('rare', stack && ITEMS[stack.id].rarity === 'rare');
      element.innerHTML = stack ? `<em>${index + 1}</em><img src="${ITEM_ICON(stack.id)}" alt=""><b>${stack.count > 1 ? stack.count : ''}</b>${stack.durability != null ? `<span style="--d:${stack.durability / ITEMS[stack.id].durability}"></span>` : ''}` : `<em>${index + 1}</em>`;
    });
  }

  renderInventory() {
    if (!this.inventoryGrid) return;
    this.inventoryGrid.innerHTML = '';
    this.inventory.slots.forEach((stack, index) => this.inventoryGrid.append(this.makeInventorySlot(this.inventory.slots, index, stack)));
    this.equipmentEl.innerHTML = '';
    for (const [slot, label] of [['armor','Доспех'],['shield','Щит']]) {
      const wrap = document.createElement('div');
      wrap.className = 'equip-slot';
      wrap.innerHTML = `<small>${label}</small>`;
      const stack = this.equipment[slot];
      const button = this.makeInventorySlot(null, slot, stack, true);
      button.addEventListener('click', event => { event.stopPropagation(); this.unequip(slot); });
      wrap.append(button); this.equipmentEl.append(wrap);
    }
    this.containerSection.classList.toggle('hidden', !this.chestContext);
    if (this.chestContext) {
      if (!this.containers.has(this.chestContext)) this.containers.set(this.chestContext, Array(18).fill(null));
      const slots = this.containers.get(this.chestContext);
      this.containerGrid.innerHTML = '';
      slots.forEach((stack, index) => this.containerGrid.append(this.makeInventorySlot(slots, index, stack)));
    }
    this.renderCursor();
  }

  makeInventorySlot(source, index, stack, equipment = false) {
    const button = document.createElement('button');
    button.className = `inventory-slot ${stack ? ITEMS[stack.id].rarity : ''}`;
    if (stack) button.innerHTML = `<img src="${ITEM_ICON(stack.id)}" alt=""><b>${stack.count > 1 ? stack.count : ''}</b>${stack.durability != null ? `<span style="--d:${stack.durability / ITEMS[stack.id].durability}"></span>` : ''}`;
    button.title = stack ? ITEMS[stack.id].name : '';
    if (!equipment) {
      button.addEventListener('click', () => this.handleSlotClick(source, index));
      button.addEventListener('contextmenu', event => { event.preventDefault(); this.handleSlotRightClick(source, index); });
    }
    if (stack) button.addEventListener('mouseenter', () => this.showItem(stack.id));
    return button;
  }

  handleSlotClick(source, index) {
    const stack = source[index];
    if (!this.cursorStack) { this.cursorStack = stack; source[index] = null; }
    else if (!stack) { source[index] = this.cursorStack; this.cursorStack = null; }
    else if (stack.id === this.cursorStack.id && ITEMS[stack.id].stack > 1) {
      const move = Math.min(this.cursorStack.count, ITEMS[stack.id].stack - stack.count);
      stack.count += move; this.cursorStack.count -= move;
      if (!this.cursorStack.count) this.cursorStack = null;
    } else { source[index] = this.cursorStack; this.cursorStack = stack; }
    this.renderInventory(); this.renderHotbar();
  }

  handleSlotRightClick(source, index) {
    const stack = source[index];
    if (!stack) return;
    const item = ITEMS[stack.id];
    if (item.action === 'equipArmor' || item.action === 'equipShield') {
      this.equipFrom(source, index, item.action === 'equipArmor' ? 'armor' : 'shield');
      return;
    }
    if (!this.cursorStack && stack.count > 1) {
      const count = Math.ceil(stack.count / 2);
      this.cursorStack = createStack(stack.id, count, stack.durability);
      stack.count -= count;
      if (!stack.count) source[index] = null;
      this.renderInventory(); this.renderHotbar();
    }
  }

  equipFrom(source, index, slot) {
    const next = source[index];
    source[index] = this.equipment[slot];
    this.equipment[slot] = next;
    this.renderInventory(); this.renderHotbar(); this.scheduleSave();
  }

  unequip(slot) {
    const stack = this.equipment[slot];
    if (!stack) return;
    if (!this.inventory.add(stack.id, stack.count, stack.durability)) this.equipment[slot] = null;
    this.renderInventory();
  }

  renderCursor() {
    this.cursorStackEl.innerHTML = this.cursorStack ? `<img src="${ITEM_ICON(this.cursorStack.id)}"><b>${this.cursorStack.count}</b>` : '';
    this.cursorStackEl.classList.toggle('visible', !!this.cursorStack);
  }

  showItem(id) {
    const item = ITEMS[id];
    if (!item || !this.itemDetails) return;
    const recipe = RECIPES.find(entry => entry.output[0] === id);
    const recipeText = recipe ? Object.entries(recipe.ingredients).map(([key, count]) => `${ITEMS[key]?.name ?? key} ×${count}`).join(', ') : 'Добывается в мире';
    this.itemDetails.innerHTML = `<div class="item-heading"><img src="${ITEM_ICON(id)}"><div><small>${item.category}</small><h3>${item.name}</h3></div></div><p>${item.description}</p><strong>${itemStats(id)}</strong><footer>${recipeText}</footer>`;
  }

  renderCrafting() {
    if (!this.craftList) return;
    this.stationTitle.textContent = this.stationContext === 'workbench' ? 'Верстак' : this.stationContext === 'campfire' ? 'Костёр' : 'Ручная работа';
    this.craftList.innerHTML = '';
    const available = RECIPES.filter(entry => entry.station === 'hand' || entry.station === this.stationContext);
    for (const recipe of available) {
      const [id, amount] = recipe.output;
      const can = this.inventory.has(recipe.ingredients);
      const button = document.createElement('button');
      button.className = `recipe ${can ? '' : 'disabled'}`;
      button.innerHTML = `<img src="${ITEM_ICON(id)}"><span><b>${ITEMS[id].name}${amount > 1 ? ` ×${amount}` : ''}</b><small>${Object.entries(recipe.ingredients).map(([key,count]) => `${ITEMS[key].name} ${count}`).join(' · ')}</small></span>`;
      button.addEventListener('mouseenter', () => this.showItem(id));
      button.addEventListener('click', () => this.craft(recipe));
      this.craftList.append(button);
    }
  }

  craft(recipe) {
    if (!this.inventory.has(recipe.ingredients)) { this.showToast('Не хватает материалов'); return; }
    const [id, count] = recipe.output;
    if (this.inventory.add(id, count) > 0) { this.showToast('Рюкзак переполнен'); return; }
    this.inventory.consume(recipe.ingredients);
    this.runStats.crafted += count;
    this.quest?.event('craft', id, count);
    this.audio.play('craft');
    this.showToast(`Создано: ${ITEMS[id].name}${count > 1 ? ` ×${count}` : ''}`);
    this.renderAllUI(); this.renderCrafting(); this.scheduleSave();
  }

  key(x, y, z) { return `${x},${y},${z}`; }
  setBlock(x, y, z, type) { this.world.set(this.key(x, y, z), type); }
  getBlock(x, y, z) { return this.world.get(this.key(x, y, z)); }
  recordEdit(x, y, z, type) { this.edits.set(this.key(x, y, z), type); }

  makeQuestSystem(saved = null) {
    return new QuestSystem(saved, {
      progress: () => this.renderQuestUI(),
      stepComplete: (_quest, completed) => {
        this.audio.play('quest');
        this.showToast(`Выполнено: ${completed.text}`);
      },
      questComplete: (quest, victory) => {
        this.audio.play(victory ? 'victory' : 'quest');
        this.showToast(`Контракт завершён: ${quest.title}`);
        if (victory) this.showVictory();
      },
      changed: () => { this.renderQuestUI(); this.scheduleSave(); }
    });
  }

  generateFeatures(saved = null) {
    if (saved?.length) {
      this.features = saved.map(feature => ({ ...feature, clues: feature.clues ?? [], lit: feature.lit ?? [] }));
      return;
    }
    const jitter = (this.seed % 17) * .012;
    const specs = [
      ['starter_camp', 'Старый охотничий лагерь', 11, -.25 + jitter, false, 0],
      ['wolf_lair', 'Волчье логово', 42, -1.15 + jitter, false, 3],
      ['bog_ruins', 'Затопленные руины', 68, .28 + jitter, true, 4],
      ['old_shrine', 'Заброшенное святилище', 92, 2.05 + jitter, false, 3],
      ['ancient_grove', 'Древняя роща', 122, 3.65 + jitter, false, 0]
    ];
    this.features = specs.map(([id,title,radius,angle,lowland,clueCount]) => {
      const position = this.findFeaturePosition(radius, angle, lowland);
      return { id, title, ...position, clues: Array.from({ length: clueCount }, (_, index) => `${id}-clue-${index}`), lit: [], activated: false };
    });
  }

  findFeaturePosition(radius, angle, lowland) {
    for (let attempt = 0; attempt < 90; attempt++) {
      const r = radius + (attempt % 10) * 2;
      const a = angle + Math.floor(attempt / 10) * .17;
      const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
      const y = this.terrainHeight(x, z, this.seed);
      const neighbors = [this.terrainHeight(x+2,z,this.seed),this.terrainHeight(x-2,z,this.seed),this.terrainHeight(x,z+2,this.seed),this.terrainHeight(x,z-2,this.seed)];
      if (Math.max(...neighbors.map(value => Math.abs(value-y))) <= 2 && (lowland ? y <= SEA_LEVEL + 1 : y > SEA_LEVEL + 1)) return { x, y: y + .5, z };
    }
    const x = Math.round(Math.cos(angle) * radius), z = Math.round(Math.sin(angle) * radius);
    return { x, y: this.terrainHeight(x,z,this.seed) + .5, z };
  }

  feature(id) { return this.features.find(feature => feature.id === id); }

  loadOrGenerateWorld() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || localStorage.getItem('blockcraft-world-v3') || localStorage.getItem('blockcraft-world-v1')); } catch {}
    if ((saved?.version === 4 || saved?.version === 3) && Number.isFinite(saved.seed)) {
      this.loadedSave = true;
      this.seed = saved.seed;
      this.edits = new Map(saved.edits ?? []);
      this.inventory = new Inventory(36, saved.inventory);
      this.equipment = saved.equipment ?? { armor: null, shield: null };
      this.health = saved.stats?.health ?? 20;
      this.hunger = saved.stats?.hunger ?? 20;
      this.timeOfDay = saved.timeOfDay ?? .18;
      this.containers = new Map(saved.containers ?? []);
      this.campfires = new Map(saved.campfires ?? []);
      this.runStats = saved.runStats ?? this.runStats;
      this.quest = this.makeQuestSystem(saved.quest);
      this.skipTutorial();
      this.generateFeatures(saved.features);
      if (saved.spawnPoint) this.spawnPoint.fromArray(saved.spawnPoint);
      this.ensureChunksAt(0, 0, false);
      return;
    }
    this.loadedSave = false;
    const seed = Number.isFinite(saved?.seed) ? saved.seed : 7331;
    if (saved?.version === 2) this.edits = new Map(saved.edits ?? []);
    this.generateWorld(seed);
    this.grantStartingKit();
  }

  saveWorld() {
    const data = {
      version: 4, seed: this.seed, edits: [...this.edits], inventory: this.inventory.serialize(), equipment: this.equipment,
      stats: { health: this.health, hunger: this.hunger }, timeOfDay: this.timeOfDay,
      containers: [...this.containers], campfires: [...this.campfires], spawnPoint: this.spawnPoint.toArray(),
      quest: this.quest?.serialize(), features: this.features, runStats: this.runStats
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {}
  }

  scheduleSave() { clearTimeout(this.saveTimer); this.saveTimer = setTimeout(() => this.saveWorld(), 350); }

  hash(x, z, seed) { const value = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453; return value - Math.floor(value); }
  noise(x, z, seed, scale) {
    const sx = x / scale, sz = z / scale, x0 = Math.floor(sx), z0 = Math.floor(sz), tx = sx - x0, tz = sz - z0;
    const smooth = t => t * t * (3 - 2 * t);
    const a = this.hash(x0,z0,seed), b = this.hash(x0+1,z0,seed), c = this.hash(x0,z0+1,seed), d = this.hash(x0+1,z0+1,seed);
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a,b,smooth(tx)), THREE.MathUtils.lerp(c,d,smooth(tx)), smooth(tz));
  }
  terrainHeight(x, z, seed) { return Math.max(2, Math.floor(2.5 + this.noise(x,z,seed,15)*5 + this.noise(x,z,seed+91,6)*2.8 + Math.sin(x*.14)*Math.cos(z*.12)*.9)); }

  generateWorld(seed) {
    this.seed = seed; this.world.clear(); this.edits.clear(); this.loadedChunks.clear(); this.currentChunk = null;
    this.quest = this.makeQuestSystem();
    this.generateFeatures();
    this.ensureChunksAt(0, 0, false); this.saveWorld();
  }

  worldToChunk(value) { return Math.floor((value + CHUNK_SIZE / 2) / CHUNK_SIZE); }
  chunkKey(cx, cz) { return `${cx},${cz}`; }
  chunkBounds(cx, cz) { const minX = cx * CHUNK_SIZE - CHUNK_SIZE / 2, minZ = cz * CHUNK_SIZE - CHUNK_SIZE / 2; return { minX, maxX: minX + CHUNK_SIZE - 1, minZ, maxZ: minZ + CHUNK_SIZE - 1 }; }

  generateChunkBase(cx, cz) {
    const { minX,maxX,minZ,maxZ } = this.chunkBounds(cx,cz);
    for (let x=minX;x<=maxX;x++) for (let z=minZ;z<=maxZ;z++) {
      const height=this.terrainHeight(x,z,this.seed); this.setBlock(x,0,z,'bedrock');
      for (let y=1;y<=height;y++) {
        let type='stone';
        if (y===height) type=height<=SEA_LEVEL+1?'sand':'grass';
        else if (y>=height-2) type='dirt';
        else {
          const ore=this.hash(x*17+y*5,z*19-y*3,this.seed+818);
          if (y<=4&&ore>.987) type='silver_ore_block';
          else if (y<=8&&ore>.955) type='iron_ore_block';
          else if (y<=11&&ore>.91) type='coal_ore';
        }
        this.setBlock(x,y,z,type);
      }
      for (let y=height+1;y<=SEA_LEVEL;y++) this.setBlock(x,y,z,'water');
    }
  }

  decorateChunk(cx,cz) {
    const bounds=this.chunkBounds(cx,cz);
    for (let x=bounds.minX-2;x<=bounds.maxX+2;x++) for (let z=bounds.minZ-2;z<=bounds.maxZ+2;z++) {
      const height=this.terrainHeight(x,z,this.seed), chance=this.hash(x*3,z*3,this.seed+444);
      if (height>SEA_LEVEL+1&&chance>.975&&Math.hypot(x,z)>5) this.addTreeInChunk(x,height+1,z,chance>.993?5:4,bounds);
    }
  }

  addTreeInChunk(x,y,z,height,bounds) {
    const set=(bx,by,bz,type)=>{ if(bx>=bounds.minX&&bx<=bounds.maxX&&bz>=bounds.minZ&&bz<=bounds.maxZ)this.setBlock(bx,by,bz,type); };
    for(let i=0;i<height;i++)set(x,y+i,z,'wood'); const top=y+height;
    for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=-2;dy<=0;dy++)if(Math.abs(dx)+Math.abs(dz)+Math.abs(dy)<=4&&!(dx===0&&dz===0&&dy<0))set(x+dx,top+dy,z+dz,'leaves');
    set(x,top,z,'leaves');
  }

  ensureChunksAt(cx,cz,rebuild=true) {
    const next=this.chunkKey(cx,cz); if(this.currentChunk===next&&this.loadedChunks.size)return false;
    const distance = this.settings.renderDistance ?? RENDER_DISTANCE;
    const desired=new Set(); for(let dx=-distance;dx<=distance;dx++)for(let dz=-distance;dz<=distance;dz++)desired.add(this.chunkKey(cx+dx,cz+dz));
    for(const key of [...this.loadedChunks])if(!desired.has(key))this.loadedChunks.delete(key);
    for(const key of [...this.world.keys()]){const[x,,z]=key.split(',').map(Number);if(!desired.has(this.chunkKey(this.worldToChunk(x),this.worldToChunk(z))))this.world.delete(key);}
    const missing=[]; for(const key of desired){if(this.loadedChunks.has(key))continue;const[a,b]=key.split(',').map(Number);this.generateChunkBase(a,b);this.loadedChunks.add(key);missing.push([a,b]);}
    for(const pair of missing)this.decorateChunk(...pair);
    for(const[key,type]of this.edits){const[x,,z]=key.split(',').map(Number);if(!desired.has(this.chunkKey(this.worldToChunk(x),this.worldToChunk(z))))continue;if(type===null)this.world.delete(key);else this.world.set(key,type);}
    this.currentChunk=next; if(this.regionStatus)this.regionStatus.textContent=`Земли ${cx} : ${cz}`;
    const centerX=cx*CHUNK_SIZE,centerZ=cz*CHUNK_SIZE;this.sun.position.set(centerX-22,36,centerZ+18);this.sun.target.position.set(centerX,0,centerZ);this.sunDisc.position.set(centerX-34,39,centerZ-48);this.sunDisc.lookAt(centerX,0,centerZ);
    if(rebuild)this.buildWorldMeshes(); return true;
  }

  textureFile(type,variant='side') {
    if(type==='grass')return variant==='top'?'grass_top':variant==='bottom'?'dirt':'grass_side';
    if(type==='wood')return variant==='side'?'wood_side':'wood_top';
    if(type==='door_open')return'door';
    return type;
  }
  getTexture(type,variant='side') {
    const file=this.textureFile(type,variant);if(this.textureCache.has(file))return this.textureCache.get(file);
    const texture=this.textureLoader.load(`${import.meta.env.BASE_URL}textures/blocks/${file}.png`);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());this.textureCache.set(file,texture);return texture;
  }
  createMaterials(type) {
    const data=BLOCKS[type];if(data.water)return new THREE.MeshLambertMaterial({map:this.getTexture(type),transparent:true,opacity:.68,depthWrite:false,side:THREE.DoubleSide});
    const settings={alphaTest:data.alpha ? .25 : 0,transparent:!!data.alpha,side:data.alpha?THREE.DoubleSide:THREE.FrontSide,emissive:data.torch?0x8a3a12:0x000000,emissiveIntensity:data.torch ? .8 : 0};
    const side=new THREE.MeshLambertMaterial({map:this.getTexture(type,'side'),...settings}),top=new THREE.MeshLambertMaterial({map:this.getTexture(type,'top'),...settings}),bottom=new THREE.MeshLambertMaterial({map:this.getTexture(type,'bottom'),...settings});return[side,side,top,bottom,side,side];
  }
  isExposed(x,y,z,type) { return [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].some(([a,b,c])=>{const n=this.getBlock(x+a,y+b,z+c);return!n||BLOCKS[n].water||(type==='water'&&n!=='water');}); }

  buildWorldMeshes() {
    for(const mesh of this.meshes){this.scene.remove(mesh);mesh.geometry.dispose();for(const material of new Set(Array.isArray(mesh.material)?mesh.material:[mesh.material]))material.dispose();}
    this.meshes=[];const grouped={};for(const type of Object.keys(BLOCKS))grouped[type]=[];
    for(const[key,type]of this.world){const[x,y,z]=key.split(',').map(Number);if(this.isExposed(x,y,z,type))grouped[type].push({x,y,z});}
    const matrix=new THREE.Matrix4(),scale=new THREE.Matrix4(),translation=new THREE.Matrix4();
    for(const[type,blocks]of Object.entries(grouped)){if(!blocks.length)continue;const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),this.createMaterials(type),blocks.length);mesh.name=type;mesh.userData.blocks=blocks;mesh.userData.interactive=!BLOCKS[type].water;
      blocks.forEach(({x,y,z},index)=>{translation.makeTranslation(x,y,z);const data=BLOCKS[type];const s=data.torch?[.15,.65,.15]:data.small?[.85,.35,.85]:data.door?[data.open ? .12 : .18,1,.9]:[1,1,1];scale.makeScale(...s);matrix.multiplyMatrices(translation,scale);mesh.setMatrixAt(index,matrix);});
      mesh.castShadow=!BLOCKS[type].water;mesh.receiveShadow=true;if(BLOCKS[type].water)mesh.renderOrder=2;mesh.instanceMatrix.needsUpdate=true;this.scene.add(mesh);this.meshes.push(mesh);
    }
    this.torchPositions = [];
    for (const [key, type] of this.world) {
      if (type !== 'torch' && type !== 'campfire') continue;
      const [x, y, z] = key.split(',').map(Number);
      this.torchPositions.push({ x, y, z, type, key });
    }
  }

  updateLights() {
    if (!this.playing || !this.lightPool) return;
    const px = this.player.position.x, pz = this.player.position.z;
    const active = this.torchPositions
      .filter(p => p.type === 'torch' || (this.campfires.get(p.key)?.fuel ?? 0) > 0)
      .sort((a, b) => Math.hypot(a.x - px, a.z - pz) - Math.hypot(b.x - px, b.z - pz))
      .slice(0, this.lightPool.length);
    this.lightPool.forEach((light, i) => {
      const p = active[i];
      if (p) {
        const isCampfire = p.type === 'campfire';
        const flicker = Math.sin(this.totalTime * 11 + i * 2.3) * 0.12 + Math.sin(this.totalTime * 17 + i) * 0.06;
        light.position.set(p.x, p.y + (isCampfire ? 0.6 : 0.7), p.z);
        light.color.setHex(isCampfire ? 0xff6a10 : 0xffaa30);
        light.distance = isCampfire ? 12 : 8;
        light.intensity = (isCampfire ? 2.8 : 1.4) + flicker;
      } else {
        light.intensity = 0;
      }
    });
  }

  clearFeatureMeshes() {
    for (const group of this.featureGroups) {
      this.scene.remove(group);
      group.traverse(child => { child.geometry?.dispose(); child.material?.dispose(); });
    }
    this.featureGroups = [];
    this.featureObjects = [];
  }

  featureBox(group, size, position, color, emissive = 0x000000) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity: emissive ? .45 : 0 }));
    mesh.position.set(...position);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  }

  buildFeatureMeshes() {
    this.clearFeatureMeshes();
    const clueOffsets = [[-3,0,-2],[2,0,-3],[3,0,2],[-2,0,3]];
    for (const feature of this.features) {
      const group = new THREE.Group();
      group.position.set(feature.x, feature.y, feature.z);
      group.userData.featureId = feature.id;
      if (feature.id === 'starter_camp') {
        this.featureBox(group,[3,.25,3],[0,.12,0],0x493a2c);
        this.featureBox(group,[2,.25,.25],[0,.42,0],0x705033);
        this.featureBox(group,[.25,.25,2],[0,.42,0],0x705033);
      } else if (feature.id === 'wolf_lair') {
        for (const [x,z] of [[-2,-1],[2,-1],[-2,2],[2,2]]) this.featureBox(group,[1.6,1.2,1.4],[x,.5,z],0x4c514b);
        this.featureBox(group,[4,.18,4],[0,.1,0],0x302a25);
      } else if (feature.id === 'bog_ruins') {
        for (const [x,z,h] of [[-3,-2,3],[3,-2,2],[-3,2,2],[3,2,3]]) this.featureBox(group,[.8,h,.8],[x,h/2,z],0x4b514c);
        this.featureBox(group,[7,.25,6],[0,.12,0],0x39443d);
      } else if (feature.id === 'old_shrine') {
        this.featureBox(group,[6,.3,6],[0,.15,0],0x4b4d49);
        for (const x of [-2.3,2.3]) this.featureBox(group,[.6,3,.6],[x,1.5,0],0x555754);
        this.featureBox(group,[2,1,1],[0,.5,0],0x3c3e3b,0x211018);
      } else {
        this.featureBox(group,[9,.35,9],[0,.17,0],0x334131);
        for (const [x,z] of [[-4,-4],[4,-4],[-4,4],[4,4]]) {
          this.featureBox(group,[.8,5,.8],[x,2.5,z],0x3b2b20);
          this.featureBox(group,[2.5,1.8,2.5],[x,5,z],0x263c2c);
        }
        const altar = this.featureBox(group,[2,1.5,2],[0,.75,0],0x414641,0x4e1018);
        altar.userData.interaction = { kind:'bossRitual', featureId:feature.id, id:'leshy-altar' };
        this.featureObjects.push(altar);
      }

      feature.clues.forEach((clueId,index) => {
        const [cx,,cz] = clueOffsets[index % clueOffsets.length];
        // topSolidY возвращает ЦЕНТР верхнего блока; поверхность на +0.5.
        // Улика высотой в 1 блок стоит на поверхности: центр на surface + полвысоты.
        const groundY = this.topSolidY(Math.round(feature.x + cx), Math.round(feature.z + cz));
        const localY = groundY + 0.5 + 0.5 - feature.y;
        const clue = this.featureBox(group,[.55,1.0,.55],[cx, localY, cz],0x6a1b1b,0x7d1010);
        clue.rotation.y = index * .9;
        clue.userData.interaction = { kind:'clue', featureId:feature.id, id:clueId };
        clue.visible = true;
        clue.material.transparent = true;
        clue.material.opacity = 0.05;
        clue.material.toneMapped = false; // иначе ACES-тонмаппинг гасит свечение улики
        this.featureObjects.push(clue);
      });

      if (feature.id === 'old_shrine') {
        [[-2,0,2],[2,0,2],[0,0,-2.4]].forEach(([x,,z],index) => {
          const brazier = this.featureBox(group,[.65,.8,.65],[x,.4,z],0x55462f,feature.lit.includes(index)?0xb94d1e:0x120805);
          brazier.userData.interaction = { kind:'ritual', featureId:feature.id, id:`shrine-fire-${index}`, index };
          this.featureObjects.push(brazier);
        });
      }
      this.scene.add(group);
      this.featureGroups.push(group);
    }
  }

  topSolidY(x,z) { for(let y=28;y>=0;y--){const type=this.getBlock(x,y,z);if(type&&!BLOCKS[type].water&&!BLOCKS[type].open&&type!=='leaves'&&type!=='wood')return y;}return SEA_LEVEL; }
  spawnPlayer(atSaved=true) {
    if(atSaved&&this.spawnPoint.y>0)this.player.position.copy(this.spawnPoint);else this.player.position.set(0,this.topSolidY(0,0)+.51,0);
    this.spawnPoint.copy(this.player.position);this.velocity.set(0,0,0);this.yaw=0;this.pitch=-.12;this.camera.position.copy(this.player.position).add(new THREE.Vector3(0,this.player.eye,0));this.camera.rotation.set(this.pitch,this.yaw,0);
  }

  getTarget(max=REACH) {
    this.raycaster.setFromCamera(new THREE.Vector2(),this.camera);this.raycaster.far=max;
    const hit=this.raycaster.intersectObjects(this.meshes.filter(mesh=>mesh.userData.interactive),false).find(item=>item.distance<=max);
    if(!hit||hit.instanceId==null)return null;const block=hit.object.userData.blocks[hit.instanceId];return{...block,type:hit.object.name,normal:hit.face.normal.clone(),point:hit.point.clone(),distance:hit.distance};
  }

  getFeatureTarget(max = REACH) {
    this.raycaster.setFromCamera(new THREE.Vector2(), this.camera);
    this.raycaster.far = max;
    const hit = this.raycaster.intersectObjects(this.featureObjects, false).find(item => item.distance <= max && item.object.visible);
    return hit ? { mesh: hit.object, ...hit.object.userData.interaction } : null;
  }

  interactFeatureObject() {
    const target = this.getFeatureTarget();
    if (!target) return false;
    const feature = this.feature(target.featureId);
    if (target.kind === 'clue') {
      if (this.quest?.event('clue', target.featureId, 1, { clueId: target.id })) {
        target.mesh.visible = false;
        this.audio.play('quest');
        this.spawnParticles(target.mesh.getWorldPosition(new THREE.Vector3()), 0x9d2020, 8);
        this.scheduleSave();
      } else this.showToast('Эта улика пока не связана с текущей охотой');
      return true;
    }
    if (target.kind === 'ritual') {
      if (!this.isNight()) { this.showToast('Ритуальный огонь отвечает только после заката'); return true; }
      if (feature.lit.includes(target.index)) { this.showToast('Эта чаша уже горит'); return true; }
      if (this.quest?.event('ritual', target.featureId, 1, { isNight: true })) {
        feature.lit.push(target.index);
        target.mesh.material.emissive.setHex(0xb94d1e);
        target.mesh.material.emissiveIntensity = 1.2;
        this.audio.play('fire');
        this.spawnParticles(target.mesh.getWorldPosition(new THREE.Vector3()), 0xe36b2c, 12);
        this.scheduleSave();
      }
      return true;
    }
    if (target.kind === 'bossRitual') {
      if ((this.quest?.state.trophies.length ?? 0) < 3) { this.showToast('Алтарь требует три охотничьих трофея'); return true; }
      if (this.quest?.event('bossRitual', target.featureId)) {
        feature.activated = true;
        target.mesh.material.emissive.setHex(0x991921);
        target.mesh.material.emissiveIntensity = 1.5;
        this.audio.play('quest');
        this.scheduleSave();
      }
      return true;
    }
    return false;
  }

  findNearestBlock(type,radius) {
    const p=this.player.position,r=Math.ceil(radius);for(let x=Math.round(p.x)-r;x<=Math.round(p.x)+r;x++)for(let y=Math.round(p.y)-2;y<=Math.round(p.y)+2;y++)for(let z=Math.round(p.z)-r;z<=Math.round(p.z)+r;z++)if(this.getBlock(x,y,z)===type&&p.distanceTo(new THREE.Vector3(x,y,z))<=radius)return{x,y,z};return null;
  }

  tryAttack() {
    if(this.attackTimer>0)return true;const stack=this.selectedStack(),item=stack?ITEMS[stack.id]:null;
    this.raycaster.setFromCamera(new THREE.Vector2(),this.camera);this.raycaster.far=20;const action=item?.action;
    if(action==='ranged'){
      if(!this.inventory.remove('bolt',1)){this.showToast('Нет болтов');return true;}
      const result=this.enemies.hitFromRay(this.raycaster,this.enemies.rayObjects(),item.damage,stack.id,item.range,item.specterDamage);this.attackTimer=item.cooldown;this.damageSelected();this.swingHeld();if(result){this.audio.play('hit');this.spawnParticles(result.enemy.group.position,0x8d1f22,8);this.showToast(`Урон: ${Math.round(result.dealt)}`);}else this.showToast('Болт ушёл в туман');this.renderAllUI();return true;
    }
    if(action==='weapon'||action==='tool'||!item){
      const damage=(item?.damage??1)*(this.weakness>0 ? .65 : 1);const reach=action==='weapon'?4.2:3.4;
      const result=this.enemies.meleeHit({origin:this.raycaster.ray.origin,direction:this.raycaster.ray.direction,damage,weaponId:stack?.id??'hand',reach,specterDamage:item?.specterDamage});
      if(result){this.attackTimer=item?.cooldown??.5;if(stack?.durability!=null)this.damageSelected();this.swingHeld();this.audio.play('hit');this.spawnParticles(result.enemy.group.position,0x8d1f22,8);return true;}
      if(action==='weapon'){this.attackTimer=item.cooldown;this.swingHeld();return true;}
    }
    return false;
  }

  useSelected() {
    if (this.interactFeatureObject()) return;
    const target=this.getTarget();
    if(target&&(target.type==='door'||target.type==='door_open')){const next=target.type==='door'?'door_open':'door';this.setBlock(target.x,target.y,target.z,next);this.recordEdit(target.x,target.y,target.z,next);this.buildWorldMeshes();this.scheduleSave();return;}
    if(target&&['workbench','chest','campfire'].includes(target.type)){
      const key=this.key(target.x,target.y,target.z);
      if(target.type==='campfire'){
        const stack=this.selectedStack();if(stack&&['wood','coal'].includes(stack.id)){this.consumeSelected(1);const fire=this.campfires.get(key)??{fuel:0};fire.fuel+=stack.id==='coal'?480:240;this.campfires.set(key,fire);this.showToast(`Костёр горит ещё ${Math.ceil(fire.fuel/60)} мин.`);this.scheduleSave();return;}
        const fire=this.campfires.get(key);if(!fire?.fuel){this.showToast('Костру нужно топливо');return;}this.spawnPoint.set(target.x,target.y+.51,target.z+1.2);this.showToast('Место возрождения сохранено');this.openInventory('campfire');return;
      }
      if(target.type==='chest'){this.openInventory('hand',key);return;}this.openInventory('workbench');return;
    }
    const stack=this.selectedStack(),item=stack?ITEMS[stack.id]:null;if(!item){if(this.equipment.shield)this.blocking=true;return;}
    if(item.action==='food'){if(this.hunger>=20){this.showToast('Вы не голодны');return;}this.hunger=Math.min(20,this.hunger+item.food);if(item.risk&&Math.random()<item.risk){this.weakness=20;this.showToast('Сырое мясо отняло силы');}this.consumeSelected();this.renderStatus();return;}
    if(item.action==='heal'){if(this.elixirCooldown>0){this.showToast(`Эликсир: ${Math.ceil(this.elixirCooldown)} сек.`);return;}this.health=Math.min(20,this.health+item.heal);this.elixirCooldown=item.cooldown;this.consumeSelected();this.renderStatus();return;}
    if(item.action==='equipArmor'||item.action==='equipShield'){this.equipFrom(this.inventory.slots,this.selected,item.action==='equipArmor'?'armor':'shield');return;}
    if(item.action==='bomb'){this.throwBomb(item);return;}
    if(item.action==='place'){this.placeBlock(item.block);return;}
    if(this.equipment.shield)this.blocking=true;
  }

  throwBomb(item) {
    this.raycaster.setFromCamera(new THREE.Vector2(),this.camera);const target=this.getTarget(item.range);const center=target?.point??this.camera.position.clone().addScaledVector(this.raycaster.ray.direction,item.range);const hits=this.enemies.explode(center,item.damage,item.radius);this.consumeSelected();this.spawnParticles(center,0xe06a2b,24);this.audio.play('hit');this.showToast(hits?`Бомба задела врагов: ${hits}`:'Бомба рассеялась в тумане');this.renderAllUI();
  }

  consumeSelected(count=1) { const stack=this.selectedStack();if(!stack)return;stack.count-=count;if(stack.count<=0)this.inventory.slots[this.selected]=null;this.renderAllUI();this.scheduleSave(); }
  damageSelected(amount=1) { const id=this.selectedStack()?.id;if(this.inventory.damage(this.selected,amount)){this.showToast(`${ITEMS[id].name} сломан`);}this.renderAllUI(); }

  placeBlock(type) {
    const target=this.getTarget();if(!target)return;const x=target.x+Math.round(target.normal.x),y=target.y+Math.round(target.normal.y),z=target.z+Math.round(target.normal.z);if(this.intersectsPlayerBlock(x,y,z)){this.showToast('Здесь стоит игрок');return;}
    this.setBlock(x,y,z,type);this.recordEdit(x,y,z,type);this.consumeSelected();this.quest?.event('place',type);if(['grass','dirt','stone','sand','wood','leaves','planks','brick','door'].includes(type))this.quest?.event('build',type);const key=this.key(x,y,z);if(type==='campfire')this.campfires.set(key,{fuel:240});if(type==='chest')this.containers.set(key,Array(18).fill(null));this.buildWorldMeshes();this.audio.play(type==='campfire'?'fire':'click');this.scheduleSave();
  }

  updateMining(dt) {
    if(!this.primaryHeld||!this.playing){this.resetMining();return;}const target=this.getTarget();if(!target||target.type==='bedrock'||target.type==='water'){this.resetMining();return;}
    const key=this.key(target.x,target.y,target.z);if(!this.mining||this.mining.key!==key)this.mining={key,progress:0,target};
    const block=BLOCKS[target.type],item=this.selectedItem();let speed=1;if(item?.tool===block.tool)speed=item.speed;else if(block.tool)speed=.38;
    this.mining.progress+=dt*speed/block.hardness;this.miningProgress.style.display='block';this.miningProgress.querySelector('span').style.width=`${Math.min(1,this.mining.progress)*100}%`;
    if(this.mining.progress>=1){this.harvestBlock(target,item);this.resetMining();}
  }

  resetMining() { this.mining=null;if(this.miningProgress)this.miningProgress.style.display='none'; }

  harvestBlock(target,item) {
    const block=BLOCKS[target.type],proper=!block.tool||block.handDrop||(item?.tool===block.tool&&(item.tier??0)>=(block.tier??0));
    this.world.delete(this.key(target.x,target.y,target.z));this.recordEdit(target.x,target.y,target.z,null);
    if(target.type==='leaves'){
      this.collectItem('fiber',1+Math.floor(Math.random()*2));if(Math.random()<.28)this.collectItem('berries',1);
    } else if(target.type==='stone'&&!proper){if(Math.random()<.45)this.collectItem('flint',1);}
    else if(proper&&block.drop)this.collectItem(block.drop,1);
    const key=this.key(target.x,target.y,target.z);this.campfires.delete(key);this.containers.delete(key);
    if(item?.durability!=null)this.damageSelected();this.spawnParticles(new THREE.Vector3(target.x,target.y,target.z),this.blockParticleColor(target.type),7);this.audio.play('mine');this.buildWorldMeshes();this.scheduleSave();
  }

  collectItem(id,count) { const left=this.inventory.add(id,count);const gained=count-left;if(gained>0)this.quest?.event('collect',id,gained);if(left)this.dropItem(id,left,this.player.position);else this.showToast(`Получено: ${ITEMS[id].name} ×${count}`);this.renderAllUI(); }

  dropItem(id,count,position) {
    const left=this.inventory.add(id,count);if(!left){this.renderAllUI();return;}
    const material=new THREE.MeshLambertMaterial({color:this.itemColor(id),emissive:ITEMS[id].rarity==='rare'?0x241625:0});const mesh=new THREE.Mesh(new THREE.BoxGeometry(.28,.28,.28),material);mesh.position.copy(position).add(new THREE.Vector3((Math.random()-.5)*.5,.5,(Math.random()-.5)*.5));this.scene.add(mesh);this.worldDrops.push({id,count:left,mesh,age:0});
  }
  itemColor(id) { if(id.includes('silver'))return 0xb9c5c5;if(id.includes('iron')||id==='steel_sword')return 0x7b8180;if(id==='essence')return 0x694c83;if(id==='berries')return 0x8d263b;if(id.includes('meat'))return 0x8a4939;if(['fiber','hide'].includes(id))return 0x8a7045;return 0x8b6a42; }

  blockParticleColor(type) {
    if (type.includes('silver')) return 0xb5c1c1;
    if (type.includes('iron')) return 0x96735d;
    if (type.includes('coal')) return 0x252929;
    if (type === 'leaves' || type === 'grass') return 0x3f6133;
    if (type === 'wood' || type === 'planks') return 0x76502f;
    return 0x777771;
  }

  spawnParticles(position, color, count = 6) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(.07,.07,.07), new THREE.MeshBasicMaterial({ color }));
      mesh.position.copy(position);
      this.scene.add(mesh);
      this.particles.push({ mesh, life: .45 + Math.random() * .35, velocity: new THREE.Vector3((Math.random()-.5)*2,Math.random()*2,(Math.random()-.5)*2) });
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life -= dt;
      if (particle.smoke) {
        particle.velocity.y *= 1 - dt * 0.4; // всплывает и замедляется, без гравитации
        particle.mesh.material.opacity = Math.max(0, particle.life / particle.maxLife) * 0.5;
      } else {
        particle.velocity.y -= 5 * dt;
      }
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        particle.mesh.geometry.dispose(); particle.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  updateDrops(dt) { for(let i=this.worldDrops.length-1;i>=0;i--){const drop=this.worldDrops[i];drop.age+=dt;drop.mesh.rotation.y+=dt;drop.mesh.position.y+=Math.sin(drop.age*3)*dt*.03;if(drop.mesh.position.distanceTo(this.player.position)<1.5){const left=this.inventory.add(drop.id,drop.count);if(!left){this.scene.remove(drop.mesh);drop.mesh.geometry.dispose();drop.mesh.material.dispose();this.worldDrops.splice(i,1);this.renderAllUI();}else drop.count=left;}} }

  intersectsPlayerBlock(x,y,z) { const p=this.player;return p.position.x+p.radius>x-.5&&p.position.x-p.radius<x+.5&&p.position.z+p.radius>z-.5&&p.position.z-p.radius<z+.5&&p.position.y+p.height>y-.5&&p.position.y<y+.5; }
  isSolid(x,y,z) { const type=this.getBlock(x,y,z);return!!type&&!BLOCKS[type].water&&!BLOCKS[type].open&&!BLOCKS[type].torch&&!BLOCKS[type].small; }

  moveAndCollide(axis,amount) {
    const p=this.player;p.position[axis]+=amount;const minX=Math.floor(p.position.x-p.radius+.5),maxX=Math.floor(p.position.x+p.radius+.5),minY=Math.floor(p.position.y+.501),maxY=Math.floor(p.position.y+p.height+.499),minZ=Math.floor(p.position.z-p.radius+.5),maxZ=Math.floor(p.position.z+p.radius+.5);
    for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++)for(let z=minZ;z<=maxZ;z++){if(!this.isSolid(x,y,z))continue;if(axis==='x'){p.position.x=amount>0?x-.5-p.radius:x+.5+p.radius;this.velocity.x=0;}else if(axis==='z'){p.position.z=amount>0?z-.5-p.radius:z+.5+p.radius;this.velocity.z=0;}else{if(amount>0)p.position.y=y-.5-p.height;else{p.position.y=y+.5;p.grounded=true;}this.velocity.y=0;}}
  }

  updatePlayer(dt) {
    if(!this.playing)return;{const kx=(this.keys.has('ArrowRight')?1:0)-(this.keys.has('ArrowLeft')?1:0),ky=(this.keys.has('ArrowDown')?1:0)-(this.keys.has('ArrowUp')?1:0);if(kx||ky){this.yaw-=kx*1.8*dt;this.pitch=THREE.MathUtils.clamp(this.pitch-ky*1.5*dt,-1.54,1.54);}}
    if(this.lookAccum.x||this.lookAccum.y){this.yaw-=this.lookAccum.x*this.settings.sensitivity;this.pitch=THREE.MathUtils.clamp(this.pitch-this.lookAccum.y*this.settings.sensitivity,-1.54,1.54);this.lookAccum.set(0,0);}
    const input=new THREE.Vector2((this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0),(this.keys.has('KeyW')?1:0)-(this.keys.has('KeyS')?1:0));if(input.lengthSq()>1)input.normalize();const sprint=this.keys.has('ShiftLeft')&&this.hunger>0,speed=sprint?7:5,sin=Math.sin(this.yaw),cos=Math.cos(this.yaw);const tx=(input.x*cos-input.y*sin)*speed,tz=(-input.x*sin-input.y*cos)*speed,accel=this.player.grounded?18:7;this.velocity.x=THREE.MathUtils.damp(this.velocity.x,tx,accel,dt);this.velocity.z=THREE.MathUtils.damp(this.velocity.z,tz,accel,dt);this.velocity.y-=22*dt;if(this.keys.has('Space')&&this.player.grounded){this.velocity.y=8.2;this.player.grounded=false;}this.player.grounded=false;this.moveAndCollide('x',this.velocity.x*dt);this.moveAndCollide('z',this.velocity.z*dt);this.moveAndCollide('y',this.velocity.y*dt);if(sprint&&input.lengthSq())this.hunger=Math.max(0,this.hunger-dt*.045);if(this.player.position.y<-10)this.takeDamage(99);this.camera.position.copy(this.player.position).add(new THREE.Vector3(0,this.player.eye,0));this.camera.rotation.set(this.pitch,this.yaw,0);
    this.ensureChunksAt(this.worldToChunk(this.player.position.x),this.worldToChunk(this.player.position.z));
  }

  updateSurvival(dt) {
    if(!this.playing)return;this.survivalTimer+=dt;this.regenTimer+=dt;this.weakness=Math.max(0,this.weakness-dt);this.elixirCooldown=Math.max(0,this.elixirCooldown-dt);this.attackTimer=Math.max(0,this.attackTimer-dt);
    if(this.survivalTimer>=45){this.survivalTimer-=45;this.hunger=Math.max(0,this.hunger-1);this.renderStatus();}
    if(this.regenTimer>=4){this.regenTimer=0;if(this.hunger>=15&&this.health<20){this.health++;this.hunger=Math.max(0,this.hunger-.4);}else if(this.hunger<=0)this.takeDamage(1);this.renderStatus();}
    for(const fire of this.campfires.values())fire.fuel=Math.max(0,(fire.fuel??0)-dt);
  }

  takeDamage(amount,source=null) {
    let damage=amount;if(this.equipment.armor){damage*=1-(ITEMS[this.equipment.armor.id].armor??0);this.damageEquipment('armor');}
    if(this.blocking&&this.equipment.shield&&source){const forward=new THREE.Vector3(-Math.sin(this.yaw),0,-Math.cos(this.yaw)),toSource=source.clone().sub(this.player.position).setY(0).normalize();if(forward.dot(toSource)>.15){damage*=1-(ITEMS.shield.block??.6);this.damageEquipment('shield');}}
    this.health=Math.max(0,this.health-damage);this.audio.play('hurt');this.damageFlash.classList.remove('active');void this.damageFlash.offsetWidth;this.damageFlash.classList.add('active');this.renderStatus();if(this.health<=0)this.die();
  }
  damageEquipment(slot) { const stack=this.equipment[slot];if(!stack?.durability)return;stack.durability--;if(stack.durability<=0){this.showToast(`${ITEMS[stack.id].name} уничтожен`);this.equipment[slot]=null;} }
  die() { this.inventory.loseResources(.3);this.runStats.deaths++;this.enemies.removeElites();this.health=20;this.hunger=12;this.player.position.copy(this.spawnPoint);this.velocity.set(0,0,0);this.showToast('Вы вернулись к огню, но часть припасов потеряна');this.renderAllUI();this.scheduleSave(); }

  updateDayNight(dt) {
    if(!this.playing)return;this.totalTime+=dt;this.timeOfDay=(this.timeOfDay+dt/480)%1;const daylight=Math.max(.08,Math.sin(this.timeOfDay*Math.PI*2-Math.PI/2)*.5+.5);const b=this.settings.brightness??1;this.sun.intensity=(.2+daylight*3.2)*b;this.hemi.intensity=(.35+daylight*1.65)*b;this.renderer.toneMappingExposure=(0.6+daylight*0.9)*b;const dayColor=new THREE.Color(0x7ab8e8),nightColor=new THREE.Color(0x0e1520);this.scene.background.copy(nightColor).lerp(dayColor,daylight);this.scene.fog.color.copy(this.scene.background);this.timeStatus.textContent=this.isNight()?`☾ Ночь ${this.formatTime()}`:`☼ День ${this.formatTime()}`;
  }
  isNight() { return this.timeOfDay>.67||this.timeOfDay<.08; }
  formatTime() { const minutes=Math.floor(this.timeOfDay*24*60),hours=String(Math.floor(minutes/60)).padStart(2,'0'),mins=String(minutes%60).padStart(2,'0');return`${hours}:${mins}`; }

  nearWater(x,z) { for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)for(let y=SEA_LEVEL-1;y<=SEA_LEVEL;y++)if(this.getBlock(x+dx,y,z+dz)==='water')return true;return false; }
  isSafe(position) { const r=12;for(let x=Math.round(position.x)-r;x<=Math.round(position.x)+r;x++)for(let y=Math.round(position.y)-2;y<=Math.round(position.y)+2;y++)for(let z=Math.round(position.z)-r;z<=Math.round(position.z)+r;z++){const type=this.getBlock(x,y,z),distance=Math.hypot(x-position.x,z-position.z);if(type==='torch'&&distance<=6)return true;if(type==='campfire'&&distance<=12&&(this.campfires.get(this.key(x,y,z))?.fuel??0)>0)return true;}return false; }

  updateEnemies(dt) { if(!this.playing)return;this.enemies.update(dt,{player:this.player.position,isNight:this.isNight(),time:this.totalTime,groundY:(x,z)=>this.topSolidY(x,z),nearWater:(x,z)=>this.nearWater(x,z),isSafe:pos=>this.isSafe(pos),damagePlayer:(damage,pos)=>this.takeDamage(damage,pos),extinguish:(pos,radius)=>this.extinguishNear(pos,radius),eliteHealth:()=>{}}); }

  updateQuestWorld() {
    if (!this.quest || this.quest.complete) { this.updateCompass(); return; }
    this.quest.syncInventory(this.inventory);
    const quest = this.quest.quest, step = this.quest.step, feature = this.feature(quest.feature);
    if (!step || !feature) return;
    const distance = this.player.position.distanceTo(new THREE.Vector3(feature.x,feature.y,feature.z));
    if (step.type === 'visit' && distance < 9) this.quest.event('visit', feature.id);
    if (step.type === 'kill' && distance < 28 && !this.enemies.hasType(step.target)) {
      if (step.target !== 'mourning_wraith' || this.isNight()) {
        const position = new THREE.Vector3(feature.x, feature.y, feature.z);
        if (step.target === 'ancient_leshy') position.y += .2;
        this.enemies.spawn(step.target, position);
        this.showToast(`${this.enemies.enemies.at(-1).def.name} выходит на охоту`);
      }
    }
    this.updateCompass();
  }

  updateCompass() {
    if (!this.quest || !this.compassArrow) return;
    const feature = this.feature(this.quest.quest.feature);
    if (!feature || this.quest.complete) {
      this.compassDistance.textContent = 'Путь свободен';
      this.compassArrow.style.transform = 'rotate(0deg)';
      return;
    }
    const dx = feature.x - this.player.position.x, dz = feature.z - this.player.position.z;
    const localRight = dx * Math.cos(this.yaw) - dz * Math.sin(this.yaw);
    const localFwd  = -dx * Math.sin(this.yaw) - dz * Math.cos(this.yaw);
    const relative = Math.atan2(localRight, localFwd);
    this.compassArrow.style.transform = `rotate(${relative}rad)`;
    const rounded = Math.max(0,Math.round(Math.hypot(dx,dz)/10)*10);
    this.compassDistance.textContent = `${feature.title} · ~${rounded} м`;
  }

  updateSense(dt = 0) {
    document.body.classList.toggle('hunter-sense', this.senseActive && this.playing);
    const pulse = Math.sin(this.totalTime * 4) * 0.45 + 1.35;
    const collected = this.quest?.state?.clues ?? [];
    const smokeSpots = [];
    for (const mesh of this.featureObjects) {
      const interaction = mesh.userData.interaction;
      if (!interaction) continue;
      if (interaction.kind === 'clue') {
        // С чутьём (F) — 100% и ярко пульсируют красным (собранные тускло-серым).
        // Без чутья — почти невидимая «призрачная» текстура (5%).
        const done = collected.includes(interaction.id);
        mesh.visible = true;
        if (mesh.material) {
          mesh.material.emissive.setHex(done ? 0x444444 : 0xff2a14);
          mesh.material.emissiveIntensity = this.senseActive ? (done ? 0.6 : pulse) : 0.35;
          mesh.material.transparent = true;
          mesh.material.opacity = this.senseActive ? (done ? 0.55 : 1) : 0.05;
          mesh.material.depthWrite = this.senseActive && !done;
        }
        if (this.senseActive && !done) smokeSpots.push(mesh);
      } else if (mesh.material?.emissive) {
        mesh.material.emissiveIntensity = this.senseActive ? 1.8 : mesh.material.emissiveIntensity;
      }
    }
    // Лёгкий дымок/аромат над уликами при чутье — поднимается примерно на 1 блок.
    if (this.senseActive && this.playing && smokeSpots.length) {
      this.smokeTimer = (this.smokeTimer ?? 0) - dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = 0.14;
        const wp = new THREE.Vector3();
        for (const mesh of smokeSpots) {
          mesh.getWorldPosition(wp);
          if (wp.distanceTo(this.player.position) > 24) continue;
          this.spawnSmoke(wp.x, wp.y + 0.6, wp.z);
        }
      }
    }
  }

  spawnSmoke(x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(.13, .13, .13),
      new THREE.MeshBasicMaterial({ color: 0xb2503c, transparent: true, opacity: .5, depthWrite: false }));
    mesh.material.toneMapped = false;
    mesh.position.set(x + (Math.random() - .5) * .22, y, z + (Math.random() - .5) * .22);
    this.scene.add(mesh);
    const life = 1.1 + Math.random() * .5;
    this.particles.push({ mesh, life, maxLife: life, smoke: true, velocity: new THREE.Vector3((Math.random() - .5) * .12, .8, (Math.random() - .5) * .12) });
  }

  extinguishNear(position, radius) {
    let changed = false;
    for (const [key,type] of [...this.world]) {
      if (type !== 'torch' && type !== 'campfire') continue;
      const [x,y,z] = key.split(',').map(Number);
      if (Math.hypot(x-position.x,z-position.z) > radius) continue;
      if (type === 'campfire') {
        const fire = this.campfires.get(key);
        if (fire) fire.fuel = 0;
      } else {
        this.world.delete(key); this.recordEdit(x,y,z,null); changed = true;
      }
    }
    if (changed) this.buildWorldMeshes();
  }

  renderBossBar() {
    if (!this.bossBar) return;
    const elite = this.enemies.enemies.find(enemy => enemy.def.elite && enemy.group.position.distanceTo(this.player.position) < 34);
    this.bossBar.classList.toggle('visible', !!elite);
    if (!elite) return;
    this.bossName.textContent = elite.def.name;
    this.bossFill.style.width = `${Math.max(0,elite.health/elite.def.health)*100}%`;
  }

  showVictory() {
    this.playing = false;
    if (document.pointerLockElement) document.exitPointerLock();
    const minutes = Math.max(1,Math.round((Date.now()-this.runStats.startedAt)/60000));
    this.victoryStats.innerHTML = `<div><b>${minutes}</b><span>минут в пути</span></div><div><b>${this.runStats.deaths}</b><span>смертей</span></div><div><b>${this.runStats.crafted}</b><span>создано предметов</span></div><div><b>${this.runStats.killed}</b><span>убито чудовищ</span></div>`;
    this.victoryScreen.classList.add('visible');
    this.hud.style.display = 'none'; this.crosshair.style.display = 'none';
  }

  closeVictory() {
    this.victoryScreen.classList.remove('visible');
    this.lock();
  }

  updateTarget() { if(!this.playing){this.outline.visible=false;return;}const target=this.getTarget();this.outline.visible=!!target;if(target)this.outline.position.set(target.x,target.y,target.z); }

  renderStatus() { if(!this.healthFill)return;this.healthFill.style.width=`${this.health/20*100}%`;this.hungerFill.style.width=`${this.hunger/20*100}%`;this.healthValue.textContent=Math.ceil(this.health);this.hungerValue.textContent=Math.ceil(this.hunger); }
  showToast(message) { this.toast.textContent=message;this.toast.classList.add('show');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>this.toast.classList.remove('show'),1800); }

  rebuildHeldItem() {
    while(this.heldRoot.children.length){const child=this.heldRoot.children.pop();child.geometry?.dispose();child.material?.dispose();}
    const stack=this.selectedStack();if(!stack)return;const item=ITEMS[stack.id],material=new THREE.MeshLambertMaterial({color:this.itemColor(stack.id)});let geometry;
    if(['weapon','tool','ranged'].includes(item.action))geometry=new THREE.BoxGeometry(item.action==='ranged' ? .7 : .16,item.action==='ranged' ? .18 : .85,.14);else if(item.action==='place')geometry=new THREE.BoxGeometry(.38,.38,.38);else geometry=new THREE.BoxGeometry(.28,.28,.18);const mesh=new THREE.Mesh(geometry,material);mesh.rotation.set(-.35,0,-.3);this.heldRoot.add(mesh);
  }
  swingHeld() { if(!this.heldRoot.children.length)return;this.heldRoot.rotation.x=-.9;setTimeout(()=>this.heldRoot.rotation.x=0,130); }

  onResize() { this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(innerWidth,innerHeight); }
  animate() {
    requestAnimationFrame(()=>this.animate());const now=performance.now(),dt=Math.min((now-this.lastTime)/1000,.05);this.lastTime=now;this.updatePlayer(dt);this.updateMining(dt);this.updateSurvival(dt);this.updateDayNight(dt);this.updateQuestWorld();this.updateEnemies(dt);this.updateDrops(dt);this.updateParticles(dt);this.updateSense(dt);this.updateLights();this.updateTarget();this.renderBossBar();this.clouds.position.x=((now*.00035+70)%140)-70;this.renderer.render(this.scene,this.camera);
  }
}

globalThis.blockCraft = new BlockCraft();
