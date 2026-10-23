/**
 * ①′ 연구소 고르기(설계 §1.4) — 로그인 · 가입 뒤 두 파이프라인 가운데 하나를 골라 들어가요.
 *
 * - 제약회사 설립은 하나예요 — 모둠 · 스타트업 이름 · 티커 · 연구비 원장은 두 랩이 함께 써요. 두 섬은 '회사를 두 개 만드는 것'이
 *   아니라 **어느 작업 화면을 열지** 고르는 것이에요.
 * - 고른 랩은 **주소(`?lab=`)에 둬요.** `sessionStorage` 는 보조 캐시예요(try/catch). 둘 다 비어 있으면 저분자로 조용히
 *   넘기지 않고 이 화면으로 되돌려요(§1.1).
 * - 쪽 제목 · 한 줄 설명 · 랩 한 줄 소개를 둬요 — 설계 §1.4 가 이 화면을 '무엇을 고르는지 알려 주는 화면'으로 적었고,
 *   카드만 있는 화면은 수업에서 설명 없이 못 써요(§12). 단계 칩 · 진행은 작업 화면에서 보여요.
 * - 카드 전체를 누르게 하려고 제목 링크에 겹침 레이어를 깔아요(카드 안에 다른 조작 요소를 넣지 않아요).
 */
import { LAB_TRACKS, type LabTrack } from '@crista-web/web-contract';
import type { Nav } from '../App.tsx';
import { BASE } from '../api.ts';
import '../antibody/antibody.css';

interface LabCard {
  track: LabTrack;
  no: string;
  title: string;
  /** 카드 안 한 줄 소개 — 처음 들어온 학생이 무엇을 고르는지 알게요. */
  sub: string;
}

const CARDS: readonly LabCard[] = [
  { track: 'small', no: '01', title: '저분자 신약 랩', sub: '작은 분자를 골라 걸러 내고 동물 · 사람 시험까지 끌고 가요.' },
  { track: 'antibody', no: '02', title: '항체 설계 랩', sub: '표적에 붙는 항체의 고리를 고쳐 더 잘 붙고 만들기 쉬운 쪽을 찾아요.' },
];

export function Labs({ nav, pickLab }: { nav: Nav; pickLab: (track: LabTrack) => void }) {
  const { me, go } = nav;
  const registered = me.next !== 'district';
  const open: readonly LabTrack[] = me.openTracks ?? LAB_TRACKS;

  return (
    <div className="ab-labs">
      <div className="ab-labs-in">
        <header className="ab-labs-h">
          <h1>연구소 고르기</h1>
          <p className="lede">우리 회사는 어떤 약을 만들까요?</p>
          <p className="mini muted">회사는 하나예요 — 모둠 · 스타트업 이름 · 연구비는 두 랩이 함께 써요.</p>
        </header>

        {!registered && (
          <p className="err" role="status">
            먼저 사옥 지구에서 회사를 등기해야 해요.{' '}
            <button type="button" className="btn sm" onClick={() => go('district')}>사옥 지구로</button>
          </p>
        )}

        <div className="ab-labs-grid">
          {CARDS.map((card) => {
            const closed = !open.includes(card.track);
            const href = `${BASE}/${card.track === 'antibody' ? 'antibody' : 'board'}?lab=${card.track}`;
            return (
              <section key={card.track} className="isl ab-lab" data-closed={closed ? '1' : '0'} aria-labelledby={`lab-${card.track}-h`}>
                <p className="ab-big" aria-hidden="true">{card.no}</p>
                <h2 id={`lab-${card.track}-h`}>
                  {closed ? (
                    <span aria-disabled="true">{card.title}</span>
                  ) : (
                    <a
                      href={href}
                      onClick={(e) => {
                        e.preventDefault();
                        pickLab(card.track);
                      }}
                    >
                      {card.title}
                    </a>
                  )}
                </h2>
                <p className="ab-lab-s">{card.sub}</p>
                {closed && <p className="hint">이번 차시에는 선생님이 이 랩을 닫아 두었어요.</p>}
                <div className="acts">
                  <button
                    type="button"
                    className="btn pri ab-enter"
                    disabled={closed}
                    aria-disabled={closed ? 'true' : undefined}
                    onClick={() => !closed && pickLab(card.track)}
                  >
                    들어가기
                  </button>
                </div>
              </section>
            );
          })}
        </div>

        <div className="acts">
          <button type="button" className="btn" onClick={() => go('district')}>사옥 지구</button>
          <button type="button" className="btn ghost" onClick={() => void nav.logout()}>로그아웃</button>
        </div>
      </div>
    </div>
  );
}
