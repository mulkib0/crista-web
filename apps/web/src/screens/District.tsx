/**
 * ② 사옥 지구(설계 §4) — Phaser 캔버스 + React 겹 화면(위 띠 · 캐릭터 고르기 · RPG 대사 창 · 등기 도장).
 *
 * - 처음 들어오면 캐릭터(CEO · CSO · CTO · CMO)를 고른다 — 능력치 · 잠금 없음, ③ 의 직책 배지가 된다.
 * - 대사 창은 시안 design/district-rpg-10 의 01 '메시지 창 · 얼굴 그래픽'(쯔꾸르 기본 창) 그대로:
 *   들어오면 지도 이름 표시 → 내 캐릭터의 첫 대사(이 브라우저 탭에서 한 번) → 걷다가 문 앞에서 Z · E.
 * - 사옥 문 → 대사 + 선택지: 입사(walk-in) · 구경(남의 사옥) · 등기(우리 사옥, 이름 전 — 입력 창 → 도장) · ③ 으로(등기 뒤).
 * - 친구 앞에서 Z → 그 친구의 얼굴 · 직책과 어느 모둠인지(말을 지어내지 않고 상태만 알린다).
 * - 같은 모둠의 누가 등기하면 학급 채널 `team.registered` 로 알고 ③ 으로 넘어간다(설계 §4.3).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import * as Phaser from 'phaser';
import {
  API,
  AVATARS,
  checkRegistration,
  LEARN_API,
  suggestTicker,
  type Avatar,
  type DistrictLightsResponse,
  type DistrictPeer,
  type DistrictResponse,
  type JoinResponse,
  type MeResponse,
  type RegistrationResponse,
  type ServerMessage,
} from '@crista-web/web-contract';
import { pickedLab, type Nav } from '../App.tsx';
import { api, ApiFailure, message } from '../api.ts';
import { plazaText } from '../board/market/LedBand.tsx';
import { useMarket } from '../board/market/store.ts';
import { DistrictScene } from '../district/DistrictScene.ts';
import { HEIGHT, PLAZA, PLOTS, WIDTH } from '../district/map.ts';
import { MapName, RpgForm, RpgMessage, RpgStamp, type AtlasFrames, type SayOptions } from '../district/rpg.tsx';
import { ink } from '../ink.ts';
import { socket } from '../ws.ts';

const AVATAR_LABEL: Record<Avatar, string> = { ceo: 'CEO', cso: 'CSO', cto: 'CTO', cmo: 'CMO' };
const AVATAR_HINT: Record<Avatar, string> = {
  ceo: '등기 · 예산 · 경쟁사 정찰',
  cso: '표적 근거 · ΔG 비교',
  cto: '구조 변형 · 물성 미리보기',
  cmo: 'ADMET 독성 · 제형 초안',
};

type Team = DistrictResponse['teams'][number];

/** 부지가 광장의 어느 쪽인지 — 첫 대사에 쓴다. */
function whereOf(plot: number): string {
  const slot = PLOTS[plot - 1];
  if (!slot) return '지구 안';
  return `광장 ${slot.row0 < PLAZA.row0 ? '위' : '아래'} ${slot.doorCol < (PLAZA.col0 + PLAZA.col1) / 2 ? '왼쪽' : '오른쪽'}`;
}

function introText(district: DistrictResponse, myTeam: Team | null): string {
  if (myTeam?.startupName) return `우리 「${myTeam.startupName}」 사옥은 ${whereOf(myTeam.plot)}이야.\n문 앞에서 Z 를 눌러 들어가 보자.`;
  if (myTeam) return `여기가 사옥 지구구나.\n우리 ${myTeam.plot}모둠 사옥은 ${whereOf(myTeam.plot)}이야. 문 앞에서 Z 를 눌러 들어가 보자.`;
  if (district.class.assignment === 'walk-in') return '여기가 사옥 지구구나.\n처음 문을 연 사옥이 우리 모둠이 돼. 마음에 드는 사옥 문 앞에서 Z 를 눌러 보자.';
  return '여기가 사옥 지구구나.\n선생님이 모둠을 정해 주실 거야. 그동안 지구를 둘러보자.';
}

