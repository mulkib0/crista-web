/**
 * 1.1 질환 · 표적 선정(설계 §6.4 · §5.4.2) — 왼쪽 = 내 작업대 도구 5종(걸음 탭) + 공통 추천 서랍, 오른쪽 = 모둠 추천 카드 · 표적 확정.
 * 왼쪽 섬 = 개인 작업대(이 브라우저에만 — 다른 모둠원의 입력 칸을 흔들지 않는다), 오른쪽 섬 = 모둠 공유(서버 저장 · 실시간).
 *
 * 도구(시안 design/target-select-10.html 01~05 — 순서가 아니라 나란한 도구라 번호 없는 '보기' 토글): 질환 지도 → 열지도 · 관계망 · 내 점수(가중치) · 32개 한눈에(산점도) · 카드 뒤집기.
 * 다음 단계로는 바닥 띠가 데려간다 — 남은 일(모둠 표적 확정)은 추천 카드(없으면 추천 서랍)를 가리킨다.
 * 데이터는 질환 4종을 각각 `API.diseaseTargets` 로 받아 표적 8개씩(`targetShortlist`) 쓴다. 추천 근거 코치는 서버와 같은 함수(`checkTargetPickReasons`).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  API,
  checkTargetPickReasons,
  PICK_REASON_NOTE_MAX,
  PICK_WEIGHT,
  PICK_WEIGHT_PRESETS,
  TARGET_DISEASE_GROUPS,
  TARGET_EVIDENCE,
  TARGET_PICK_REASONS,
  TARGET_TIER,
  targetDiseaseTile,
  targetKoName,
  targetShortlist,
  targetTier,
  type BoardResponse,
  type DiseaseTargetsResponse,
  type TargetPickCheck,
  type TargetPickRequest,
  type TargetPickView,
  type TargetRow,
} from '@crista-web/web-contract';
import { api, message } from '../../api.ts';
import { By } from '../parts.tsx';
import { Panel, ReasonChips, useBenchState, useLocalTab, type TabItem } from '../ui/index.ts';
import { currentTarget, StepLayout, useAction, type StepProps } from './common.tsx';
import { BackFace, EV_COLOR, EvBars, f2, f3, FlipCard, HeatMap, myRows, n0, NetMap, rankIn, readyOf, Scatter, StackBars, TierSig, type DData, type Flag, type TRow } from './s11-viz.tsx';
import './s11.css';

const TABS = ['map', 'net', 'weigh', 'scatter', 'cards'] as const;
type Tab = (typeof TABS)[number];
const TAB_ITEMS: TabItem[] = [
  { id: 'map', label: '질환 지도', sub: '질환군 타일 → 근거 열지도' },
  { id: 'net', label: '관계망', sub: '질환-유전자 망에서 점 고르기' },
  { id: 'weigh', label: '내 점수', sub: '가중치로 32개 다시 줄 세우기' },
  { id: 'scatter', label: '32개 한눈에', sub: '점수 × 약물 근거 산점도' },
  { id: 'cards', label: '카드 뒤집기', sub: '점수만 보고 고른 뒤 구조 확인' },
];

interface Sel {
  diseaseId: string;
  symbol: string;
}
interface Filt {
  g: boolean[];
  ready: boolean;
  gen: boolean;
}

/** 질환별 표적 자료 — 단계를 오가도 다시 받지 않는다(서버도 10분 캐시). */
const loaded = new Map<string, DiseaseTargetsResponse>();

function useDiseaseData(board: BoardResponse) {
  const [data, setData] = useState<Record<string, DiseaseTargetsResponse>>(() => Object.fromEntries(loaded));
  const [error, setError] = useState<string | null>(null);
  const ids = board.diseases.map((d) => d.diseaseId).join(',');
  useEffect(() => {
    let live = true;
    for (const id of ids.split(',').filter(Boolean)) {
      if (loaded.has(id)) continue;
      api.get<DiseaseTargetsResponse>(API.diseaseTargets(id))
        .then((res) => {
          loaded.set(id, res);
          if (live) setData((d) => ({ ...d, [id]: res }));
        })
        .catch((e) => live && setError(message(e)));
    }
    return () => {
      live = false;
    };
  }, [ids]);
  const ds = useMemo<DData[]>(
    () =>
      board.diseases.flatMap((option, i) => {
        const res = data[option.diseaseId];
        if (!res) return [];
        const cat = targetDiseaseTile(option.diseaseId);
        return [{
          id: option.diseaseId,
          option,
          name: option.label,
          short: cat?.tile.short ?? option.label,
          blurb: cat?.tile.blurb ?? null,
          assoc: res.totalAssociatedCount,
          list: targetShortlist(res.targets),
          idx: i,
          group: cat?.group ?? i,
          color: `var(--d${(i % 4) + 1})`,
        }];
      }),
    [board.diseases, data],
  );
  return { ds, error, ready: ds.length === board.diseases.length };
}

