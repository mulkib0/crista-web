/**
 * ①′ 연구소 고르기(설계 §1.4) — 로그인 · 가입 뒤 두 파이프라인 가운데 하나를 골라 들어가요.
 *
 * - 쪽 제목(`h1`) · 눈썹 줄 · 랩 이름 · 단계 칩 · 진행 칩 · 들어가기만 둬요. 설명 덩어리(랩 한 줄 설명 ·
 *   '결과의 성격' 줄 · 단계 칩 성격 배지)는 두지 않아요.
 * - 고른 랩은 **주소(?lab=)에 둬요.** `sessionStorage` 는 보조 캐시예요. 둘 다 비어 있으면 저분자로 조용히 넘기지 않고
 *   이 화면으로 되돌려요(§1.1 · `App.tsx` 의 `pickedLab`).
 * - 문구는 전부 `antibody/terms.ts` 에 모아 둬요 — 이 파일은 마크업과 상태만 들고 있어요.
 * - 접근성: 카드 전체를 누르게 하려고 **제목 링크 하나**에 겹침 레이어(`::after`)를 깔아 클릭 영역만 넓혀요.
 *   카드 안에 다른 조작 요소를 넣지 않아요 — 그래서 설계 §1.4 표의 [들어가기] 단추는 **누를 수 없는 안내 글**로 두고,
 *   누르면 그 글 위에서도 제목 링크가 받아요. `aria-current="page"` 는 쓰지 않아요(두 섬은 '갈 곳'이에요).
 * - 진행 칩은 `MeResponse.labs` 가 있을 때만 그려요(§1.3). 숨겨도 자리를 비워 둬서 섬 높이가 흔들리지 않아요.
 */
import type { LabProgress, LabTrack } from '@crista-web/web-contract';
import { LAB_TRACKS } from '@crista-web/web-contract';
import type { Nav } from '../App.tsx';
import { BASE } from '../api.ts';
import { LABS_COPY, LAB_CARDS } from '../antibody/terms.ts';
import '../antibody/antibody.css';

const hrefOf = (track: LabTrack) => `${BASE}/${track === 'antibody' ? 'antibody' : 'board'}?lab=${track}`;

export function Labs({ nav, pickLab }: { nav: Nav; pickLab: (track: LabTrack) => void }) {
  const { me, go } = nav;
  const registered = me.next !== 'district';
  const open: readonly LabTrack[] = me.openTracks ?? LAB_TRACKS;

  return (
    <div className="ab-labs">
      <div className="ab-labs-in">
        <header className="ab-labs-h">
          <p className="lab">{LABS_COPY.eyebrow}</p>
          <h1>{LABS_COPY.title}</h1>
        </header>

        {!registered && (
          <p className="err ab-labs-band" role="status">
            {LABS_COPY.notRegistered}{' '}
            <button type="button" className="btn sm" onClick={() => go('district')}>{LABS_COPY.toDistrict}</button>
          </p>
        )}

        <div className="ab-labs-grid">
          {LAB_CARDS.map((card) => {
            const closed = !open.includes(card.track);
            const prog: LabProgress | undefined = me.labs?.[card.track];
            const running = !!prog && prog.opened && prog.doneCount < prog.total;
            const headId = `lab-${card.track}-h`;
            const progId = `lab-${card.track}-p`;
            const whyId = `lab-${card.track}-w`;
            return (
              <section key={card.track} className="isl ab-lab" data-closed={closed ? '1' : '0'} aria-labelledby={headId}>
                <p className="ab-big" aria-hidden="true">{card.no}</p>
                <h2 id={headId}>
                  {closed ? (
                    <span aria-disabled="true" aria-describedby={whyId}>{card.title}</span>
                  ) : (
                    <a
                      href={hrefOf(card.track)}
                      {...(prog ? { 'aria-describedby': progId } : {})}
                      onClick={(e) => {
                        e.preventDefault();
                        pickLab(card.track);
                      }}
                    >
                      {card.title}
                    </a>
                  )}
                </h2>
                <ul className="ab-lab-steps" aria-label={`${card.title} ${LABS_COPY.stepsLabel}`}>
                  {card.steps.map((step) => (
                    <li key={step.id} className="chip">
                      <b className="mono">{step.id}</b> {step.short}
                    </li>
                  ))}
                </ul>

                {/* 진행 칩 — 값이 없으면 숨기고 자리는 비워 둬요(§1.4). */}
                <p className="ab-lab-prog">
                  {prog && (
                    <span className="chip" id={progId}>
                      {LABS_COPY.progress(prog.doneCount, prog.total)}
                      {running ? ` · ${LABS_COPY.running}` : ''}
                    </span>
                  )}
                </p>

                {closed ? (
                  <p className="hint" id={whyId}>{LABS_COPY.closed}</p>
                ) : (
                  // 조작 요소가 아니라 안내 글이에요 — 눌리는 것은 제목 링크 하나뿐이에요(위 머리 주석).
                  <p className="ab-lab-go" aria-hidden="true">{LABS_COPY.enter} →</p>
                )}
              </section>
            );
          })}
        </div>

        <div className="acts">
          <button type="button" className="btn" onClick={() => go('district')}>{LABS_COPY.district}</button>
          <button type="button" className="btn ghost" onClick={() => void nav.logout()}>{LABS_COPY.logout}</button>
        </div>
      </div>
    </div>
  );
}