/** 아틀라스에서 캐릭터 정지 프레임 한 칸을 CSS 배경으로. */
function CharSprite({ id, frames, scale = 2 }: { id: Avatar; frames: AtlasFrames | null; scale?: number }) {
  const f = frames?.frames[`char/${id}`]?.frame;
  if (!f) return <span style={{ width: 32 * scale, height: 48 * scale, display: 'inline-block' }} />;
  return (
    <span
      className="sprite"
      aria-hidden="true"
      style={{
        width: f.w * scale,
        height: f.h * scale,
        display: 'inline-block',
        backgroundImage: `url(${import.meta.env.BASE_URL}assets/atlas/crista-atlas-0.png)`,
        backgroundPosition: `-${f.x * scale}px -${f.y * scale}px`,
        backgroundSize: `${2048 * scale}px ${2048 * scale}px`,
      }}
    />
  );
}

/**
 * 등기 뒤 갈 곳 — **고른 랩**으로 돌려보내요(주소 `?lab=` 우선 · 저장소 보조 · 항체 설계 §1.1).
 * 저분자를 골랐으면 저분자 작업 화면으로, 항체를 골랐으면 항체 설계 랩으로 가요.
 * 주소 · 저장소가 둘 다 비면 저분자로 조용히 넘기지 않고 연구소 고르기로 되돌려요(§1.1 · §1.3).
 */
const afterRegister = (): 'antibody' | 'board' | 'lab' => {
  const picked = pickedLab();
  if (picked === 'antibody') return 'antibody';
  if (picked === 'drug') return 'board';
  return 'lab';
};

