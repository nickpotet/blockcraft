import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const SIZE = 16;
const output = new URL('../public/textures/blocks/', import.meta.url);
mkdirSync(output, { recursive: true });

let seed = 0x4b1d;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0xffffffff;
};

const hex = value => {
  const clean = value.replace('#', '');
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16), 255];
};

const make = color => Array.from({ length: SIZE * SIZE }, () => [...hex(color)]);
const pixel = (image, x, y, color, alpha = 255) => {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  image[y * SIZE + x] = [...hex(color).slice(0, 3), alpha];
};
const rect = (image, x, y, width, height, color, alpha = 255) => {
  for (let py = y; py < y + height; py++) for (let px = x; px < x + width; px++) pixel(image, px, py, color, alpha);
};
const speckle = (image, colors, count = 58) => {
  for (let i = 0; i < count; i++) {
    const color = colors[Math.floor(random() * colors.length)];
    const x = Math.floor(random() * SIZE);
    const y = Math.floor(random() * SIZE);
    pixel(image, x, y, color);
    if (random() > .86) pixel(image, x + 1, y, color);
  }
};

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = buffer => {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const name = Buffer.from(type);
  const size = Buffer.alloc(4); size.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, crc]);
};
const save = (name, image) => {
  const rows = Buffer.alloc((SIZE * 4 + 1) * SIZE);
  for (let y = 0; y < SIZE; y++) {
    const offset = y * (SIZE * 4 + 1);
    rows[offset] = 0;
    for (let x = 0; x < SIZE; x++) Buffer.from(image[y * SIZE + x]).copy(rows, offset + 1 + x * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(SIZE, 0); header.writeUInt32BE(SIZE, 4);
  header[8] = 8; header[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
  writeFileSync(new URL(`${name}.png`, output), png);
};

let image = make('#566f36');
speckle(image, ['#354c27', '#445c2d', '#647f3e', '#718d49'], 74);
save('grass_top', image);

image = make('#76502e');
speckle(image, ['#4e341f', '#5d3e24', '#8e633a', '#a06e3d'], 68);
for (let x = 0; x < SIZE; x++) {
  const depth = 3 + Math.floor(random() * 4);
  rect(image, x, 0, 1, depth, random() > .48 ? '#566f36' : '#465f2d');
  if (random() > .7) pixel(image, x, depth, '#304723');
}
save('grass_side', image);

image = make('#76502e');
speckle(image, ['#49301d', '#5c3b23', '#8f6238', '#9e6d40'], 76);
save('dirt', image);

image = make('#858782');
speckle(image, ['#626560', '#6f726d', '#9b9d98', '#acada9'], 74);
rect(image, 2, 9, 3, 1, '#696b67'); rect(image, 11, 3, 2, 2, '#a4a6a1');
save('stone', image);

image = make('#b8ab73');
speckle(image, ['#918454', '#a09462', '#ccbf88', '#d3c690'], 54);
save('sand', image);

image = make('#875e32');
for (let x = 0; x < SIZE; x += 4) rect(image, x, 0, 1, SIZE, x % 8 ? '#a87942' : '#5e3d22');
speckle(image, ['#664324', '#b18149'], 32);
save('wood_side', image);

image = make('#b1814a');
rect(image, 2, 2, 12, 1, '#77502b'); rect(image, 2, 13, 12, 1, '#77502b');
rect(image, 2, 3, 1, 10, '#77502b'); rect(image, 13, 3, 1, 10, '#77502b');
rect(image, 5, 5, 6, 1, '#8e6337'); rect(image, 5, 10, 6, 1, '#8e6337');
rect(image, 5, 6, 1, 4, '#8e6337'); rect(image, 10, 6, 1, 4, '#8e6337');
speckle(image, ['#c29457', '#936639'], 22);
save('wood_top', image);

image = make('#334c2e');
speckle(image, ['#1e3522', '#294228', '#405f36', '#4e7040'], 92);
for (const [x, y] of [[2,2],[3,2],[12,4],[7,8],[1,12],[13,13],[9,3],[5,14]]) pixel(image, x, y, '#000000', 0);
save('leaves', image);

image = make('#b8874b');
for (let y = 4; y < SIZE; y += 5) rect(image, 0, y, SIZE, 1, '#75502b');
rect(image, 7, 0, 1, 4, '#8c6236'); rect(image, 3, 5, 1, 4, '#8c6236'); rect(image, 11, 10, 1, 5, '#8c6236');
speckle(image, ['#986b39', '#cca064'], 31);
save('planks', image);

image = make('#a6503d');
for (let y = 4; y < SIZE; y += 5) rect(image, 0, y, SIZE, 1, '#d2b5a0');
rect(image, 7, 0, 1, 4, '#d2b5a0'); rect(image, 3, 5, 1, 4, '#d2b5a0'); rect(image, 11, 10, 1, 5, '#d2b5a0');
speckle(image, ['#74382f', '#bd644e'], 30);
save('brick', image);

image = make('#393939');
speckle(image, ['#171717', '#262626', '#4b4b4b', '#5d5d5d'], 108);
save('bedrock', image);

image = make('#365f72');
for (let y = 2; y < SIZE; y += 4) rect(image, Math.floor(random() * 5), y, 7 + Math.floor(random() * 5), 1, '#638896', 220);
speckle(image, ['#294c60', '#527a89'], 24);
save('water', image);

image = make('#777a76'); speckle(image, ['#252828','#313535','#92948f'], 74); save('coal_ore', image);
image = make('#777a76'); speckle(image, ['#6f4f3c','#9c7359','#a8aaa5'], 70); save('iron_ore_block', image);
image = make('#747b7a'); speckle(image, ['#aab8b8','#d3dddd','#566160'], 62); save('silver_ore_block', image);
image = make('#815d36'); for(let y=3;y<16;y+=5)rect(image,0,y,16,1,'#3f3022');for(let x=3;x<16;x+=6)rect(image,x,0,1,16,'#a57a49');save('workbench',image);
image = make('#3b332d'); rect(image,2,9,12,4,'#70452a');rect(image,5,4,7,8,'#d46b25');rect(image,7,1,3,7,'#efb13f');save('campfire',image);
image = make('#76502e'); rect(image,1,3,14,2,'#3b2a1c');rect(image,1,11,14,2,'#3b2a1c');rect(image,4,0,2,16,'#9e7442');rect(image,11,0,2,16,'#4d351f');save('chest',image);
image = make('#2c2420'); rect(image,6,3,4,13,'#80502b');rect(image,4,0,8,6,'#e78a2d');rect(image,6,0,4,4,'#ffd465');save('torch',image);
image = make('#704a2a');for(let x=2;x<16;x+=5)rect(image,x,0,2,16,'#9a7042');rect(image,0,2,16,2,'#38271b');rect(image,0,12,16,2,'#38271b');rect(image,12,7,2,2,'#c59a52');save('door',image);

console.log('Generated block textures.');
