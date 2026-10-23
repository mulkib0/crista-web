/**
 * 사옥 지구 장면(Phaser 3.90) — crista 의 아틀라스 · 픽셀 렌더 설정 · 캐릭터 걷기(4방향 · 보행 4프레임 8fps)를 옮겨 쓴다.
 *
 * - 걷기는 화면 경험이다(서버 판정 없음 — 설계 §2). 내 캐릭터는 바로 움직이고, 위치는 초당 5회까지 서버로 보내 같은 학급에 중계된다.
 * - 이동: WASD · 화살표 + 바닥 클릭(4방향 A*). 속도 150 px/s(crista `MOVE.speed`).
 * - 문 앞(매트)에 서면 `E 들어가기` — React 쪽(District.tsx)이 사옥 대사 창을 연다. 사옥을 누르면 그 문 앞까지 걸어가 연다.
 * - Z · E · 스페이스 · 엔터 = 조사(쯔꾸르 결정 키). 바라보는 쪽 바로 앞에 친구가 있으면 문보다 먼저 말을 건다.
 * - 사옥 그림은 tools/gen-campus-assets.mjs 의 외관 8종 × 3단계 + 모둠 잉크(깃발 · 간판 테두리)를 여기서 덧그린다.
 */
import * as Phaser from 'phaser';
import type { Avatar, Direction, DistrictLight, DistrictPeer, DistrictResponse } from '@crista-web/web-contract';
import { ink } from '../ink.ts';
import {
  buildBlocked,
  COLS,
  findPath,
  FOUNTAIN,
  HEIGHT,
  LED_POST,
  PLANTERS,
  PLAZA,
  PLOTS,
  ROADS,
  ROWS,
  SPAWN,
  TILE,
  walkable,
  WIDTH,
  type PlotSlot,
} from './map.ts';

const ATLAS = 'crista';
const SPEED = 150;
const SEND_MS = 200;
const DIRS: Direction[] = ['south', 'north', 'east', 'west'];
const CHARS: Avatar[] = ['ceo', 'cso', 'cto', 'cmo'];
const FONT = '"Galmuri11", "Apple SD Gothic Neo", sans-serif';
const hex = (css: string): number => Number.parseInt(css.slice(1), 16);

export interface DistrictHooks {
  /** 문 앞에 섰다 · 떠났다. */
  onNear(plot: number | null): void;
  /** Z · E · 스페이스 · 엔터 · 사옥 누르기. */
  onInteract(plot: number): void;
  /** 바라보는 쪽 바로 앞의 친구에게 Z(결정 키). */
  onTalk(peer: DistrictPeer): void;
  onMove(x: number, y: number, dir: Direction, moving: boolean): void;
  onReady(): void;
}

interface Actor {
  sprite: Phaser.GameObjects.Sprite;
  tag: Phaser.GameObjects.Text;
  dot: Phaser.GameObjects.Rectangle;
  char: Avatar;
  dir: Direction;
  moving: boolean;
  tx: number;
  ty: number;
  /** 다른 학생이면 마지막으로 받은 위치 정보. */
  peer?: DistrictPeer;
}

type Team = DistrictResponse['teams'][number];

export class DistrictScene extends Phaser.Scene {
  private readonly hooks: DistrictHooks;
  private blocked: boolean[][] = buildBlocked(8);
  private me: Actor | null = null;
  private readonly others = new Map<string, Actor>();
  private path: Array<{ x: number; y: number }> = [];
  private pendingInteract: number | null = null;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private nearPlot: number | null = null;
  private lastSentAt = 0;
  private lastSent = '';
  private teams: Team[] = [];
  private myTeamId: string | null = null;
  /** 사옥 그림 · 간판 · 깃발 — 모둠이 바뀌면 지우고 다시 그린다(컨테이너는 깊이 정렬을 깨서 쓰지 않는다). */
  private plotObjects: Phaser.GameObjects.GameObject[] = [];
  /** 사옥 창문 불빛(FLEARN — 학습 연구비 단계 가동) — 켜진 창 수만. 사옥을 다시 그리면 같이 다시 그린다. */
  private hqLights: DistrictLight[] = [];
  private lightObjects: Phaser.GameObjects.GameObject[] = [];
  private ledText: Phaser.GameObjects.Text | null = null;
  /** 광장 LED 소식(FMARKET — ③ 전광판과 같은 최근 소식). 비면 등기 소식만. */
  private plazaNews: string | null = null;
  private arrow: Phaser.GameObjects.Triangle | null = null;
  private ready = false;
  private inputEnabled = true;
  /** 대사 창을 닫은 키가 Phaser 입력 줄에 남아 창을 바로 다시 여는 것을 막는다. */
  private enabledAt = 0;