export function District({ nav }: { nav: Nav }) {
  const { me, setMe, go } = nav;
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<DistrictScene | null>(null);
  const [ready, setReady] = useState(false);
  const [district, setDistrict] = useState<DistrictResponse | null>(null);
  const [frames, setFrames] = useState<AtlasFrames | null>(null);
  const [near, setNear] = useState<number | null>(null);
  const [pickAvatar, setPickAvatar] = useState(me.avatar == null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapName, setMapName] = useState(false);
  // 대사 창 · 등기 입력 창 · 도장 — 하나라도 떠 있으면 캐릭터를 멈춘다.
  const [say, setSay] = useState<(SayOptions & { resolve: (choice: number | null) => void }) | null>(null);
  const [form, setForm] = useState<Team | null>(null);
  const [stamped, setStamped] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await api.get<DistrictResponse>(API.district);
      setDistrict(next);
      return next;
    } catch (err) {
      setError(message(err));
      return null;
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const next = await api.get<MeResponse>(API.me);
    setMe(next);
    return next;
  }, [setMe]);

  const ask = useCallback((opts: SayOptions) => new Promise<number | null>((resolve) => setSay({ ...opts, resolve })), []);

  useEffect(() => {
    void load();
    fetch(`${import.meta.env.BASE_URL}assets/atlas/crista-atlas-0.json`).then((r) => r.json()).then(setFrames).catch(() => {});
  }, [load]);

  // 장면 훅은 한 번만 만든다 — 최신 상태를 읽는 함수는 ref 로 넘긴다.
  const openHqRef = useRef<(plot: number) => void>(() => {});
  const talkRef = useRef<(peer: DistrictPeer) => void>(() => {});

  // Phaser — 들어올 때 만들고 떠날 때 내린다.
  useEffect(() => {
    if (!host.current) return;
    const scene = new DistrictScene({
      onNear: setNear,
      onInteract: (plot) => openHqRef.current(plot),
      onTalk: (peer) => talkRef.current(peer),
      onMove: (x, y, dir, moving) => socket.send({ type: 'district.move', x, y, dir, moving }),
      onReady: () => setReady(true),
    });
    sceneRef.current = scene;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      backgroundColor: '#78C850',
      pixelArt: true,
      roundPixels: true,
      scale: { mode: Phaser.Scale.RESIZE, width: host.current.clientWidth, height: host.current.clientHeight },
      scene,
      banner: false,
      input: { keyboard: { target: window } },
    });
    return () => {
      socket.send({ type: 'district.exit' });
      sceneRef.current = null;
      game.destroy(true);
    };
  }, []);

  const myTeam = useMemo(() => district?.teams.find((t) => t.isMine) ?? null, [district]);

  // 광장 LED 기둥 — ③ 전광판과 같은 최근 소식(FMARKET).
  const market = useMarket();
  const plaza = plazaText(market.data);
  useEffect(() => {
    if (ready) sceneRef.current?.setPlazaNews(plaza);
  }, [ready, plaza]);

  // 지도 · 내 캐릭터
  useEffect(() => {
    const scene = sceneRef.current;
    if (!ready || !scene || !district) return;
    scene.setTeams(district.teams, district.myTeamId);
    scene.spawnMe(me.account.displayName, me.avatar ?? null, myTeam?.ink ?? null);
  }, [ready, district, me, myTeam]);

  // 지도 이름 표시(들어올 때마다) → 첫 대사(이 탭에서 한 번 — 캐릭터를 고른 뒤).
  const introDone = useRef(false);
  const hasDistrict = district !== null;
  useEffect(() => {
    if (!ready || !hasDistrict) return;
    setMapName(true);
    const t = setTimeout(() => setMapName(false), 3100);
    return () => clearTimeout(t);
  }, [ready, hasDistrict]);
  useEffect(() => {
    if (!ready || !district || pickAvatar || !me.avatar || introDone.current) return;
    introDone.current = true;
    const key = `crista:district-intro:${me.account.userId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* 저장소가 막혀도 대사는 보인다 */
    }
    const t = setTimeout(() => void ask({ face: me.avatar, name: `${me.account.displayName} · ${AVATAR_LABEL[me.avatar!]}`, text: introText(district, myTeam) }), 700);
    return () => clearTimeout(t);
  }, [ready, district, pickAvatar, me.avatar, me.account, myTeam, ask]);

  // 사옥 창문 불빛(FLEARN — 학습 연구비 단계 가동) — 학급 공개(켜진 창 수만). 들어올 때 한 번 읽고 학급 WS 'district.lights' 로 고친다.
  useEffect(() => {
    if (!ready || !district) return;
    let alive = true;
    api.get<DistrictLightsResponse>(LEARN_API.lights).then((r) => alive && sceneRef.current?.setLights(r.lights)).catch(() => {});
    const off = socket.on((msg: ServerMessage) => {
      if (msg.type === 'district.lights') sceneRef.current?.setLights(msg.lights);
    });
    return () => {
      alive = false;
      off();
    };
  }, [ready, district]);

  // 학급 채널 — 다른 학생 위치 · 입사 · 등기
  useEffect(() => {
    if (!ready) return;
    const enter = () => {
      const scene = sceneRef.current;
      if (!scene) return;
      scene.clearPeers();
      const { x, y, dir } = scene.position;
      socket.send({ type: 'district.enter', x, y, dir });
    };
    const offOpen = socket.onOpen(enter);
    const off = socket.on((msg: ServerMessage) => {
      const scene = sceneRef.current;
      if (!scene) return;
      if (msg.type === 'district.snapshot') for (const peer of msg.peers) scene.upsertPeer(peer);
      else if (msg.type === 'district.peer') scene.upsertPeer(msg.peer);
      else if (msg.type === 'district.leave') scene.removePeer(msg.userId);
      else if (msg.type === 'team.joined' || msg.type === 'team.updated' || msg.type === 'member.assigned') void load();
      else if (msg.type === 'team.registered') {
        void load();
        // 내가 낸 등기는 도장을 보이고 넘어간다 — 같은 모둠의 다른 사람에게만 알린다.
        if (msg.team.id === district?.myTeamId && msg.byName !== me.account.displayName) {
          setToast(`${msg.byName} 님이 「${msg.team.startupName}」으로 등기했어요. 곧 작업 화면으로 가요.`);
          setTimeout(() => void refreshMe().then(() => go(afterRegister())), 2500);
        }
      }
    });
    return () => {
      offOpen();
      off();
    };
  }, [ready, load, district?.myTeamId, refreshMe, go, me.account.displayName]);

  // 창이 하나라도 열리면 캐릭터를 멈춘다(입력 칸의 WASD 가 캐릭터를 움직이지 않게).
  const busyUi = pickAvatar || say !== null || form !== null || stamped !== null;
  useEffect(() => {
    sceneRef.current?.setInputEnabled(!busyUi);
  }, [busyUi, ready]);

  async function chooseAvatar(avatar: Avatar) {
    try {
      const next = await api.put<MeResponse>(API.avatar, { avatar });
      setMe(next);
      setPickAvatar(false);
    } catch (err) {
      setError(message(err));
    }
  }

  const toBoard = useCallback(async () => {
    await refreshMe();
    go(afterRegister());
  }, [refreshMe, go]);

  /** 사옥 문 — 설계 §4.2 의 네 갈래를 대사 + 선택지로. */
  async function openHq(plot: number) {
    if (!district || busyUi) return;
    const team = district.teams.find((t) => t.plot === plot);
    if (!team) return;
    const head = team.startupName ? `「${team.startupName}」 ${team.ticker ?? ''}`.trim() : `${team.plot}모둠 사옥`;
    const slogan = team.slogan ? `“${team.slogan}”\n` : '';
    const seats = `입주 ${team.memberCount}/${team.capacity}`;
    if (team.startupName) {
      if (team.isMine) {
        const c = await ask({ name: head, text: `${slogan}우리 모둠 사옥이에요.${team.registeredByName ? ` ${team.registeredByName} 님이 등기했어요.` : ''}`, choices: ['사옥에 들어가기 — 작업 화면', '그만두기'] });
        if (c === 0) await toBoard();
      } else await ask({ name: head, text: `${slogan}${seats} · 다른 모둠의 사옥이에요. 공개 정보(이름 · 티커)만 보여요.` });
      return;
    }
    if (team.isMine) {
      const c = await ask({
        face: me.avatar,
        name: me.avatar ? `${me.account.displayName} · ${AVATAR_LABEL[me.avatar]}` : me.account.displayName,
        text: `${head} · ${seats}\n우리 모둠 사옥인데 아직 간판이 없어. 스타트업 이름을 등기할까?`,
        choices: ['등기한다', '나중에'],
      });
      if (c === 0) setForm(team);
      return;
    }
    if (district.myTeamId === null && team.memberCount < team.capacity && district.class.assignment === 'walk-in') {
      const c = await ask({ name: `${head} · ${seats}`, text: '이 사옥에 입사할까요?\n입사하면 이 사옥이 우리 모둠이 되고, 바꾸려면 선생님께 말해야 해요.', choices: ['입사하기', '다른 사옥 보기'] });
      if (c !== 0) return;
      try {
        await api.post<JoinResponse>(API.join(team.id));
        const [next] = await Promise.all([load(), refreshMe()]);
        const joined = next?.teams.find((t) => t.id === team.id) ?? team;
        const again = await ask({ name: `${team.plot}모둠 사옥 · 입주 ${joined.memberCount}/${joined.capacity}`, text: `${team.plot}모둠에 입사했어요.\n아직 간판이 없어요. 이어서 스타트업 이름을 등기할까요?`, choices: ['등기한다', '나중에'] });
        if (again === 0) setForm(joined);
      } catch (err) {
        await ask({ name: head, text: message(err) });
      }
      return;
    }
    await ask({
      name: `${head} · ${seats}`,
      text: district.myTeamId
        ? '다른 모둠의 사옥이에요. 구경만 할 수 있어요.'
        : district.class.assignment === 'assigned'
          ? '선생님이 모둠을 정해 주실 거예요. 우리 모둠 사옥만 열려요.'
          : '이 사옥은 정원이 찼어요. 다른 사옥을 골라 주세요.',
    });
  }

  /** 친구 앞 Z — 말을 지어내지 않고, 누구인지 · 어느 모둠인지만. */
  async function talk(peer: DistrictPeer) {
    if (!district || busyUi) return;
    const team = district.teams.find((t) => t.ink === peer.ink) ?? null;
    const label = team ? (team.startupName ? `「${team.startupName}」` : `${team.plot}모둠`) : null;
    const text = !team
      ? '아직 입사하지 않은 친구예요.'
      : team.isMine
        ? `같은 모둠 친구예요. ${team.startupName ? `「${team.startupName}」 사옥에 들어가 함께 작업해요.` : '우리 사옥 문 앞에서 함께 스타트업 이름을 등기해요.'}`
        : `${label} 모둠원이에요.`;
    await ask({ face: peer.avatar, name: peer.avatar ? `${peer.displayName} · ${AVATAR_LABEL[peer.avatar]}` : peer.displayName, text });
  }

  openHqRef.current = (plot) => void openHq(plot);
  talkRef.current = (peer) => void talk(peer);

  const stamp = useCallback(
    async (name: string) => {
      setForm(null);
      setStamped(name);
      setShake(true);
      setTimeout(() => setShake(false), 450);
      await Promise.all([load(), refreshMe()]);
      setTimeout(() => void toBoard(), 1600);
    },
    [load, refreshMe, toBoard],
  );

  const nearTeam = near !== null ? (district?.teams.find((t) => t.plot === near) ?? null) : null;

  return (
    <div className={`district${shake ? ' shake' : ''}`}>
      <div ref={host} style={{ position: 'absolute', inset: 0, top: 56 }} aria-label="사옥 지구 — 방향키 · WASD 로 걷고, 사옥 문 앞에서 Z · E" />
      <header className="d-hud">
        <b>사옥 지구</b>
        <span className="muted mini">{district ? `${district.class.name} · 모둠 ${district.class.teamCount}개 · ${district.class.assignment === 'walk-in' ? '처음 문을 연 사옥이 내 모둠' : '선생님이 모둠을 정해요'}` : '…'}</span>
        <span className="grow" />
        {myTeam && (
          <span className="badge">
            <i className="inkd" style={{ background: ink(myTeam.ink).base }} /> {myTeam.startupName ?? `${myTeam.plot}모둠`} {myTeam.ticker ?? ''}
          </span>
        )}
        <button className="btn sm" type="button" onClick={() => setPickAvatar(true)}>캐릭터</button>
        {me.next === 'board' && (
          <button className="btn sm pri" type="button" onClick={() => go(afterRegister())}>랩으로</button>
        )}
        <button className="btn sm" type="button" onClick={() => void nav.logout()}>나가기</button>
      </header>
      {error && <p className="err" style={{ position: 'absolute', top: 70, left: 16, right: 16 }} role="alert">{error}</p>}
      {mapName && district && <MapName title="사옥 지구" sub={`${district.class.name} · 모둠 ${district.class.teamCount}개`} />}
      {!busyUi && (
        <div className="d-help">
          방향키 · WASD 로 걷거나 바닥을 눌러 이동해요. {myTeam ? '「우리 모둠」 사옥 문 앞에서 Z 를 눌러 들어가요.' : '입사할 사옥 문 앞에서 Z 를 눌러요.'} 친구 앞에서 Z 를 누르면 말을 걸어요.
          <span className="muted"> · 지구 {WIDTH / 32}×{HEIGHT / 32}칸</span>
        </div>
      )}
      {nearTeam && !busyUi && (
        <button type="button" className="d-prompt" onClick={() => void openHq(nearTeam.plot)}>
          <kbd>Z</kbd> 들어가기 — {nearTeam.startupName ?? `${nearTeam.plot}모둠 사옥`}
        </button>
      )}
      {toast && <p className="rpg-win rpg-toast" role="status">{toast}</p>}

      {say && (
        <RpgMessage
          key={`${say.name ?? ''}|${say.text}`}
          say={say}
          frames={frames}
          onDone={(choice) => {
            setSay(null);
            say.resolve(choice);
          }}
        />
      )}
      {form && <RegisterWindow team={form} teams={district?.teams ?? []} onCancel={() => setForm(null)} onStamped={stamp} onAlready={toBoard} />}
      {stamped && <RpgStamp name={stamped} />}

      {pickAvatar && (
        <div className="modal-back">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="pick-h">
            <h2 id="pick-h">캐릭터를 골라요</h2>
            <p className="muted mini">능력 차이는 없어요. 작업 화면의 비교표 · 연구 노트에 직책 배지로 보여요. 나중에 바꿀 수 있어요.</p>
            <div className="avatars">
              {AVATARS.map((a) => (
                <button key={a} type="button" className="avatar-opt" aria-pressed={me.avatar === a} onClick={() => void chooseAvatar(a)}>
                  <CharSprite id={a} frames={frames} />
                  <b className="mono">{AVATAR_LABEL[a]}</b>
                  <span className="mini muted" style={{ textAlign: 'center' }}>{AVATAR_HINT[a]}</span>
                </button>
              ))}
            </div>
            {me.avatar && <button type="button" className="close" aria-label="닫기" onClick={() => setPickAvatar(false)}>×</button>}
          </div>
        </div>
      )}
    </div>
  );
}

/** 설립 등기 입력 창 — 대사 창 모양. 규칙은 그대로(`checkRegistration` · 티커 자동 제안 · 먼저 낸 사람 이름으로). */
function RegisterWindow({ team, teams, onCancel, onStamped, onAlready }: {
  team: Team;
  teams: Team[];
  onCancel: () => void;
  onStamped: (name: string) => Promise<void>;
  onAlready: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [tickerTouched, setTickerTouched] = useState(false);
  const [slogan, setSlogan] = useState('');

  useEffect(() => {
    if (!tickerTouched) setTicker(suggestTicker(name) ?? '');
  }, [name, tickerTouched]);

  async function register(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const checked = checkRegistration({ name, ticker, slogan });
    if (!checked.ok) return setError(checked.message);
    if (teams.some((t) => t.id !== team.id && t.ticker === checked.value.ticker)) return setError(`${checked.value.ticker} 는 이미 다른 모둠이 쓰고 있어요.`);
    setBusy(true);
    try {
      const res = await api.post<RegistrationResponse>(API.registration(team.id), { name: checked.value.name, ticker: checked.value.ticker, slogan: checked.value.slogan });
      await onStamped(`${res.team.startupName ?? checked.value.name} ${res.team.ticker ?? checked.value.ticker}`);
    } catch (err) {
      if (err instanceof ApiFailure && err.code === 'already_registered') {
        setError(`${err.message} 작업 화면으로 갈게요.`);
        setTimeout(() => void onAlready(), 1500);
      } else setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <RpgForm
      title={`${team.plot}모둠 사옥 · 설립 등기`}
      note="모둠에 한 번만 — 먼저 낸 사람의 이름으로 정해져요. 첫 연구를 시작하기 전까지는 작업 화면에서 고칠 수 있어요."
      onSubmit={register}
      onCancel={onCancel}
      submitLabel="설립 등기"
      busy={busy}
      error={error}
    >
      <label className="rpg-fld" htmlFor="sn">
        스타트업 이름
        <input id="sn" value={name} onChange={(e) => setName(e.target.value)} placeholder="2~14자 · 한글 · 영문 · 숫자" maxLength={14} autoFocus autoComplete="off" />
      </label>
      <label className="rpg-fld" htmlFor="tk">
        티커(영문 3~4자)
        <input id="tk" className="mono" value={ticker} onChange={(e) => (setTickerTouched(true), setTicker(e.target.value.toUpperCase()))} placeholder="이름에서 제안" maxLength={4} autoComplete="off" />
      </label>
      <label className="rpg-fld" htmlFor="sl">
        슬로건(선택)
        <input id="sl" value={slogan} onChange={(e) => setSlogan(e.target.value)} maxLength={40} autoComplete="off" />
      </label>
    </RpgForm>
  );
}
