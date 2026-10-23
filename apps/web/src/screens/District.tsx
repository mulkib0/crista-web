/**
 * ② 사옥 지구(설계 §4) — Phaser 캔버스 + React 겹 화면(위 띠 · 캐릭터 고르기 · 사옥 패널 · 등기 도장).
 *
 * - 처음 들어오면 캐릭터(CEO · CSO · CTO · CMO)를 고른다 — 능력치 · 잠금 없음, ③ 의 직책 배지가 된다.
 * - 사옥 문 앞에서 E(또는 사옥 누르기) → 패널: 입사(walk-in) · 구경(남의 사옥) · 등기(우리 사옥, 이름 전) · ③ 으로(등기 뒤).
 * - 같은 모둠의 누가 등기하면 학급 채널 `team.registered` 로 알고 ③ 으로 넘어간다(설계 §4.3).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import * as Phaser from 'phaser';
import {
  API,
  AVATARS,
  checkRegistration,
  suggestTicker,
  type Avatar,
  type DistrictResponse,
  type JoinResponse,
  type MeResponse,
  type RegistrationResponse,
  type ServerMessage,
} from '@crista-web/web-contract';
import type { Nav } from '../App.tsx';
import { api, ApiFailure, message } from '../api.ts';
import { DistrictScene } from '../district/DistrictScene.ts';
import { HEIGHT, WIDTH } from '../district/map.ts';
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

interface AtlasFrames {
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
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

export function District({ nav }: { nav: Nav }) {
  const { me, setMe, go } = nav;
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<DistrictScene | null>(null);
  const [ready, setReady] = useState(false);
  const [district, setDistrict] = useState<DistrictResponse | null>(null);
  const [frames, setFrames] = useState<AtlasFrames | null>(null);
  const [near, setNear] = useState<number | null>(null);
  const [panel, setPanel] = useState<number | null>(null);
  const [pickAvatar, setPickAvatar] = useState(me.avatar == null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDistrict(await api.get<DistrictResponse>(API.district));
    } catch (err) {
      setError(message(err));
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const next = await api.get<MeResponse>(API.me);
    setMe(next);
    return next;
  }, [setMe]);

  useEffect(() => {
    void load();
    fetch(`${import.meta.env.BASE_URL}assets/atlas/crista-atlas-0.json`).then((r) => r.json()).then(setFrames).catch(() => {});
  }, [load]);

  // Phaser — 들어올 때 만들고 떠날 때 내린다.
  useEffect(() => {
    if (!host.current) return;
    const scene = new DistrictScene({
      onNear: setNear,
      onInteract: (plot) => setPanel(plot),
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

  // 지도 · 내 캐릭터
  useEffect(() => {
    const scene = sceneRef.current;
    if (!ready || !scene || !district) return;
    scene.setTeams(district.teams, district.myTeamId);
    scene.spawnMe(me.account.displayName, me.avatar ?? null, myTeam?.ink ?? null);
  }, [ready, district, me, myTeam]);

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
        // 내가 낸 등기는 사옥 패널이 도장을 보이고 넘어간다 — 같은 모둠의 다른 사람에게만 알린다.
        if (msg.team.id === district?.myTeamId && msg.byName !== me.account.displayName) {
          setToast(`${msg.byName} 님이 「${msg.team.startupName}」으로 등기했어요. 곧 작업 화면으로 가요.`);
          setTimeout(() => void refreshMe().then(() => go('board')), 2500);
        }
      }
    });
    return () => {
      offOpen();
      off();
    };
  }, [ready, load, district?.myTeamId, refreshMe, go, me.account.displayName]);

  // 패널 · 고르기 창이 열리면 캐릭터를 멈춘다(입력 칸의 WASD 가 캐릭터를 움직이지 않게).
  useEffect(() => {
    sceneRef.current?.setInputEnabled(panel === null && !pickAvatar);
  }, [panel, pickAvatar, ready]);

  async function chooseAvatar(avatar: Avatar) {
    try {
      const next = await api.put<MeResponse>(API.avatar, { avatar });
      setMe(next);
      setPickAvatar(false);
    } catch (err) {
      setError(message(err));
    }
  }

  const panelTeam = panel !== null ? (district?.teams.find((t) => t.plot === panel) ?? null) : null;

  return (
    <div className="district">
      <div ref={host} style={{ position: 'absolute', inset: 0, top: 56 }} aria-label="사옥 지구 — 방향키 · WASD 로 걷고, 사옥 문 앞에서 E" />
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
          <button className="btn sm pri" type="button" onClick={() => go('board')}>작업 화면으로</button>
        )}
        <button className="btn sm" type="button" onClick={() => void nav.logout()}>나가기</button>
      </header>
      {error && <p className="err" style={{ position: 'absolute', top: 70, left: 16, right: 16 }} role="alert">{error}</p>}
      <div className="d-help">
        방향키 · WASD 로 걷거나 바닥을 눌러 이동해요. {myTeam ? '「우리 모둠」 사옥 문 앞에서 E 를 눌러 들어가요.' : '입사할 사옥 문 앞에서 E 를 눌러요.'}
        <span className="muted"> · 지구 {WIDTH / 32}×{HEIGHT / 32}칸</span>
      </div>
      {near !== null && panel === null && !pickAvatar && (
        <button type="button" className="d-prompt" onClick={() => setPanel(near)}>
          E 들어가기 — {district?.teams.find((t) => t.plot === near)?.startupName ?? `${near}모둠 사옥`}
        </button>
      )}
      {toast && <p className="ok-msg" style={{ position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)' }} role="status">{toast}</p>}

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

      {panelTeam && district && (
        <HqPanel
          team={panelTeam}
          district={district}
          onClose={() => setPanel(null)}
          onChanged={async () => {
            await load();
            await refreshMe();
          }}
          onBoard={async () => {
            await refreshMe();
            go('board');
          }}
        />
      )}
    </div>
  );
}

function HqPanel({ team, district, onClose, onChanged, onBoard }: {
  team: Team;
  district: DistrictResponse;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onBoard: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [tickerTouched, setTickerTouched] = useState(false);
  const [slogan, setSlogan] = useState('');
  const [stamped, setStamped] = useState<string | null>(null);
  const color = ink(team.ink);

  useEffect(() => {
    if (!tickerTouched) setTicker(suggestTicker(name) ?? '');
  }, [name, tickerTouched]);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      await api.post<JoinResponse>(API.join(team.id));
      await onChanged();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  async function register(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const checked = checkRegistration({ name, ticker, slogan });
    if (!checked.ok) return setError(checked.message);
    setBusy(true);
    try {
      const res = await api.post<RegistrationResponse>(API.registration(team.id), { name: checked.value.name, ticker: checked.value.ticker, slogan: checked.value.slogan });
      setStamped(res.team.startupName);
      await onChanged();
      setTimeout(() => void onBoard(), 1600);
    } catch (err) {
      if (err instanceof ApiFailure && err.code === 'already_registered') {
        setError(`${err.message} 작업 화면으로 갈게요.`);
        setTimeout(() => void onBoard(), 1500);
      } else setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  const mine = team.isMine;
  const registered = !!team.startupName;
  return (
    <div className="modal-back" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="hq-h">
        <button type="button" className="close" aria-label="닫기" onClick={onClose}>×</button>
        <p className="eyebrow"><i className="inkd" style={{ background: color.base }} /> {team.plot}모둠 사옥 · 입주 {team.memberCount}/{team.capacity}</p>
        <h2 id="hq-h">{registered ? `「${team.startupName}」 ${team.ticker}` : mine ? '우리 모둠 사옥 — 스타트업 이름 등기' : `${team.plot}모둠 사옥`}</h2>
        {team.slogan && <p className="muted">“{team.slogan}”</p>}

        {stamped ? (
          <div style={{ textAlign: 'center' }}>
            <div className="stamp" role="status">설립 등기<small>{stamped}</small></div>
            <p>등기했어요. 작업 화면으로 가요…</p>
          </div>
        ) : registered ? (
          <>
            <p className="mini muted">{team.registeredByName ? `${team.registeredByName} 님이 등기했어요.` : ''}</p>
            {mine ? (
              <div className="acts"><button className="btn pri" type="button" onClick={() => void onBoard()}>사옥에 들어가기 — 작업 화면</button></div>
            ) : (
              <p className="mini">다른 모둠의 사옥이에요. 공개 정보(이름 · 티커)만 보여요.</p>
            )}
          </>
        ) : mine ? (
          <form onSubmit={register} noValidate>
            <p className="mini muted">모둠에 한 번만 — 먼저 낸 사람의 이름으로 정해져요. 첫 연구를 시작하기 전까지는 작업 화면에서 고칠 수 있어요.</p>
            <div className="fld">
              <label className="lab" htmlFor="sn">스타트업 이름</label>
              <input id="sn" className="txt" value={name} onChange={(e) => setName(e.target.value)} placeholder="2~14자 · 한글 · 영문 · 숫자 · 공백 한 칸" maxLength={14} autoFocus />
            </div>
            <div className="fld">
              <label className="lab" htmlFor="tk">티커</label>
              <input id="tk" className="txt mono" value={ticker} onChange={(e) => (setTickerTouched(true), setTicker(e.target.value.toUpperCase()))} placeholder="영문 대문자 3~4자" maxLength={4} />
              <p className="hint">이름에서 자동으로 제안해요. 학급 안에서 겹치면 안 돼요.</p>
            </div>
            <div className="fld">
              <label className="lab" htmlFor="sl">슬로건(선택)</label>
              <input id="sl" className="txt" value={slogan} onChange={(e) => setSlogan(e.target.value)} maxLength={40} />
            </div>
            {error && <p className="err" role="alert" style={{ marginTop: 12 }}>{error}</p>}
            <div className="acts" style={{ marginTop: 14 }}>
              <button className="btn film" type="submit" disabled={busy}>설립 등기</button>
            </div>
          </form>
        ) : district.myTeamId === null && team.memberCount < team.capacity && district.class.assignment === 'walk-in' ? (
          <>
            <p>이 사옥에 입사할까요? 입사하면 이 사옥이 우리 모둠이 되고, 바꾸려면 선생님께 말해야 해요.</p>
            {error && <p className="err" role="alert">{error}</p>}
            <div className="acts" style={{ marginTop: 12 }}>
              <button className="btn pri" type="button" disabled={busy} onClick={() => void join()}>입사하기</button>
              <button className="btn" type="button" onClick={onClose}>다른 사옥 보기</button>
            </div>
          </>
        ) : (
          <p className="mini">
            {district.myTeamId
              ? '다른 모둠의 사옥이에요. 구경만 할 수 있어요.'
              : district.class.assignment === 'assigned'
                ? '선생님이 모둠을 정해 주실 거예요. 우리 모둠 사옥만 열려요.'
                : '이 사옥은 정원이 찼어요. 다른 사옥을 골라 주세요.'}
          </p>
        )}
        {error && registered && <p className="err" role="alert">{error}</p>}
      </div>
    </div>
  );
}
