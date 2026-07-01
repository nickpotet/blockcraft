import * as THREE from 'three';

export const ENEMY_TYPES = {
  wolf: { name: 'Волк', health: 16, damage: 2, speed: 3.7, reach: 1.25, cooldown: 1.05, color: 0x615d55 },
  bogling: { name: 'Болотник', health: 24, damage: 3, speed: 2.15, reach: 1.35, cooldown: 1.35, color: 0x415b42 },
  wraith: { name: 'Полуночница', health: 20, damage: 4, speed: 2.7, reach: 1.55, cooldown: 1.5, color: 0x9aa4a5, specter: true },
  alpha_wolf: { name: 'Вожак серой стаи', health: 40, damage: 4, speed: 4.1, reach: 1.45, cooldown: .9, color: 0x3d3935, elite: true, model: 'wolf' },
  bog_eater: { name: 'Болотный людоед', health: 65, damage: 6, speed: 2.45, reach: 1.6, cooldown: 1.15, color: 0x293f32, elite: true, model: 'bogling' },
  mourning_wraith: { name: 'Плачущая полуночница', health: 55, damage: 7, speed: 3.15, reach: 1.8, cooldown: 1.25, color: 0xabb6bc, specter: true, elite: true, model: 'wraith' },
  ancient_leshy: { name: 'Древний леший', health: 160, damage: 9, speed: 2.5, reach: 2.1, cooldown: 1.05, color: 0x27382b, elite: true, boss: true, model: 'leshy' }
};