export function Step11({ board, step, bench, setBench, reload }: StepProps) {
  const [tab, setTab] = useLocalTab<Tab>('step:1.1', TABS, 'map');
  const { ds, error: loadErr, ready: allLoaded } = useDiseaseData(board);
  const all = useMemo<TRow[]>(() => ds.flatMap((d) => d.list.map((t) => ({ t, d }))), [ds]);
  const [sel, setSel] = useBenchState<Sel | null>('s11:sel', null);
  const [weights, setWeights] = useBenchState<number[]>('s11:w', [1, 1, 1, 1]);

  const cur = ds.find((d) => d.id === bench.diseaseId) ?? ds[0] ?? null;
  const selD = sel ? (ds.find((d) => d.id === sel.diseaseId) ?? null) : null;
  const selT = selD && sel ? (selD.list.find((t) => t.symbol === sel.symbol) ?? null) : null;
  // 한 줄 이유는 질환마다 다르게 쓰므로 다른 질환으로 옮기면 비운다(근거 칩은 남긴다 — 코치가 새 표적으로 다시 짚는다).
  const pickDisease = (id: string) => {
    if (id !== sel?.diseaseId) setSel(null);
    setBench((b) => ({ ...b, diseaseId: id, pickNote: id === b.diseaseId ? b.pickNote : '' }));
  };
  const pickTarget = (diseaseId: string, symbol: string) => {
    setSel({ diseaseId, symbol });
    setBench((b) => ({ ...b, diseaseId, pickNote: diseaseId === b.diseaseId ? b.pickNote : '' }));
  };

  const flags: Flag[] = board.picks.map((p) => {
    const d = ds.find((x) => x.id === p.diseaseId);
    return { diseaseId: p.diseaseId, symbol: (d && readyOf(d)?.symbol) ?? board.diseases.find((o) => o.diseaseId === p.diseaseId)?.gene ?? '', initial: p.byName.slice(0, 1), name: p.byName };
  });

  const drawer = selD && selT ? (
    <PickDrawer board={board} d={selD} t={selT} weights={weights} note={bench.pickNote} setNote={(v) => setBench((b) => ({ ...b, pickNote: v }))}
      onGoReady={(sym) => pickTarget(selD.id, sym)} reload={reload} back={tab === 'scatter'} />
  ) : (
    <div className="s11-empty">{tab === 'cards' ? '✓ 카드를 뒤집으면 그 표적의 추천 서랍이 여기 열려요.' : '표적을 누르면 근거와 구조 준비 상태가 여기 열려요.'}</div>
  );

  const confirmed = currentTarget(board);
  return (
    <StepLayout
      board={board}
      step={step}
      tabs={TAB_ITEMS}
      tab={tab}
      onTab={(id) => setTab(id as Tab)}
      tabsLabel="1.1 내 작업대 도구"
      ratio="mine"
      go={{ target: { spot: board.picks.length ? 'go-s11-cards' : 'go-s11-drawer' } }}
      mine={
        <div className="s11">
          {loadErr && <p className="err">{loadErr}</p>}
          {!cur ? (
            <Panel><p className="muted" style={{ margin: 0 }}>{loadErr ? '표적 자료를 불러오지 못했어요.' : '표적 자료를 불러오는 중…'}</p></Panel>
          ) : (
            <>
              {tab === 'map' && <MapTool ds={ds} cur={cur} sel={sel} onDisease={pickDisease} onPick={pickTarget} />}
              {tab === 'net' && <NetTool ds={ds} cur={cur} sel={sel} onDisease={pickDisease} onPick={pickTarget} />}
              {tab === 'weigh' && (allLoaded ? <WeighTool all={all} weights={weights} setWeights={setWeights} sel={sel} onPick={pickTarget} /> : <Panel><p className="muted" style={{ margin: 0 }}>질환 4종 자료를 모으는 중…</p></Panel>)}
              {tab === 'scatter' && (allLoaded ? <ScatterTool all={all} sel={sel} onPick={pickTarget} /> : <Panel><p className="muted" style={{ margin: 0 }}>질환 4종 자료를 모으는 중…</p></Panel>)}
              {tab === 'cards' && <CardsTool ds={ds} cur={cur} sel={sel} onDisease={pickDisease} onPick={pickTarget} />}
              <section className="s11-drawer" id="go-s11-drawer" aria-label="추천 서랍">
                <h3 className="s11-lab">추천 서랍</h3>
                {drawer}
              </section>
            </>
          )}
        </div>
      }
      teamTitle="모둠 공유 — 추천 카드 · 확정"
      team={
        <div className="s11">
          <Panel title="모둠 표적" sub={board.program.targetSetByName ? `${board.program.targetSetByName} 님이 확정` : '아직 없음'}>
            {confirmed ? (
              <p style={{ margin: 0 }}><b>{confirmed.label}</b> — {confirmed.gene} {confirmed.targetLabel} · PDB {confirmed.pdbId} · 대조군 {confirmed.referenceLigand.name}(ΔG {confirmed.referenceKcal} kcal/mol)</p>
            ) : (
              <p className="muted" style={{ margin: 0 }}>추천 카드를 비교해 하나를 확정해요. 바꾸면 2.x 근거는 새 표적으로 다시 쌓아야 해요.</p>
            )}
          </Panel>
          {tab === 'net' && ds.length > 0 && <TeamNets ds={ds} sel={sel} flags={flags} onPick={pickTarget} />}
          {tab === 'weigh' && allLoaded && <TeamWeights board={board} all={all} myWeights={weights} />}
          {tab === 'scatter' && allLoaded && (
            <Panel title="모둠 깃발" sub="올린 카드 자리">
              <Scatter all={all} sel={sel} flags={flags} compact onPick={(r) => pickTarget(r.d.id, r.t.symbol)} />
            </Panel>
          )}
          <PickCards board={board} ds={ds} reload={reload} />
        </div>
      }
    />
  );
}