  constructor(hooks: DistrictHooks) {
    super('district');
    this.hooks = hooks;
  }

  preload(): void {
    const base = import.meta.env.BASE_URL;
    this.load.atlas(ATLAS, `${base}assets/atlas/crista-atlas-0.png`, `${base}assets/atlas/crista-atlas-0.json`);
    for (let f = 1; f <= 8; f++) for (let t = 1; t <= 3; t++) this.load.svg(`hq-${f}-t${t}`, `${base}campus/hq-${f}-t${t}.svg`, { width: 96, height: 96 });
  }

  create(): void {
    this.drawGround();
    this.registerAnims();
    this.cameras.main.setRoundPixels(true);
    this.fitZoom();
    this.scale.on('resize', () => this.fitZoom());

    const kb = this.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
      for (const key of ['Z', 'E', 'SPACE', 'ENTER']) kb.on(`keydown-${key}`, (e: KeyboardEvent) => !e.repeat && this.interact());
      // 입력 칸에 글을 쓸 때 WASD 가 캐릭터를 움직이지 않게 — 캔버스 밖 입력은 Phaser 가 가로채지 않는다.
      kb.disableGlobalCapture();
    }
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onClick(p.worldX, p.worldY));

    this.arrow = this.add.triangle(0, 0, 0, 0, 22, 9, 0, 18, 0x080b09).setScrollFactor(0).setDepth(200_000).setVisible(false);
    this.ready = true;
    this.hooks.onReady();
  }

  /**
   * 쯔꾸르처럼 가까이(시안 district-rpg-10 · 01) — 화면 높이 600px 이상이면 2배로 내 캐릭터를 따라가고, 작으면 1배.
   * 정수배라 픽셀 그림이 흐려지지 않는다. 지구가 화면보다 작으면 가운데 두고(경계를 넓혀) 크면 따라간다.
   */
  private fitZoom(): void {
    const { width, height } = this.scale.gameSize;
    const cover = Math.max(width / WIDTH, height / HEIGHT);
    const zoom = height >= 600 && width >= 560 ? 2 : cover >= 1 || height >= 360 ? 1 : cover >= 0.75 ? 0.75 : 0.5;
    const cam = this.cameras.main;
    cam.setZoom(zoom);
    const viewW = width / zoom;
    const viewH = height / zoom;
    const bw = Math.max(WIDTH, viewW);
    const bh = Math.max(HEIGHT, viewH);
    cam.setBounds(-(bw - WIDTH) / 2, -(bh - HEIGHT) / 2, bw, bh);
  }

  private drawGround(): void {
    // 잔디 체커(crista `grass-checker` 와 같은 색) — 한 장 캔버스로.
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x78c850).fillRect(0, 0, WIDTH, HEIGHT);
    g.fillStyle(0x70b848);
    for (let r = 0; r < ROWS * 2; r++) for (let c = r % 2; c < COLS * 2; c += 2) g.fillRect(c * 16, r * 16, 16, 16);
    const tile = (frame: string, c: number, r: number, depth = 1) => this.add.image(c * TILE, r * TILE, ATLAS, frame).setOrigin(0).setDepth(depth);
    // 광장
    for (let c = PLAZA.col0; c <= PLAZA.col1; c++) for (let r = PLAZA.row0; r <= PLAZA.row1; r++) tile('tile/plaza-tile', c, r);
    // 길(map.ts ROADS). park-path 는 세로 길 그림이라 가로 길은 90° 돌린다.
    for (let c = 1; c < COLS - 1; c++) {
      for (const r of ROADS.rows) this.add.image(c * TILE + TILE / 2, r * TILE + TILE / 2, ATLAS, 'tile/park-path').setAngle(90).setDepth(1);
    }
    for (const road of ROADS.cols) for (let r = road.from; r <= road.to; r++) if (!(ROADS.rows as readonly number[]).includes(r)) tile('tile/park-path', road.col, r);
    for (const slot of PLOTS.filter((s) => s.row0 < PLAZA.row0)) tile('tile/park-path', slot.doorCol, PLAZA.row0 - 1);
    // 분수(2×2) · 화단
    this.add.image(FOUNTAIN.col0 * TILE, FOUNTAIN.row0 * TILE, ATLAS, 'tile/plaza-fountain').setOrigin(0).setDisplaySize(64, 64).setDepth(1000 + (FOUNTAIN.row0 + 2) * TILE);
    for (const [c, r] of PLANTERS) this.add.image(c * TILE, r * TILE, ATLAS, 'tile/planter').setOrigin(0).setDepth(1000 + (r + 1) * TILE);
    // 광장 LED 기둥 — ③ 의 전광판과 같은 소식(설계 §4.1)
    const lx = LED_POST.col0 * TILE;
    const ly = LED_POST.row0 * TILE;
    this.add.rectangle(lx, ly + 4, LED_POST.width * TILE, 24, 0x0b0d0a).setOrigin(0).setStrokeStyle(2, 0x282828).setDepth(1000 + ly + 32);
    this.add.rectangle(lx + 8, ly + 28, 4, 6, 0x282828).setOrigin(0).setDepth(1000 + ly + 32);
    this.add.rectangle(lx + LED_POST.width * TILE - 12, ly + 28, 4, 6, 0x282828).setOrigin(0).setDepth(1000 + ly + 32);
    this.ledText = this.add.text(lx + LED_POST.width * TILE, ly + 9, '', { fontFamily: '"GalmuriMono11", monospace', fontSize: '12px', color: '#ffb21a' }).setDepth(1000 + ly + 33);
    const mask = this.make.graphics({}, false).fillRect(lx + 2, ly + 4, LED_POST.width * TILE - 4, 24).createGeometryMask();
    this.ledText.setMask(mask);
  }

  private registerAnims(): void {
    for (const id of CHARS) {
      for (const dir of DIRS) {
        const key = `${id}-walk-${dir}`;
        if (this.anims.exists(key) || !this.textures.get(ATLAS).has(`char/${id}-walk-${dir}/0`)) continue;
        this.anims.create({ key, frames: this.anims.generateFrameNames(ATLAS, { prefix: `char/${id}-walk-${dir}/`, start: 0, end: 3 }), frameRate: 8, repeat: -1 });
      }
    }
  }

  // ── 바깥(React)에서 부르는 것 ──

  isReady(): boolean {
    return this.ready;
  }

  setInputEnabled(enabled: boolean): void {
    if (enabled && !this.inputEnabled) this.enabledAt = performance.now();
    this.inputEnabled = enabled;
    if (!enabled) this.path = [];
    // 장면이 아직 만들어지기 전(React 효과가 먼저 돌 때)에는 input 이 없다.
    if (this.ready && this.input?.keyboard) this.input.keyboard.enabled = enabled;
  }

  spawnMe(name: string, avatar: Avatar | null, inkNo: number | null, at?: { x: number; y: number }): { x: number; y: number } {
    const char = avatar ?? 'ceo';
    if (this.me) {
      this.setLook(this.me, char, name, inkNo);
      return { x: this.me.sprite.x, y: this.me.sprite.y };
    }
    // 광장 안에서 조금씩 흩어 놓는다 — 같은 자리에 겹쳐 서면 이름표가 가려진다.
    const pos = at ?? { x: SPAWN.x + Math.round((Math.random() - 0.5) * 160), y: SPAWN.y - Math.round(Math.random() * 24) };
    this.me = this.makeActor(pos.x, pos.y, char, name, inkNo, true);
    this.cameras.main.startFollow(this.me.sprite, true, 0.12, 0.12);
    return pos;
  }

  get position(): { x: number; y: number; dir: Direction } {
    return { x: this.me?.sprite.x ?? SPAWN.x, y: this.me?.sprite.y ?? SPAWN.y, dir: this.me?.dir ?? 'south' };
  }

  setTeams(teams: Team[], myTeamId: string | null): void {
    this.teams = teams;
    this.myTeamId = myTeamId;
    this.blocked = buildBlocked(teams.length);
    this.drawPlots();
    this.drawLights();
    const news = teams
      .filter((t) => t.startupName && t.ticker)
      .map((t) => `◆ ${t.ticker} 「${t.startupName}」 설립 등기`)
      .join('     ');
    this.ledText?.setText(this.plazaNews || news || '◆ 사옥에 들어가 스타트업 이름을 등기하면 이 띠에 소식이 흘러요');
  }

  /** 광장 LED 기둥 글(설계 §4.1 — ③ 의 전광판과 같은 소식, FMARKET). */
  setPlazaNews(text: string | null): void {
    this.plazaNews = text;
    if (text) this.ledText?.setText(text);
  }

  upsertPeer(peer: DistrictPeer): void {
    let actor = this.others.get(peer.userId);
    if (!actor) {
      actor = this.makeActor(peer.x, peer.y, peer.avatar ?? 'ceo', peer.displayName, peer.ink, false);
      this.others.set(peer.userId, actor);
    }
    this.setLook(actor, peer.avatar ?? 'ceo', peer.displayName, peer.ink);
    actor.peer = peer;
    actor.tx = peer.x;
    actor.ty = peer.y;
    actor.dir = peer.dir;
    actor.moving = peer.moving;
    if (Math.hypot(actor.sprite.x - peer.x, actor.sprite.y - peer.y) > 160) actor.sprite.setPosition(peer.x, peer.y);
  }

  removePeer(userId: string): void {
    const actor = this.others.get(userId);
    if (!actor) return;
    actor.sprite.destroy();
    actor.tag.destroy();
    actor.dot.destroy();
    this.others.delete(userId);
  }

  clearPeers(): void {
    for (const id of [...this.others.keys()]) this.removePeer(id);
  }

  // ── 그리기 ──

  /** 사옥 창문 불빛 — 모둠원 수만큼 창(최대 4), 지금 단계에서 가동 도장을 찍은 수만큼 켠다. 전원이면 '전원 야근' 빛, 5단계 연속이면 옥상 깃발. */
  setLights(lights: DistrictLight[]): void {
    this.hqLights = lights;
    this.drawLights();
  }

  private drawLights(): void {
    for (const obj of this.lightObjects) obj.destroy();
    this.lightObjects = [];
    if (!this.ready) return;
    for (const light of this.hqLights) {
      const team = this.teams.find((t) => t.id === light.teamId);
      const slot = team ? PLOTS[team.plot - 1] : undefined;
      if (!team || !slot || !team.startupName) continue;
      const x = slot.col0 * TILE;
      const bottom = slot.row0 * TILE + 3 * TILE;
      const depth = 1000 + bottom + 3;
      const w = 9;
      const gap = 4;
      const n = Math.max(1, Math.min(4, light.windows));
      const left = x + 48 - (n * w + (n - 1) * gap) / 2;
      const top = bottom - 34;
      const g = this.add.graphics().setDepth(depth);
      if (light.allOn) g.fillStyle(0xffe066, 0.28).fillRoundedRect(left - 5, top - 5, n * w + (n - 1) * gap + 10, w + 13, 4);
      for (let i = 0; i < n; i++) {
        const on = i < light.lit;
        g.fillStyle(on ? 0xffd23f : 0x2a3340).fillRect(left + i * (w + gap), top, w, w + 3);
        g.lineStyle(1, 0x282828).strokeRect(left + i * (w + gap), top, w, w + 3);
      }
      this.lightObjects.push(g);
      if (light.flag) {
        const f = this.add.graphics().setDepth(depth + 1);
        const fx = x + 10;
        const fy = slot.row0 * TILE - 10;
        f.lineStyle(2, 0x282828).lineBetween(fx, fy, fx, fy + 26);
        f.fillStyle(0xc6ff4a).fillTriangle(fx + 1, fy, fx + 15, fy + 5, fx + 1, fy + 10).lineStyle(1, 0x282828).strokeTriangle(fx + 1, fy, fx + 15, fy + 5, fx + 1, fy + 10);
        this.lightObjects.push(f);
      }
    }
  }

  private drawPlots(): void {
    for (const obj of this.plotObjects) obj.destroy();
    this.plotObjects = [];
    const layer = { add: (o: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]) => void this.plotObjects.push(...(Array.isArray(o) ? o : [o])) };
    for (const team of this.teams) {
      const slot = PLOTS[team.plot - 1];
      if (!slot) continue;
      this.drawPlot(layer, slot, team);
    }
  }

  private drawPlot(layer: { add(o: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]): void }, slot: PlotSlot, team: Team): void {
    const x = slot.col0 * TILE;
    const y = slot.row0 * TILE;
    const bottom = y + 3 * TILE;
    const color = ink(team.ink);
    const depth = 1000 + bottom;
    const img = this.add.image(x + 48, bottom + 6, `hq-${team.facade}-t${team.hqTier}`).setOrigin(0.5, 1).setDepth(depth);
    img.setInteractive({ useHandCursor: true }).on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      this.walkTo(slot, true);
    });
    layer.add(img);
    // 문 앞 매트
    layer.add(this.add.image(slot.doorCol * TILE, slot.doorRow * TILE, ATLAS, 'tile/floor-mat').setOrigin(0).setDepth(2));
    // 잉크 깃발
    const fx = x + 92;
    const fy = y - 6;
    const flag = this.add.graphics().setDepth(depth + 1);
    flag.lineStyle(2, 0x282828).lineBetween(fx, fy, fx, fy + 30);
    flag.fillStyle(hex(color.base)).fillRect(fx + 1, fy, 14, 9).lineStyle(1, 0x282828).strokeRect(fx + 1, fy, 14, 9);
    layer.add(flag);

    if (team.startupName) {
      const label = `${team.startupName} ${team.ticker ?? ''}`.trim();
      const plate = this.add.text(x + 48, y - 6, label, {
        fontFamily: FONT, fontSize: '12px', color: '#282828', backgroundColor: '#F8F8F0', padding: { x: 6, y: 3 },
      }).setOrigin(0.5, 1).setDepth(depth + 2);
      const border = this.add.rectangle(plate.x, plate.y, plate.width + 4, plate.height + 4).setOrigin(0.5, 1).setStrokeStyle(2, hex(color.base)).setDepth(depth + 2);
      border.y = plate.y + 2;
      layer.add([plate, border]);
    } else {
      // 등기 전 — 부지 앞 가림막(낮은 울타리) + 위쪽 팻말(설계 §4.1)
      const cover = this.add.graphics().setDepth(depth + 1);
      cover.fillStyle(0xe8d0b0, 0.95).fillRect(x + 4, bottom - 6, 88, 12);
      cover.lineStyle(1, 0x5a3820, 0.7);
      for (let i = 0; i < 88; i += 8) cover.lineBetween(x + 4 + i, bottom + 6, x + 10 + i, bottom - 6);
      cover.lineStyle(2, 0x5a3820).strokeRect(x + 4, bottom - 6, 88, 12);
      layer.add(cover);
      const sign = this.add.text(x + 48, y - 6, `${team.plot}모둠 사옥 · 입주 ${team.memberCount}/${team.capacity}`, {
        fontFamily: FONT, fontSize: '11px', color: '#282828', backgroundColor: '#F8F8F0', padding: { x: 5, y: 2 },
      }).setOrigin(0.5, 1).setDepth(depth + 2);
      const border = this.add.rectangle(sign.x, sign.y + 2, sign.width + 4, sign.height + 4).setOrigin(0.5, 1).setStrokeStyle(1, 0x5a3820).setDepth(depth + 2);
      layer.add([sign, border]);
    }
    if (team.id === this.myTeamId) {
      const mine = this.add.text(slot.doorCol * TILE + 16, (slot.doorRow + 1) * TILE + 2, '우리 모둠', {
        fontFamily: FONT, fontSize: '11px', color: '#F8F8F0', backgroundColor: color.base, padding: { x: 4, y: 1 },
      }).setOrigin(0.5, 0).setDepth(depth + 2);
      layer.add(mine);
    }
  }

  private makeActor(x: number, y: number, char: Avatar, name: string, inkNo: number | null, local: boolean): Actor {
    const sprite = this.add.sprite(x, y, ATLAS, `char/${char}`).setOrigin(0.5, 1);
    const tag = this.add.text(x, y - 52, name, {
      fontFamily: FONT, fontSize: '11px', color: local ? '#080b09' : '#282828', backgroundColor: local ? '#c6ff4a' : '#F8F8F0', padding: { x: 4, y: 1 },
    }).setOrigin(0.5, 1);
    const dot = this.add.rectangle(x, y, 7, 7, inkNo ? hex(ink(inkNo).base) : 0x606060).setOrigin(1, 0.5);
    const actor: Actor = { sprite, tag, dot, char, dir: 'south', moving: false, tx: x, ty: y };
    this.setLook(actor, char, name, inkNo);
    return actor;
  }

  private setLook(actor: Actor, char: Avatar, name: string, inkNo: number | null): void {
    if (actor.char !== char) {
      actor.char = char;
      actor.sprite.anims.stop();
      actor.sprite.setTexture(ATLAS, `char/${char}`);
    }
    actor.tag.setText(name);
    actor.dot.setFillStyle(inkNo ? hex(ink(inkNo).base) : 0x606060);
  }

  private syncActor(actor: Actor): void {
    const { sprite, tag, dot } = actor;
    sprite.setDepth(1000 + sprite.y);
    tag.setPosition(Math.round(sprite.x + 5), Math.round(sprite.y - 50)).setDepth(100_000 + sprite.y);
    dot.setPosition(Math.round(tag.x - tag.width / 2 - 2), Math.round(tag.y - tag.height / 2)).setDepth(100_000 + sprite.y);
    const key = `${actor.char}-walk-${actor.dir}`;
    if (actor.moving && this.anims.exists(key)) {
      if (sprite.anims.currentAnim?.key !== key || !sprite.anims.isPlaying) sprite.play(key, true);
    } else {
      if (sprite.anims.isPlaying) sprite.anims.stop();
      sprite.setTexture(ATLAS, `char/${actor.char}`);
    }
  }

  // ── 입력 · 이동 ──

  private onClick(wx: number, wy: number): void {
    if (!this.me || !this.inputEnabled) return;
    this.pendingInteract = null;
    this.path = findPath(this.blocked, this.me.sprite.x, this.me.sprite.y - 4, wx, wy);
  }

  private walkTo(slot: PlotSlot, open: boolean): void {
    if (!this.me || !this.inputEnabled) return;
    const door = { x: slot.doorCol * TILE + 16, y: slot.doorRow * TILE + 20 };
    if (Math.hypot(this.me.sprite.x - door.x, this.me.sprite.y - door.y) < 40) {
      if (open) this.hooks.onInteract(slot.plot);
      return;
    }
    this.path = findPath(this.blocked, this.me.sprite.x, this.me.sprite.y - 4, door.x, door.y);
    this.pendingInteract = open && this.path.length > 0 ? slot.plot : null;
  }

  private interact(): void {
    if (!this.inputEnabled || performance.now() - this.enabledAt < 250) return;
    const peer = this.facingPeer();
    if (peer) this.hooks.onTalk(peer);
    else if (this.nearPlot !== null) this.hooks.onInteract(this.nearPlot);
  }

  /** 바라보는 쪽 한 칸(약 44px) 안, 옆으로 24px 안에 선 친구 — 가장 가까운 한 명. */
  private facingPeer(): DistrictPeer | null {
    const me = this.me;
    if (!me) return null;
    const [fx, fy] = ({ north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] } as const)[me.dir];
    let best: { peer: DistrictPeer; d: number } | null = null;
    for (const actor of this.others.values()) {
      if (!actor.peer) continue;
      const dx = actor.sprite.x - me.sprite.x;
      const dy = actor.sprite.y - me.sprite.y;
      const ahead = dx * fx + dy * fy;
      const side = Math.abs(dx * fy - dy * fx);
      if (ahead > 0 && ahead < 44 && side < 24 && (!best || ahead < best.d)) best = { peer: actor.peer, d: ahead };
    }
    return best?.peer ?? null;
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta, 100) / 1000;
    const me = this.me;
    if (me) {
      let vx = 0;
      let vy = 0;
      if (this.inputEnabled) {
        const k = this.keys;
        if (k.A?.isDown || k.LEFT?.isDown) vx -= 1;
        if (k.D?.isDown || k.RIGHT?.isDown) vx += 1;
        if (k.W?.isDown || k.UP?.isDown) vy -= 1;
        if (k.S?.isDown || k.DOWN?.isDown) vy += 1;
      }
      if (vx !== 0 || vy !== 0) {
        this.path = [];
        this.pendingInteract = null;
      }
      let remain = Infinity;
      if (vx === 0 && vy === 0 && this.path.length > 0) {
        const next = this.path[0]!;
        const dx = next.x - me.sprite.x;
        const dy = next.y + 4 - me.sprite.y;
        const len = Math.hypot(dx, dy);
        if (len <= 2) {
          this.path.shift();
          if (this.path.length === 0 && this.pendingInteract !== null) {
            const plot = this.pendingInteract;
            this.pendingInteract = null;
            this.hooks.onInteract(plot);
          }
        } else {
          vx = dx / len;
          vy = dy / len;
          remain = len;
        }
      }
      let moving = false;
      if (vx !== 0 || vy !== 0) {
        const len = Math.hypot(vx, vy) || 1;
        const step = Math.min(SPEED * dt, remain);
        const mx = (vx / len) * step;
        const my = (vy / len) * step;
        let nx = me.sprite.x;
        let ny = me.sprite.y;
        if (mx !== 0 && walkable(this.blocked, nx + mx, ny - 4)) nx += mx;
        if (my !== 0 && walkable(this.blocked, nx, ny + my - 4)) ny += my;
        moving = nx !== me.sprite.x || ny !== me.sprite.y;
        if (moving) {
          me.sprite.setPosition(nx, ny);
          me.dir = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'east' : 'west') : my > 0 ? 'south' : 'north';
        } else {
          this.path = [];
        }
      }
      me.moving = moving;
      this.syncActor(me);
      this.checkNear(me.sprite.x, me.sprite.y);
      this.emitMove(time, me);
      this.pointArrow(me);
    }
    for (const actor of this.others.values()) {
      const k = 1 - Math.exp(-12 * dt);
      actor.sprite.x += (actor.tx - actor.sprite.x) * k;
      actor.sprite.y += (actor.ty - actor.sprite.y) * k;
      this.syncActor(actor);
    }
    if (this.ledText) {
      const width = LED_POST.width * TILE;
      this.ledText.x -= 40 * dt;
      if (this.ledText.x < LED_POST.col0 * TILE - this.ledText.width) this.ledText.x = LED_POST.col0 * TILE + width;
    }
  }

  private checkNear(x: number, y: number): void {
    let near: number | null = null;
    for (const team of this.teams) {
      const slot = PLOTS[team.plot - 1];
      if (!slot) continue;
      if (Math.hypot(x - (slot.doorCol * TILE + 16), y - (slot.doorRow * TILE + 20)) < 36) near = slot.plot;
    }
    if (near !== this.nearPlot) {
      this.nearPlot = near;
      this.hooks.onNear(near);
    }
  }

  /** 바뀐 것이 있으면 200ms 에 한 번(초당 5회 — 서버 상한). 멈춘 순간도 다음 차례에 반드시 나간다. */
  private emitMove(time: number, me: Actor): void {
    const sig = `${Math.round(me.sprite.x)},${Math.round(me.sprite.y)},${me.dir},${me.moving}`;
    if (sig === this.lastSent || time - this.lastSentAt < SEND_MS) return;
    this.lastSentAt = time;
    this.lastSent = sig;
    this.hooks.onMove(Math.round(me.sprite.x), Math.round(me.sprite.y), me.dir, me.moving);
  }

  /** 내 사옥이 화면 밖이면 가장자리 화살표(설계 §4.2). */
  private pointArrow(me: Actor): void {
    const arrow = this.arrow;
    if (!arrow) return;
    const team = this.teams.find((t) => t.id === this.myTeamId);
    const slot = team ? PLOTS[team.plot - 1] : undefined;
    const view = this.cameras.main.worldView;
    if (!slot) return void arrow.setVisible(false);
    const tx = slot.doorCol * TILE + 16;
    const ty = slot.row0 * TILE + 48;
    if (view.contains(tx, ty)) return void arrow.setVisible(false);
    const angle = Math.atan2(ty - me.sprite.y, tx - me.sprite.x);
    const w = this.scale.gameSize.width;
    const h = this.scale.gameSize.height;
    const r = Math.min(w, h) / 2 - 40;
    arrow.setPosition(w / 2 + Math.cos(angle) * r, h / 2 + Math.sin(angle) * r).setRotation(angle).setVisible(true);
  }
}