function cube(group, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

function makeWolf(material) {
  const group = new THREE.Group();
  cube(group, [1.15, .65, .52], [0, .7, 0], material);
  cube(group, [.52, .55, .52], [0, 1.05, -.55], material);
  cube(group, [.13, .28, .13], [-.17, 1.42, -.56], material);
  cube(group, [.13, .28, .13], [.17, 1.42, -.56], material);
  for (const x of [-.38, .38]) for (const z of [-.18, .2]) cube(group, [.16, .6, .16], [x, .32, z], material);
  cube(group, [.13, .13, .55], [0, .92, .5], material).rotation.x = -.45;
  return group;
}

function makeBogling(material) {
  const group = new THREE.Group();
  cube(group, [.8, 1.15, .5], [0, .9, 0], material);
  cube(group, [.62, .55, .55], [0, 1.65, 0], material);
  cube(group, [.2, 1.0, .2], [-.55, .95, 0], material).rotation.z = -.2;
  cube(group, [.2, 1.0, .2], [.55, .95, 0], material).rotation.z = .2;
  cube(group, [.24, .72, .24], [-.23, .28, 0], material);
  cube(group, [.24, .72, .24], [.23, .28, 0], material);
  return group;
}

function makeWraith(material) {
  const group = new THREE.Group();
  cube(group, [.72, .78, .4], [0, 1.35, 0], material);
  cube(group, [.48, .5, .46], [0, 1.95, 0], material);
  cube(group, [.18, .85, .18], [-.48, 1.25, 0], material).rotation.z = -.35;
  cube(group, [.18, .85, .18], [.48, 1.25, 0], material).rotation.z = .35;
  cube(group, [.48, .7, .35], [0, .65, 0], material).rotation.z = .12;
  return group;
}

function makeLeshy(material) {
  const group = new THREE.Group();
  cube(group, [1.25, 2.1, .8], [0, 1.55, 0], material);
  cube(group, [.85, .8, .75], [0, 2.85, 0], material);
  cube(group, [.24, 1.9, .24], [-.85, 1.55, 0], material).rotation.z = -.28;
  cube(group, [.24, 1.9, .24], [.85, 1.55, 0], material).rotation.z = .28;
  cube(group, [.32, 1.25, .32], [-.36, .52, 0], material);
  cube(group, [.32, 1.25, .32], [.36, .52, 0], material);
  const antlerA = cube(group, [.18, 1.25, .18], [-.3, 3.65, 0], material); antlerA.rotation.z = -.45;
  const antlerB = cube(group, [.18, 1.25, .18], [.3, 3.65, 0], material); antlerB.rotation.z = .45;
  cube(group, [.6, .16, .16], [-.68, 4.02, 0], material).rotation.z = -.2;
  cube(group, [.6, .16, .16], [.68, 4.02, 0], material).rotation.z = .2;
  return group;
}

export class EnemySystem {
  constructor(scene, callbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.enemies = [];
    this.spawnTimer = 2;
    this.id = 0;
  }

  spawn(type, position) {
    const def = ENEMY_TYPES[type];
    const material = new THREE.MeshLambertMaterial({
      color: def.color,
      emissive: def.specter ? 0x28343b : 0x000000,
      transparent: !!def.specter,
      opacity: def.specter ? .78 : 1
    });
    const model = def.model ?? type;
    const group = model === 'wolf' ? makeWolf(material) : model === 'bogling' ? makeBogling(material) : model === 'leshy' ? makeLeshy(material) : makeWraith(material);
    if (def.elite && !def.boss) group.scale.setScalar(1.25);
    group.position.copy(position);
    group.userData.enemyId = ++this.id;
    const enemy = { id: this.id, type, def, group, material, health: def.health, attackTimer: 0, hitFlash: 0, phase: Math.random() * 6, summoned: false, enraged: false, specialTimer: 5 };
    group.traverse(child => child.userData.enemy = enemy);
    this.scene.add(group);
    this.enemies.push(enemy);
    return enemy;
  }

  clear() {
    for (const enemy of this.enemies) this.dispose(enemy);
    this.enemies = [];
  }

  dispose(enemy) {
    this.scene.remove(enemy.group);
    enemy.group.traverse(child => {
      child.geometry?.dispose();
      child.material?.dispose();
    });
  }

  trySpawn(context) {
    if (this.enemies.length >= 8) return;
    const night = context.isNight;
    const roll = Math.random();
    let type = 'wolf';
    if (night && roll > .72) type = 'wraith';
    else if (night && roll > .35) type = 'bogling';
    else if (!night && roll > .42) return;
    const angle = Math.random() * Math.PI * 2;
    const radius = 18 + Math.random() * 10;
    const x = Math.round(context.player.x + Math.cos(angle) * radius);
    const z = Math.round(context.player.z + Math.sin(angle) * radius);
    const y = context.groundY(x, z) + .5;
    if (!Number.isFinite(y) || context.isSafe(new THREE.Vector3(x, y, z))) return;
    if (type === 'bogling' && !context.nearWater(x, z)) return;
    this.spawn(type, new THREE.Vector3(x, y, z));
  }

  update(dt, context) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 3.5 + Math.random() * 2;
      this.trySpawn(context);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const pos = enemy.group.position;
      const toPlayer = new THREE.Vector3(context.player.x - pos.x, 0, context.player.z - pos.z);
      const distance = toPlayer.length();
      if (distance > 52 || (!context.isNight && (enemy.type === 'wraith' || enemy.type === 'mourning_wraith'))) {
        this.dispose(enemy); this.enemies.splice(i, 1); continue;
      }
      enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
      enemy.specialTimer = Math.max(0, enemy.specialTimer - dt);
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      if (enemy.material) enemy.material.emissive.setHex(enemy.hitFlash > 0 ? 0xff2a1c : (enemy.def.specter ? 0x28343b : 0x000000));
      const fleeing = !enemy.def.elite && context.isSafe(pos);
      if (enemy.type === 'alpha_wolf' && enemy.health <= 20 && !enemy.summoned) {
        enemy.summoned = true;
        this.spawn('wolf', pos.clone().add(new THREE.Vector3(2,0,1)));
        this.spawn('wolf', pos.clone().add(new THREE.Vector3(-2,0,-1)));
      }
      if (enemy.type === 'mourning_wraith' && enemy.health <= 28 && !enemy.summoned) {
        enemy.summoned = true;
        this.spawn('wraith', pos.clone().add(new THREE.Vector3(2,0,0)));
        this.spawn('wraith', pos.clone().add(new THREE.Vector3(-2,0,0)));
      }
      if (enemy.type === 'ancient_leshy') {
        if (enemy.health <= 110 && !enemy.summoned) {
          enemy.summoned = true;
          this.spawn('wolf', pos.clone().add(new THREE.Vector3(3,0,2)));
          this.spawn('wolf', pos.clone().add(new THREE.Vector3(-3,0,-2)));
        }
        if (enemy.health <= 55) enemy.enraged = true;
        if (enemy.specialTimer <= 0 && distance < 9) {
          enemy.specialTimer = enemy.enraged ? 3 : 5;
          context.damagePlayer(enemy.enraged ? 6 : 4, pos);
          context.extinguish?.(pos, 12);
        }
      }
      if (enemy.type === 'bog_eater' && enemy.specialTimer <= 0) {
        enemy.specialTimer = 6;
        pos.add(new THREE.Vector3((Math.random()-.5)*6,0,(Math.random()-.5)*6));
      }
      const aggroRange = (enemy.type === 'wolf' || enemy.type === 'alpha_wolf') ? 8.5 : (enemy.def.boss ? 24 : 17);
      if (distance < aggroRange || fleeing) {
        const direction = distance ? toPlayer.normalize() : new THREE.Vector3(1, 0, 0);
        if (fleeing) direction.multiplyScalar(-1);
        if (distance > enemy.def.reach || fleeing) {
          const speed = enemy.def.speed * (fleeing ? 1.3 : enemy.enraged ? 1.35 : 1);
          pos.addScaledVector(direction, speed * dt);
          const ground = context.groundY(Math.round(pos.x), Math.round(pos.z));
          if (Number.isFinite(ground)) pos.y = ground + .5 + (enemy.type === 'wraith' ? .7 + Math.sin(context.time * 3 + enemy.phase) * .15 : 0);
          enemy.group.rotation.y = Math.atan2(direction.x, direction.z);
        } else if (!fleeing && enemy.attackTimer <= 0) {
          enemy.attackTimer = enemy.def.cooldown;
          context.damagePlayer(enemy.def.damage, pos);
        }
      } else {
        enemy.group.rotation.y += Math.sin(context.time + enemy.phase) * dt * .25;
      }
      if (enemy.def.elite) context.eliteHealth?.(enemy);
    }
  }

  damageEnemy(enemy, damage, weaponId, direction, specterDamage = null) {
    let dealt = damage;
    if (enemy.def.specter) dealt = weaponId === 'silver_sword' ? (specterDamage ?? damage) : damage * .4;
    if (enemy.type === 'ancient_leshy' && weaponId === 'silver_sword') dealt *= 1.4;
    enemy.health -= dealt;
    enemy.hitFlash = .18;
    if (direction) enemy.group.position.addScaledVector(direction, .4);
    if (enemy.health <= 0) this.kill(enemy);
    return { enemy, dealt };
  }

  hitFromRay(raycaster, objects, damage, weaponId, maxDistance = 3, specterDamage = null) {
    const hits = raycaster.intersectObjects(objects, true);
    const hit = hits.find(candidate => candidate.distance <= maxDistance && candidate.object.userData.enemy);
    if (!hit) return null;
    return this.damageEnemy(hit.object.userData.enemy, damage, weaponId, raycaster.ray.direction, specterDamage);
  }

  // Конусное попадание в ближнем бою: легче попасть по мелким моделям врагов,
  // чем точным лучом. Выбирает ближайшего врага в пределах досягаемости и угла взгляда.
  meleeHit({ origin, direction, damage, weaponId, reach = 4, specterDamage = null }) {
    let best = null, bestScore = -Infinity;
    for (const enemy of this.enemies) {
      const center = enemy.group.position.clone();
      center.y += .8;
      const to = center.sub(origin);
      const distance = to.length();
      if (distance > reach + .6) continue;
      const aim = to.normalize().dot(direction);
      if (aim < .5) continue;
      const score = aim * 2 - distance / reach;
      if (score > bestScore) { bestScore = score; best = enemy; }
    }
    if (!best) return null;
    return this.damageEnemy(best, damage, weaponId, direction, specterDamage);
  }

  explode(center, damage, radius) {
    let hits = 0;
    for (const enemy of [...this.enemies]) {
      const distance = enemy.group.position.distanceTo(center);
      if (distance > radius) continue;
      const vulnerability = enemy.type === 'ancient_leshy' ? 1.5 : 1;
      enemy.health -= damage * vulnerability * (1 - distance / (radius * 1.5));
      hits++;
      if (enemy.health <= 0) this.kill(enemy);
    }
    return hits;
  }

  kill(enemy) {
    const position = enemy.group.position.clone();
    if (enemy.type === 'wolf' || enemy.type === 'alpha_wolf') {
      this.callbacks.drop('raw_meat', enemy.type === 'alpha_wolf' ? 3 : 1 + (Math.random() > .55 ? 1 : 0), position);
      if (enemy.type === 'alpha_wolf' || Math.random() > .35) this.callbacks.drop('hide', enemy.type === 'alpha_wolf' ? 3 : 1, position);
    } else if (enemy.type === 'bogling' || enemy.type === 'bog_eater') {
      if (enemy.type === 'bog_eater' || Math.random() > .45) this.callbacks.drop('essence', enemy.type === 'bog_eater' ? 3 : 1, position);
    } else if (enemy.type === 'wraith' || enemy.type === 'mourning_wraith') {
      this.callbacks.drop('essence', 1 + (Math.random() > .65 ? 1 : 0), position);
    }
    this.dispose(enemy);
    const index = this.enemies.indexOf(enemy);
    if (index >= 0) this.enemies.splice(index, 1);
    this.callbacks.killed(enemy.def.name, enemy.type);
  }

  rayObjects() { return this.enemies.map(enemy => enemy.group); }

  hasType(type) { return this.enemies.some(enemy => enemy.type === type); }

  removeElites() {
    for (const enemy of [...this.enemies]) {
      if (!enemy.def.elite) continue;
      this.dispose(enemy);
      this.enemies.splice(this.enemies.indexOf(enemy), 1);
    }
  }
}