// ── 질환 고르기 부품 ──

function DiseaseChips({ ds, cur, onDisease }: { ds: DData[]; cur: DData; onDisease: (id: string) => void }) {
  return (
    <div className="s11-dchips" role="group" aria-label="질환 고르기">
      {ds.map((d) => (
        <button key={d.id} type="button" className="s11-dchip" aria-pressed={cur.id === d.id} onClick={() => onDisease(d.id)}>
          <i style={{ background: d.color }} aria-hidden="true" />{d.name}
        </button>
      ))}
      <button type="button" className="s11-dchip off" disabled title="설계 §6.1.1 나머지 8질환 — crista bio-worker 에 표적 데이터를 넣으면 열려요">+ 8질환 준비 중</button>
    </div>
  );
}

interface ToolProps {
  ds: DData[];
  cur: DData;
  sel: Sel | null;
  onDisease: (id: string) => void;
  onPick: (diseaseId: string, symbol: string) => void;
}

// ① 질환 지도 → 열지도
function MapTool({ ds, cur, sel, onDisease, onPick }: ToolProps) {
  return (
    <>
      <Panel title="① 질환 고르기" sub="질환군 4 × 3">
        <div className="s11-grp4">
          {TARGET_DISEASE_GROUPS.map((g) => (
            <div key={g.no} className="s11-grp">
              <div className="s11-grp-h"><b>{g.no}</b>{g.title}</div>
              {g.diseases.map((c) => {
                const d = ds.find((x) => x.id === c.mondoId);
                if (!d) {
                  return (
                    <button key={c.mondoId} type="button" className="s11-tile off" disabled title="crista bio-worker 에 표적 데이터를 넣으면 열려요">
                      <span className="nm">{c.name}</span>
                      <small>{c.gene} · {c.pdbId} · 데이터 준비 중</small>
                    </button>
                  );
                }
                return (
                  <button key={c.mondoId} type="button" className="s11-tile" aria-pressed={cur.id === d.id} onClick={() => onDisease(d.id)}>
                    <span className="nm"><i style={{ background: d.color }} aria-hidden="true" />{d.name}</span>
                    <small>연관 표적 {n0(d.assoc)} · 도킹 {d.option.gene} · {d.option.cns ? '뇌까지' : '뇌 밖'}</small>
                    {d.blurb && <span className="bl">{d.blurb}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </Panel>
      <Panel title={`② 표적 고르기 — ${cur.name} 근거 열지도`} sub="Open Targets v4">
        <HeatMap d={cur} sel={sel?.diseaseId === cur.id ? sel.symbol : null} onPick={(s) => onPick(cur.id, s)} />
      </Panel>
    </>
  );
}

// ② 망 둘러보기
function NetTool({ ds, cur, sel, onDisease, onPick }: ToolProps) {
  return (
    <>
      <Panel>
        <DiseaseChips ds={ds} cur={cur} onDisease={onDisease} />
      </Panel>
      <Panel title={`${cur.name} 관계망`} sub="거리 = 점수 · 모양 = 준비 상태">
        <NetMap d={cur} sel={sel?.diseaseId === cur.id ? sel.symbol : null} onPick={(s) => onPick(cur.id, s)} />
      </Panel>
    </>
  );
}

// ③ 내 기준으로 줄 세우기
function WeighTool({ all, weights, setWeights, sel, onPick }: { all: TRow[]; weights: number[]; setWeights: (w: number[]) => void; sel: Sel | null; onPick: (diseaseId: string, symbol: string) => void }) {
  const [showAll, setShowAll] = useBenchState('s11:all', false);
  return (
    <>
      <Panel title="내 기준 정하기" sub="근거마다 얼마나 중요하게 볼까">
        <div className="s11-ctl">
          {TARGET_EVIDENCE.map((e, k) => (
            <label key={e.key} htmlFor={`s11w${k}`}>
              <span><i className="s11-sw" style={{ background: EV_COLOR[k] }} aria-hidden="true" />{e.label} 가중치 <output htmlFor={`s11w${k}`}>× {weights[k]}</output></span>
              <input id={`s11w${k}`} type="range" min={PICK_WEIGHT.min} max={PICK_WEIGHT.max} step={PICK_WEIGHT.step} value={weights[k]}
                onChange={(ev) => setWeights(weights.map((w, i) => (i === k ? Number(ev.target.value) : w)))} />
            </label>
          ))}
        </div>
        <div className="s11-row">
          <span className="s11-lab">빠른 설정</span>
          {PICK_WEIGHT_PRESETS.map((p) => (
            <button key={p.label} type="button" className="btn sm" aria-pressed={p.weights.every((w, i) => w === weights[i])} onClick={() => setWeights([...p.weights])}>{p.label}</button>
          ))}
        </div>
      </Panel>
      <Panel title="32개 표적 — 내 점수 순" sub={`가중치 ${weights.join(' · ')}`}>
        <StackBars all={all} w={weights} sel={sel} showAll={showAll} onPick={(r) => onPick(r.d.id, r.t.symbol)} />
        <div className="s11-row">
          {TARGET_EVIDENCE.map((e, k) => <span key={e.key} className="chip"><i className="s11-sw" style={{ background: EV_COLOR[k] }} aria-hidden="true" />{e.label}</span>)}
          <button type="button" className="btn sm" aria-pressed={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? '상위 14만' : '32개 모두 보기'}</button>
        </div>
      </Panel>
    </>
  );
}

// ④ 32개 한눈에
function ScatterTool({ all, sel, onPick }: { all: TRow[]; sel: Sel | null; onPick: (diseaseId: string, symbol: string) => void }) {
  const [f, setF] = useBenchState<Filt>('s11:filt', { g: [true, true, true, true], ready: false, gen: false });
  const [hover, setHover] = useState<string | null>(null);
  const dim = (r: TRow) => !(f.g[r.d.group] !== false && (!f.ready || !!r.t.dockingTargetId) && (!f.gen || r.t.geneticScore >= 0.9));
  const ds = [...new Map(all.map((r) => [r.d.id, r.d])).values()];
  return (
    <>
      <Panel>
        <div className="s11-row" role="group" aria-label="산점도 필터">
          {TARGET_DISEASE_GROUPS.map((g, i) => (
            <button key={g.no} type="button" className="btn sm" aria-pressed={f.g[i] !== false} onClick={() => setF({ ...f, g: f.g.map((v, j) => (j === i ? !v : v)) })}>{g.no} {g.title}</button>
          ))}
          <span className="s11-bar" aria-hidden="true" />
          <button type="button" className="btn sm" aria-pressed={f.ready} onClick={() => setF({ ...f, ready: !f.ready })}>◆ 도킹 준비됨만</button>
          <button type="button" className="btn sm" aria-pressed={f.gen} onClick={() => setF({ ...f, gen: !f.gen })}>유전 근거 0.9 이상</button>
        </div>
      </Panel>
      <Panel title="32개 표적 — 종합 점수 × 약물 근거" sub="필터에 안 맞는 점은 흐리게">
        <Scatter all={all} sel={sel} dim={dim} onHover={setHover} onPick={(r) => onPick(r.d.id, r.t.symbol)} />
        <div className="s11-row">
          {ds.map((d) => <span key={d.id} className="chip"><i className="s11-sw round" style={{ background: d.color }} aria-hidden="true" />{d.name}</span>)}
        </div>
        {hover && <p className="s11-note" aria-live="polite">{hover}</p>}
      </Panel>
    </>
  );
}

// ⑤ 카드 뒤집기
function CardsTool({ ds, cur, sel, onDisease, onPick }: ToolProps) {
  const [flipped, setFlipped] = useBenchState<Record<string, string[]>>('s11:flip', {});
  const fl = flipped[cur.id] ?? [];
  const rd = readyOf(cur);
  const found = !!rd && fl.includes(rd.symbol);
  const flip = (t: TargetRow) => {
    const on = fl.includes(t.symbol);
    setFlipped({ ...flipped, [cur.id]: on ? fl.filter((s) => s !== t.symbol) : [...fl, t.symbol] });
    if (!on && t.dockingTargetId) onPick(cur.id, t.symbol);
  };
  const allOn = fl.length === cur.list.length;
  return (
    <>
      <Panel><DiseaseChips ds={ds} cur={cur} onDisease={onDisease} /></Panel>
      <Panel title={`${cur.name} 카드 ${cur.list.length}장`} sub="어느 카드가 2.1 도킹으로 갈 수 있을까">
        <div className="s11-row">
          <button type="button" className="btn sm" aria-pressed={allOn} onClick={() => setFlipped({ ...flipped, [cur.id]: allOn ? [] : cur.list.map((t) => t.symbol) })}>{allOn ? '모두 앞면으로' : '모두 뒤집기'}</button>
        </div>
        <div className="s11-cards">
          {cur.list.map((t, i) => <FlipCard key={t.symbol} t={t} d={cur} i={i} on={fl.includes(t.symbol)} sel={sel?.diseaseId === cur.id && sel.symbol === t.symbol} onFlip={() => flip(t)} />)}
        </div>
        {found && rd && !(sel?.diseaseId === cur.id && sel.symbol === rd.symbol) && (
          <div className="acts"><button type="button" className="btn pri sm" onClick={() => onPick(cur.id, rd.symbol)}>{rd.symbol} 추천 서랍 열기</button></div>
        )}
      </Panel>
    </>
  );
}

// ── 추천 서랍 — 정보판 + 근거 칩 + 코치 + 한 줄 이유 + 올리기 ──

const COACH_MARK = { ok: '✓', warn: '△', block: '✕' } as const;

function coachLine(check: TargetPickCheck | null) {
  return check ? { status: check.status, text: check.message } : { status: 'ok' as const, text: '데이터와 맞아요' };
}

function PickDrawer({ board, d, t, weights, note, setNote, onGoReady, reload, back }: {
  board: BoardResponse;
  d: DData;
  t: TargetRow;
  weights: number[];
  note: string;
  setNote: (v: string) => void;
  onGoReady: (symbol: string) => void;
  reload: () => void;
  back?: boolean;
}) {
  const [reasons, setReasons] = useBenchState<string[]>('s11:reasons', []);
  const [done, setDone] = useState<string | null>(null);
  const act = useAction();
  const tier = targetTier(t);
  const ready = readyOf(d);
  const rank = rankIn(d, t);
  const checks = checkTargetPickReasons(reasons, t, { rank });
  const blocked = checks.some((c) => c.check?.status === 'block');
  const mine = board.picks.find((p) => p.userId === board.account.userId && p.diseaseId === d.id);
  const can = tier === 'ready' && reasons.length > 0 && !blocked;
  const why = tier !== 'ready'
    ? `${t.symbol} 는 ${TARGET_TIER[tier].label} — 2.1 도킹으로 갈 수 없어요. 이 질환에서 도킹 준비된 표적은 ${ready?.symbol ?? '없음'} 하나예요.`
    : reasons.length === 0 ? '근거를 하나 이상 고르세요.'
      : blocked ? '✕ 표시된 근거는 데이터와 맞지 않아요. 빼거나 바꾸세요.'
        : mine ? `지금 내 ${d.short} 카드가 있어요 — 다시 올리면 바뀌어요.` : '올리면 모둠 공유에 카드가 바로 보여요.';
  useEffect(() => setDone(null), [t.symbol, d.id]);
  return (
    <div className="s11-info">
      <h4>
        <span className="mono">{t.symbol}</span>
        <span className="ko">{targetKoName(t)}</span>
        <span className="chip"><i className="s11-sw round" style={{ background: d.color }} aria-hidden="true" />{d.name}</span>
        <span className="chip">종합 {f3(t.overallScore)} · {rank}위 / {d.list.length}</span>
        <TierSig t={t} pdb />
      </h4>
      <EvBars t={t} />
      {back && <BackFace t={t} d={d} />}
      <ReasonChips
        legend="추천 근거"
        multiple
        chips={TARGET_PICK_REASONS.map((r) => ({ id: r.id, label: r.label }))}
        value={reasons}
        onChange={(next) => setReasons(Array.isArray(next) ? next : next ? [next] : [])}
      />
      {checks.length > 0 && (
        <ul className="s11-coach" aria-label="코치">
          {checks.map((c) => {
            const l = coachLine(c.check);
            return (
              <li key={c.id} className={`verdict ${l.status}`}>
                <b aria-hidden="true">{COACH_MARK[l.status]}</b> {TARGET_PICK_REASONS.find((r) => r.id === c.id)?.label} — {l.text}
              </li>
            );
          })}
        </ul>
      )}
      <div className="fld">
        <label className="lab" htmlFor="s11-note">한 줄 이유</label>
        <input id="s11-note" className="txt" value={note} maxLength={PICK_REASON_NOTE_MAX} onChange={(e) => setNote(e.target.value)}
          placeholder={`예: 점수는 낮지만 ${d.option.referenceLigand.name}이(가) 있어 2.1 에서 바로 견줄 수 있어요`} />
      </div>
      {act.error && <p className="err">{act.error}</p>}
      {done && <p className="ok-msg">{done}</p>}
      <div className="acts">
        <button type="button" className="btn pri" disabled={!can || act.busy} onClick={() => void act.run(async () => {
          const body: TargetPickRequest = { diseaseId: d.id, targetId: d.option.targetId, reasons, weights: weights.some((w) => w > 0) ? weights : null, note: note.trim() || null };
          await api.post(API.picks, body);
          setDone(`모둠 공유에 ${d.name} · ${t.symbol} 카드를 올렸어요.`);
          reload();
        })}>{mine ? '다시 올리기' : '모둠에 올리기'} → {d.short} · {t.symbol}</button>
        {tier !== 'ready' && ready && <button type="button" className="btn sm" onClick={() => onGoReady(ready.symbol)}>{ready.symbol} 보러 가기</button>}
        <span className="note">{why}</span>
      </div>
    </div>
  );
}

// ── 모둠 공유 ──

/** ② 질환 4개 작은 망 + 모둠원 깃발. */
function TeamNets({ ds, sel, flags, onPick }: { ds: DData[]; sel: Sel | null; flags: Flag[]; onPick: (diseaseId: string, symbol: string) => void }) {
  return (
    <Panel title="모둠원 깃발" sub="질환 4개 작은 망">
      <div className="s11-nets4">
        {ds.map((d) => (
          <div key={d.id} className="s11-net">
            <span className="s11-lab"><i className="s11-sw round" style={{ background: d.color }} aria-hidden="true" />{d.name}</span>
            <NetMap d={d} size="sm" flags={flags} sel={sel?.diseaseId === d.id ? sel.symbol : null} onPick={(s) => onPick(d.id, s)} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** ③ 모둠원마다 다른 가중치 · 다른 1위 — 올린 카드에 남은 가중치로 그린다(나는 지금 슬라이더). */
function TeamWeights({ board, all, myWeights }: { board: BoardResponse; all: TRow[]; myWeights: number[] }) {
  const latest = (userId: string) => board.picks.filter((p) => p.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const rows = board.members.map((m) => {
    const ps = latest(m.userId);
    const me = m.userId === board.account.userId;
    const w = me ? myWeights : (ps.find((p) => p.weights)?.weights ?? null);
    const top = w && w.some((x) => x > 0) ? myRows(all, w)[0] : undefined;
    return { m, me, w, top, ps };
  });
  return (
    <Panel title="모둠원마다 다른 가중치 · 다른 1위" sub="올린 카드의 가중치">
      <div className="tbl-w">
        <table className="s11-tbl">
          <thead>
            <tr>
              <th>모둠원</th>
              {TARGET_EVIDENCE.map((e, k) => <th key={e.key}><i className="s11-sw" style={{ background: EV_COLOR[k] }} aria-hidden="true" />{e.label}</th>)}
              <th>내 점수 1위</th>
              <th>올린 카드</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ m, me, w, top, ps }) => (
              <tr key={m.userId}>
                <td><By name={m.displayName} avatar={m.avatar} />{me && <span className="mini muted"> · 나(지금 슬라이더)</span>}</td>
                {TARGET_EVIDENCE.map((e, k) => <td key={e.key} className="num">{w ? `× ${w[k]}` : '—'}</td>)}
                <td className="num">{top ? <>{top.t.symbol} <span className="muted">{top.d.short} {f3(top.s)}{top.t.dockingTargetId ? ' ◆' : ''}</span></> : '—'}</td>
                <td className="num">{ps.length ? ps.map((p) => board.diseases.find((o) => o.diseaseId === p.diseaseId)?.gene ?? '').join(' · ') + ' ◆' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/** 추천 카드 — 근거 칩마다 코치 표시 · 한 줄 이유 · 가중치 · [이 표적으로 확정]. */
function PickCards({ board, ds, reload }: { board: BoardResponse; ds: DData[]; reload: () => void }) {
  const act = useAction();
  return (
    <div className="cards" id="go-s11-cards">
      {board.picks.length === 0 && <p className="empty">아직 추천 카드가 없어요. 왼쪽에서 표적을 고르고 근거를 골라 올려 주세요.</p>}
      {act.error && <p className="err">{act.error}</p>}
      {board.picks.map((p) => <PickCard key={p.id} p={p} board={board} ds={ds} busy={act.busy} onConfirm={() => void act.run(async () => {
        await api.post(API.target, { diseaseId: p.diseaseId });
        reload();
      })} />)}
    </div>
  );
}

function PickCard({ p, board, ds, busy, onConfirm }: { p: TargetPickView; board: BoardResponse; ds: DData[]; busy: boolean; onConfirm: () => void }) {
  const o = board.diseases.find((x) => x.diseaseId === p.diseaseId);
  const d = ds.find((x) => x.id === p.diseaseId);
  const t = d ? readyOf(d) : null;
  const on = p.targetId === board.program.targetId;
  const checks = d && t ? checkTargetPickReasons(p.reasons, t, { rank: rankIn(d, t) }) : [];
  return (
    <div className={`card${on ? ' on' : ''}`}>
      <div className="card-h">
        <By name={p.byName} avatar={p.avatar} />
        <span className="muted mini">추천</span>
        <b>{o?.label}</b>
        <span className="mono mini">{o?.gene} · {o?.pdbId}</span>
        {t && <span className="chip">종합 {f2(t.overallScore)} · {rankIn(d!, t)}위</span>}
      </div>
      {p.reasons.length > 0 && (
        <ul className="s11-plist">
          {(checks.length ? checks : p.reasons.map((id) => ({ id, check: null }))).map((c) => {
            const l = coachLine(c.check);
            return (
              <li key={c.id}>
                {TARGET_PICK_REASONS.find((r) => r.id === c.id)?.label ?? c.id}
                {c.check && <span className={`s11-sig ${l.status === 'block' ? 'bad' : 'warn'}`}>{COACH_MARK[l.status]} {l.text}</span>}
              </li>
            );
          })}
        </ul>
      )}
      {p.note && <p className="mini" style={{ margin: 0 }}>“{p.note}”</p>}
      {p.weights && <p className="mini muted" style={{ margin: 0 }}>가중치 {TARGET_EVIDENCE.map((e, k) => `${e.label} × ${p.weights![k]}`).join(' · ')}</p>}
      <div className="acts">
        <button className="btn sm" type="button" disabled={on || busy} onClick={onConfirm}>{on ? '확정된 표적' : '이 표적으로 확정'}</button>
      </div>
    </div>
  );
}
