| 키 | 문구 | 자리표시자 | 근거 |
| --- | --- | --- | --- |
| `3.3.overview.title` | 이 단계에서 하는 일 | — | §5.10 뼈대 · `overview.title` |
| `3.3.overview.oneLine` | 사람에게 처음으로 우리 약을 써 봐도 되는지 나라(식약처 · FDA)에 허락을 받는 IND(임상시험 계획 승인) 신청서를 내요. | — | §5.10 뼈대(한 문장) · `overview.oneLine` |
| `3.3.overview.summary1` | 정할 것은 제형(약을 몸에 넣는 모양), 용량(넣는 양), 환자군 · 1차 평가지표(약의 효과를 판단하는 가장 중요한 잣대) 세 가지예요. | — | §5.10 뼈대(정할 것 세 가지) · `overview.summary[0]` |
| `3.3.overview.summary2` | 가장 중요한 근거는 3.2 동물실험 결과에서 구한 MRSD(최대 권장 시작 용량, 사람에게 처음 줘도 되는 가장 큰 양)예요. | — | §5.10 뼈대(근거 하나) · `overview.summary[1]` |
| `3.3.overview.summary3` | 신청서를 내면 규칙 검사와 AI 심사관이 차례로 검토해요. 서류가 통과하면 수수료 500,000 크리스타를 내고 30게임 일 뒤에 승인 판정을 받아요. | — | §5.10 심사 흐름 · `overview.summary[2]` |
| `3.3.overview.more.oneLine` | 우리 스타트업 제약회사가 만든 후보 물질을 사람에게 처음 투여해도 안전한지 나라(식약처 · FDA)에 허락을 구하는 단계예요. | — | §5.10 뼈대(한 문장) · `overview.more[0]` |
| `3.3.overview.more.threeThings` | ① 어떤 모양으로 넣을지 제형(먹는 알약 · 정맥 주사 · 붙이는 패치)을 골라요. ② 얼마나 넣을지 용량(10 · 50 · 100 mg)을 정해요. ③ 누구에게 시험하고 무엇을 잴지 환자군과 1차 평가지표(효과를 판단하는 가장 중요한 기준)를 골라요. | — | §5.10 뼈대(정할 것 세 가지) · `overview.more[1]` |
| `3.3.overview.more.basis` | 모든 계획의 출발점은 3.2 동물실험 결과예요. 특히 동물에서 찾은 안전한 용량을 사람 기준으로 바꾼 MRSD(최대 권장 시작 용량)를 절대 넘지 않아야 해요. | — | §5.10 뼈대(근거 하나) · §5.9 · `overview.more[2]` |
| `3.3.overview.more.analogy` | 새 놀이기구에 사람을 처음 태우기 전에 안전 점검 결과를 내는 것과 같아요. 누구를 태우고 어떤 속도로 운행할지 계획을 적어 허락을 받는 과정이에요. | — | §5.10 뼈대(비유) · `overview.more[3]` |
| `3.3.overview.more.scale` | 용량을 올리면 효능 E 는 올라가지만 안전 S 는 내려가요. 두 가지를 동시에 높이는 마법 같은 용량은 없어요. | — | §5.10 뼈대(저울) · 6.04 · `overview.more[4]` |
| `3.3.overview.more.misconception` | IND(임상시험 계획 승인) 승인은 약을 팔아도 된다는 약 허가가 아니에요. 사람에게 시험을 시작해도 좋다는 허락일 뿐이고, 바로 다음인 임상 1상의 안전 기준(S ≥ 50)은 더 높아요. | — | §5.10 뼈대(흔한 오해) · `overview.more[5]` |
| `3.3.overview.expand` | 자세히 펼쳐 보기 | — | §5.10 뼈대 · `overview.expand` |
| `3.3.overview.collapse` | 접기 | — | §5.10 뼈대 · `overview.collapse` |
| `3.3.tool.common.preShake` | 도구의 모든 효능 E · 안전 S 숫자는 흔들림 전 예상치(교육용 단순화 값)예요. IND 판정에는 흔들림이 없지만, 실제 1~2상(±6)과 3상(±4) 판정에는 무작위 흔들림이 더해져요. | — | §5.10 도구 표 · game-rules · `preShake` |
| `3.3.tool.common.fills` | 채워지는 신청서 칸 · {what} | `{what}` | §5.10 도구 표 · `toolNotes.fills` |
| `3.3.tool.common.mrsdLine` | 이 제형의 MRSD(최대 권장 시작 용량) 한계선은 {mrsd} mg 이에요. | `{mrsd}` | §5.10 도구 표 · 6.05 · `toolNotes.mrsdLine` |
| `3.3.tool.common.mrsdOk` | 고른 {dose} mg 은 MRSD {mrsd} mg 이하예요. 1상 시작 용량으로 쓸 수 있어요. | `{dose}` · `{mrsd}` | §5.10 도구 표 · 6.05 · `toolNotes.mrsdOk` |
| `3.3.tool.common.mrsdOver` | 고른 {dose} mg 이 MRSD {mrsd} mg 을 넘어요. 이대로 내면 규칙 검사에서 보완 요구를 받아요. | `{dose}` · `{mrsd}` | §5.10 도구 표 · 6.05 · `toolNotes.mrsdOver` |
| `3.3.tool.common.brainPop` | 고른 환자군은 약이 뇌까지 들어가야 해요. 그래서 뇌 노출(BBB 통과율 B)이 효능 E 계산에 추가로 곱해져요. | — | §5.10 · game-rules · `toolNotes.brainPop` |
| `3.3.tool.lab.tab` | what-if 실험실 | — | §5.10 도구 표 · 6.05 · `tools.lab.tab` |
| `3.3.tool.lab.question` | 제형 · 용량 · 후보 · 환자군 손잡이를 바꾸면 효능 E 와 안전 S 예상치가 어떻게 달라질까요? | — | §5.10 도구 표 · 6.05 · `tools.lab.question` |
| `3.3.tool.lab.howToRead` | 네 가지 손잡이를 움직여 보세요. 흔들림 전 E · S 게이지와 각 관문(IND S ≥ 35 · 1상 S ≥ 50 · 2상 E ≥ 40 · 3상 E ≥ 45, S ≥ 55)의 예상 신호, 그리고 그 제형의 MRSD 선을 한눈에 볼 수 있어요. | — | §5.10 도구 표 · 6.05 |
| `3.3.tool.lab.fills` | ③ 제형 · ⑤ 시작 용량 초안 | — | §5.10 도구 표 · 6.05 · `tools.lab.fills` |
| `3.3.tool.lab.lesson` | 손잡이 넷의 힘은 서로 달라요. 특히 용량과 심장 위험(hERG, 심장 박동 통로 유전자 위험)이 안전 S 를 크게 흔들어요. | — | §5.10 · 6.05 시안 배울 점 |
| `3.3.tool.seesaw.tab` | 효능 · 안전 시소 | — | §5.10 도구 표 · 6.04 · `tools.seesaw.tab` |
| `3.3.tool.seesaw.question` | 용량과 제형을 바꿀 때 효능 E 와 안전 S 중에서 무엇을 얻고 무엇을 잃을까요? | — | §5.10 도구 표 · 6.04 · `tools.seesaw.question` |
| `3.3.tool.seesaw.howToRead` | 왼쪽 접시는 효능 E, 오른쪽 접시는 안전 S 예요. 용량(10 · 50 · 100 mg)과 제형 단추를 눌러 두 접시가 어떻게 기울어지는지 비교해 보세요. | — | §5.10 도구 표 · 6.04 · `toolNotes.seesawNote` |
| `3.3.tool.seesaw.fills` | ⑤ 용량 근거 | — | §5.10 도구 표 · 6.04 · `tools.seesaw.fills` |
| `3.3.tool.seesaw.lesson` | 용량은 효능 E 와 안전 S 를 동시에 높일 수 없는 저울이에요. 한쪽을 올리면 다른 쪽은 반드시 내려가요. | — | §5.10 · 6.04 시안 배울 점 |
| `3.3.tool.peak.tab` | 피크 곡선 | — | §5.10 도구 표 · 6.06 · `tools.peak.tab` |
| `3.3.tool.peak.question` | 같은 용량이라도 제형에 따라 우리 몸이 한꺼번에 받는 부담 꼭대기(피크)가 어떻게 다를까요? | — | §5.10 도구 표 · 6.06 · `tools.peak.question` |
| `3.3.tool.peak.howToRead` | 제형별 피크 계수 K(먹는 경구 ×1.00 · 혈관에 놓는 정맥 주사 ×1.25 · 피부에 붙이는 경피 패치 ×0.75)를 용량 부담 Dt 에 곱해 꼭대기 높이를 구해요. 꼭대기가 IND 한계선 {v}((100 − 35) ÷ 위험 배율 {rk})와 {form} MRSD {mrsd} mg 의 부담 아래에 있는지 확인하세요. | `{v}` · `{rk}` · `{form}` · `{mrsd}` | §5.10 도구 표 · 6.06 · `toolNotes.peakLimit` · `toolNotes.peakMrsd` |
| `3.3.tool.peak.fills` | ③ 제형 근거 | — | §5.10 도구 표 · 6.06 · `tools.peak.fills` |
| `3.3.tool.peak.lesson` | 시간(0~24시간)에 따른 곡선 모양은 이해를 돕기 위한 개념 그림이에요. 실제 약동학 곡선이 아니라 꼭대기 높이(Dt × K)만 게임 규칙 값으로 쓰여요. | — | §5.10 · 6.06 시안 배울 점 · `toolNotes.peakConcept` |
| `3.3.tool.dose.tab` | 용량-반응 3장 | — | §5.10 도구 표 · 6.07 · `tools.dose.tab` |
| `3.3.tool.dose.question` | 경구 · 정맥 · 경피 세 가지 제형에서 효능 E 선과 안전 S 선이 엇갈리는 곳은 각각 어디일까요? | — | §5.10 도구 표 · 6.07 · `tools.dose.question` |
| `3.3.tool.dose.howToRead` | 가로축은 용량(mg), 세로축은 점수(0~100)예요. 용량이 커질수록 오르는 효능 E 선과 내려가는 안전 S 선을 보고, 세로 점선(그 제형의 MRSD) 왼쪽에서 3상권(흔들림 전 E ≥ 45 · S ≥ 55)에 가까운 곳을 찾아보세요. | — | §5.10 도구 표 · 6.07 · `toolNotes.doseNote` |
| `3.3.tool.dose.fills` | ③ 제형 · ⑤ 용량 비교 근거 | — | §5.10 도구 표 · 6.07 · `tools.dose.fills` |
| `3.3.tool.dose.lesson` | 어느 제형이든 효능 E 와 안전 S 는 X 자로 엇갈려요. 제형을 바꾸는 것은 그 X 자가 만나는 위치를 옮기는 일이에요. | — | §5.10 · 6.07 시안 배울 점 |
| `3.3.tool.plane.tab` | E–S 평면 | — | §5.10 도구 표 · 6.02 · `tools.plane.tab` |
| `3.3.tool.plane.question` | 9가지(제형 3 × 용량 3) 조합 점 가운데 IND 기준선(안전 S ≥ 35)을 넘는 점은 무엇일까요? | — | §5.10 도구 표 · 6.02 · `tools.plane.question` |
| `3.3.tool.plane.howToRead` | 가로축은 안전 S, 세로축은 효능 E 이고 점 모양은 제형(● 경구 · ■ 정맥 · ▲ 경피)을 뜻해요. 1상 이후 기준선은 참고용(실제 임상 설계는 4.1 단계)이니, S ≥ 35 오른쪽에서 원하는 점({form} {dose} mg — E {e} · S {s})을 눌러 신청서 조합으로 확정하세요. | `{form}` · `{dose}` · `{e}` · `{s}` | §5.10 도구 표 · 6.02 · `toolNotes.planeNote` · `toolNotes.planePick` |
| `3.3.tool.plane.fills` | 고른 제형 · 용량 확정 | — | §5.10 도구 표 · 6.02 · `tools.plane.fills` |
| `3.3.tool.plane.lesson` | 용량을 10 → 50 → 100 mg 으로 올리면 점은 늘 왼쪽 위로 움직여요. 효능 E 를 얻는 만큼 안전 S 를 잃기 때문이에요. | — | §5.10 · 6.02 시안 배울 점 |
| `3.3.tool.waterfall.tab` | 공식 폭포 | — | §5.10 도구 표 · 6.03 · `tools.waterfall.tab` |
| `3.3.tool.waterfall.question` | 우리가 고른 조합의 효능 E 와 안전 S 는 100점에서 출발해 어떤 재료 때문에 깎였을까요? | — | §5.10 도구 표 · 6.03 · `tools.waterfall.question` |
| `3.3.tool.waterfall.howToRead` | 교육용 단순화 공식에 따라 효능 E 는 100점에서 결합력(p) · 흡수(A) · 뇌 노출(B) · 용량 효능(De)을 차례로 곱해 깎여요. 안전 S 는 100점에서 용량 부담(Dt)에 위험 배율(1 + hERG + 간독성)과 피크(K)를 곱한 값을 빼서 깎여요. | — | §5.10 도구 표 · 6.03 · `toolNotes.waterfallE` · `toolNotes.waterfallS` |
| `3.3.tool.waterfall.fills` | ⑥ 예상 위험 · 감시 계획 | — | §5.10 도구 표 · 6.03 · `tools.waterfall.fills` |
| `3.3.tool.waterfall.lesson` | 안전 S 의 빨간 감점 칸은 모두 용량 부담(Dt)에 곱해져서 생겨요. 따라서 용량을 줄이면 심장 · 간 위험 부담도 한꺼번에 줄어들어요. | — | §5.10 · 6.03 시안 배울 점 · `toolNotes.waterfallNote` |
| `3.3.part.cover.guide` | ① 표지예요. 신청인(모둠 이름) · 후보 코드명 · 특허 번호 · 신청 단계(제1상) · 작용 기전 한 줄은 서버가 자동으로 채워 줘요. | — | §5.10 신청서 칸 ① · `parts.cover.guide` |
| `3.3.part.plan.guide` | ② 개발 계획이에요. 서버가 채운 표적 · 질환을 보고 왜 이 약이 필요한지와 1~3상 개발 흐름을 3~5줄로 적어요. | — | §5.10 신청서 칸 ② · `parts.plan.guide` |
| `3.3.part.form.guide` | ③ 임상시험용 의약품(제형) 칸이에요. 모둠원과 나눠 쓸 수 있고, 도구의 피크 곡선과 경피 투과 신호를 보고 제형 선택 근거를 2줄로 적어요. | — | §5.10 신청서 칸 ③ · `parts.form.guide` |
| `3.3.part.nonclinical.guide` | ④ 비임상 시험(동물실험) 요약 칸이에요. 서버가 첨부한 NOAEL · 효력 · 독성 소견 · 사용 마릿수를 바탕으로 결과를 해석하고, HED 와 MRSD 를 직접 계산해 넣어요. | — | §5.10 신청서 칸 ④ · `parts.nonclinical.guide` |
| `3.3.part.protocol.guide` | ⑤ 임상시험 계획서(1상 요약) 칸이에요. 1상의 1차 평가지표는 늘 '안전성 · 이상사례'로 고정되며, 시작 용량 · 시험 대상 · 다음 상의 환자군과 1차 평가지표 · 중단 기준을 정해요. | — | §5.10 신청서 칸 ⑤ · `parts.protocol.guide` |
| `3.3.part.risk.guide` | ⑥ 위험 관리 · 피험자(시험 참여자) 보호 칸이에요. 위험 신호와 공식 폭포 재료를 보고 감시 계획, 동의 설명문 핵심 3줄, IRB(임상시험심사위원회) 심의 계획을 써요. | — | §5.10 신청서 칸 ⑥ · `parts.risk.guide` |
| `3.3.part.pledge.guide` | ⑦ 서약 칸이에요. 법령(21 CFR 312.23(a)(1)(iii))에 따른 두 가지 약속에 모두 체크해야 신청서를 접수할 수 있어요. | — | §5.10 신청서 칸 ⑦ · `parts.pledge.guide` |
| `3.3.sec.title.guide` | 어떤 질환이나 대상을 위해, 어떤 후보 물질과 제형으로 하는 제1상 시험인지 한 줄로 적어요. | — | §5.10 신청서 칸 ① · `sections.title.guide` |
| `3.3.sec.title.example` | 예: 경도 알츠하이머병 치료를 위한 {code} 경구 제형의 안전성 평가 제1상 임상시험 | `{code}` | §5.10 신청서 칸 ① · `sections.title.placeholder` |
| `3.3.sec.dev_plan.guide` | 대상 질환의 미충족 수요(왜 새 약이 필요한지)와 1상(안전성) → 2상(유효성 탐색) → 3상(확증) 계획을 3~5줄로 써요. | — | §5.10 신청서 칸 ② · `sections.dev_plan.guide` |
| `3.3.sec.dev_plan.example` | 예: 기존 치료제는 증상만 잠시 완화해 새로운 표적 치료제가 꼭 필요해요. 1상에서 안전한 용량 범위를 확인하고, 2상에서 환자 대상 효능을 탐색한 뒤, 3상에서 대규모 확증 시험을 진행할 계획이에요. | — | §5.10 신청서 칸 ② · `sections.dev_plan.placeholder` |
| `3.3.sec.dev_plan.criterion` | 심사 기준: 개발 계획(질환 · 약이 필요한 이유 · 1~3상 흐름)이 우리 모둠의 표적 · 질환과 잘 맞나요? | — | §5.10 신청서 칸 ② · `checklist.plan_fits` |
| `3.3.sec.form_reason.guide` | 경구 · 정맥 · 경피 중 왜 이 제형을 골랐는지 흡수 신호, 경피 투과 적합성, 피크 계수(K), 예상 E · S 를 들어 2줄로 써요. | — | §5.10 신청서 칸 ③ · `sections.form_reason.guide` |
| `3.3.sec.form_reason.example` | 예: 경구 흡수 신호가 '좋음'이고 피크 계수가 ×1.00 이라 정맥 주사(×1.25)보다 몸이 받는 순간 부담이 낮아요. 50 mg 에서 MRSD 이하이면서 예상 안전 S 가 35 이상이라 경구 제형으로 골랐어요. | — | §5.10 신청서 칸 ③ · `sections.form_reason.placeholder` |
| `3.3.sec.form_reason.criterion` | 심사 기준: 제형을 고른 근거가 도구 결과(흡수 · 경피 투과 신호 · 피크 K · 예상 E · S)와 일치하나요? | — | §5.10 신청서 칸 ③ · `checklist.form_reason_fits` |
| `3.3.sec.nonclinical.guide` | 랫드와 개 중 어느 동물이 더 민감했는지, NOAEL(부작용이 보이지 않은 가장 높은 용량)과 독성 소견(간 수치 · 심전도 QT 등)이 어떠했는지 3~5줄로 해석해요. | — | §5.10 신청서 칸 ④ · `sections.nonclinical.guide` |
| `3.3.sec.nonclinical.example` | 예: 동물실험 결과 개가 랫드보다 더 민감한 종이었고 개 기준 HED 가 더 낮게 나왔어요. 고용량에서 경미한 간 효소 상승 소견이 관찰되었으므로, 1상에서는 MRSD 이하로 시작하고 간 수치를 면밀히 살필 계획이에요. | — | §5.10 신청서 칸 ④ · `sections.nonclinical.placeholder` |
| `3.3.sec.nonclinical.criterion` | 심사 기준: 동물실험 해석이 실제 소견과 맞나요? (예: 간 독성 소견이 있는데 '독성 없음'이라고 쓰면 앞뒤가 맞지 않아 보완 요구를 받아요.) | — | §5.10 신청서 칸 ④ · `checklist.nonclinical_consistent` |
| `3.3.sec.calc_hed.guide` | HED(사람 등가 용량, mg/kg) = NOAEL ÷ 환산 계수(랫드 6.2 · 개 1.8)로 계산한 뒤, 두 동물 종 가운데 **더 낮은 값**(더 민감한 종 기준)을 적어요. | — | §5.9 · §5.10 신청서 칸 ④ · `sections.calc_hed.guide` |
| `3.3.sec.calc_hed.example` | 예: 10.0 | — | §5.10 신청서 칸 ④ · `sections.calc_hed.placeholder` |
| `3.3.sec.calc_mrsd.guide` | 고른 제형의 MRSD(최대 권장 시작 용량, mg)를 적어요. 기본 식은 HED ÷ 안전계수(기본 10, 동물 마릿수가 적으면 20) × 성인 몸무게 60 kg 이고, 제형마다 피크 계수 K 가 달라 값이 달라질 수 있으니 3.2 결과판 · 도구의 제형별 MRSD 와 맞춰 보세요. | — | §5.9 · §5.10 신청서 칸 ④ · `sections.calc_mrsd.guide` |
| `3.3.sec.calc_mrsd.example` | 예: 60 | — | §5.10 신청서 칸 ④ · `sections.calc_mrsd.placeholder` |
| `3.3.sec.subject.guide` | 1상 시험 대상(건강한 성인 지원자 또는 환자)과 그렇게 고른 이유를 적어요. 시작 용량은 위에서 고른 조합을 따르고, 2 · 3상에서 시험할 환자군과 1차 평가지표는 목록에서 골라요. | — | §5.10 신청서 칸 ⑤ · `sections.subject.guide` |
| `3.3.sec.subject.example` | 예: 건강한 성인 지원자를 대상으로 해요. 제1상의 첫 목적은 약의 안전성과 내약성을 확인하는 것이므로 기저 질환 변수가 없는 지원자에게 MRSD 이하 용량부터 투여해요. | — | §5.10 신청서 칸 ⑤ · `sections.subject.placeholder` |
| `3.3.sec.subject.criterion` | 심사 기준: 시험 대상(건강한 지원자 또는 환자)과 선택 이유가 제1상의 목적(안전성 · 이상사례 확인)에 맞나요? | — | §5.10 신청서 칸 ⑤ · `checklist.subject_reason` |
| `3.3.sec.stop_rule.guide` | 시험 도중 어떤 이상 징후나 수치가 기준을 넘으면 투여나 용량 증량을 즉시 멈출지 구체적인 중단 기준을 적어요. | — | §5.10 신청서 칸 ⑤ · `sections.stop_rule.guide` |
| `3.3.sec.stop_rule.example` | 예: 심전도 검사에서 QT 간격(심장이 수축하고 다시 쉬기까지의 시간)이 500 ms 를 넘거나, 간 효소(ALT/AST) 수치가 정상 상한의 3배 이상 오르면 즉시 해당 용량 투여를 멈춰요. | — | §5.10 신청서 칸 ⑤ · `sections.stop_rule.placeholder` |
| `3.3.sec.stop_rule.criterion` | 심사 기준: 중단 기준이 구체적인가요? (무엇을 재서 · 얼마를 넘으면 · 어떻게 멈추는지가 분명해야 해요.) | — | §5.10 신청서 칸 ⑤ · `checklist.stop_specific` |
| `3.3.sec.risk_monitor.guide` | 2.2 위험 신호나 3.2 동물 소견에서 위험이 '보통' 이상인 항목을 어떻게 감시할지 적어요. (예: hERG 위험 보통 이상 → 심전도 QT 감시 · 간독성 위험 보통 이상 → 혈액 간 수치 감시) | — | §5.10 신청서 칸 ⑥ · `sections.risk_monitor.guide` |
| `3.3.sec.risk_monitor.example` | 예: hERG 신호가 '보통'이므로 투여 전과 투여 후 피크 시간대에 심전도(ECG)로 QT 간격을 측정해요. 간 소견도 함께 확인하기 위해 매주 혈액 검사로 간 효소 수치를 감시해요. | — | §5.10 신청서 칸 ⑥ · `sections.risk_monitor.placeholder` |
| `3.3.sec.risk_monitor.criterion` | 심사 기준: 예상 위험과 감시 계획이 후보 물질의 위험 신호 · 동물실험 소견과 빠짐없이 맞물리나요? | — | §5.10 신청서 칸 ⑥ · `checklist.monitor_fits` |
| `3.3.sec.consent.guide` | 시험 참여자에게 설명할 동의 설명문의 핵심 3가지(시험 목적 · 예상되는 위험 · 언제든 불이익 없이 그만둘 수 있는 권리)와 IRB(임상시험심사위원회, 시험의 안전과 윤리를 심사하는 기구) 사전 심의 계획을 적어요. | — | §5.10 신청서 칸 ⑥ · `sections.consent.guide` |
| `3.3.sec.consent.example` | 예: ① 이 시험은 신약 후보를 사람에게 처음 투여해 안전성을 확인하는 연구예요. ② 어지러움이나 간 수치 상승 같은 부작용이 생길 수 있어 정기 검사를 진행해요. ③ 참여자는 언제든 불이익 없이 시험을 그만둘 수 있으며, 모든 절차는 IRB 사전 심의를 거쳐 진행해요. | — | §5.10 신청서 칸 ⑥ · `sections.consent.placeholder` |
| `3.3.sec.consent.criterion` | 심사 기준: 동의 설명문 핵심 3가지(목적 · 위험 · 자유로운 중단 권리)와 IRB 심의 계획이 모두 들어 있나요? | — | §5.10 신청서 칸 ⑥ · `checklist.consent_clear` |
| `3.3.sec.pledge_hold.label` | IND 승인 전에는 사람에게 임상시험용 의약품을 투여하지 않겠습니다(21 CFR 312.23(a)(1)(iii)). | — | §5.10 신청서 칸 ⑦ · `sections.pledge_hold.label` |
| `3.3.sec.pledge_report.label` | 임상시험 중 불리한 결과나 이상사례가 나와도 숨기지 않고 즉시 보고하겠습니다. | — | §5.10 신청서 칸 ⑦ · `sections.pledge_report.label` |
| `3.3.rule.lead_valid.ok` | 3.2 에서 지정한 주력(또는 백업) 물질이며, 유효한 특허와 동물실험 결과가 모두 확인되었어요. | — | §5.10 규칙 1 · `rules.leadOk` |
| `3.3.rule.lead_valid.not_designated` | 3.2 단계에서 지정한 주력 · 백업 분자가 아니에요. 후보 물질을 다시 확인해 주세요. | — | §5.10 규칙 1 · `rules.lead.not_designated` |
| `3.3.rule.lead_valid.patent_inactive` | 이 후보 물질의 특허가 유효하지 않아요. 유효한 특허가 있는 분자만 신청할 수 있어요. | — | §5.10 규칙 1 · `rules.lead.patent_inactive` |
| `3.3.rule.lead_valid.no_animal` | 이 후보 물질은 아직 3.2 동물실험을 끝내지 않았어요. 동물실험을 먼저 완료해 주세요. | — | §5.10 규칙 1 · `rules.lead.no_animal` |
| `3.3.rule.plan_complete.ok` | 제형 · 시작 용량 · 다음 상 환자군 · 다음 상 1차 평가지표를 모두 골랐어요. | — | §5.10 규칙 2 · `rules.planOk` |
| `3.3.rule.plan_complete.fail` | 아직 고르지 않은 항목이 있어요: {what}. 도구와 목록에서 모두 골라 주세요. | `{what}` | §5.10 규칙 2 · `rules.planMissing` |
| `3.3.rule.sections_filled.ok` | 신청서에서 꼭 채워야 하는 서술 칸을 모두 작성했어요. | — | §5.10 규칙 3 · `rules.filledOk` |
| `3.3.rule.sections_filled.fail` | 아직 비어 있는 필수 칸이 있어요: {what}. 내용을 채운 뒤 다시 심사받아 주세요. | `{what}` | §5.10 규칙 3 · `rules.filledMissing` |
| `3.3.rule.transdermal_fit.ok` | 고른 제형이 분자의 경피 투과 신호와 잘 맞아요. | — | §5.10 규칙 4 · `rules.transdermalOk` |
| `3.3.rule.transdermal_fit.fail` | 이 분자는 경피 투과 신호가 '부적합'이라 피부를 잘 통과하지 못해요. 붙이는 패치(경피) 대신 다른 제형을 골라 주세요. | — | §5.10 규칙 4 · `rules.transdermalBad` |
| `3.3.rule.calc_match.ok` | ④번 칸에 직접 계산해 적은 HED 와 MRSD 가 서버 계산 값과 일치해요. | — | §5.10 규칙 5 · `rules.calcOk` |
| `3.3.rule.calc_match.fail` | ④번 계산 칸의 숫자가 서버 값과 달라요: {which}. 환산 계수(랫드 6.2 · 개 1.8)와 안전계수, 제형별 MRSD 를 다시 확인해 보세요. | `{which}` | §5.10 규칙 5 · `rules.calcBad` |
| `3.3.rule.calc_match.no_animal` | 3.2 동물실험 결과가 없어 HED 와 MRSD 계산을 확인할 수 없어요. | — | §5.10 규칙 5 · 6 · `rules.noAnimal` |
| `3.3.rule.dose_le_mrsd.ok` | 시작 용량 {dose} mg 이 {form} 제형의 MRSD {mrsd} mg 이하라 안전 기준에 맞아요. | `{dose}` · `{form}` · `{mrsd}` | §5.10 규칙 6 · `rules.doseOk` |
| `3.3.rule.dose_le_mrsd.fail` | 시작 용량 {dose} mg 이 {form} 제형의 MRSD {mrsd} mg 을 넘어요. 용량을 낮추거나 피크 부담이 더 낮은 제형으로 바꿔 주세요. | `{dose}` · `{form}` · `{mrsd}` | §5.10 규칙 6 · `rules.doseOver` |
| `3.3.rule.dose_le_mrsd.no_plan` | 제형과 시작 용량을 먼저 골라야 MRSD 와 비교할 수 있어요. | — | §5.10 규칙 6 · `rules.doseNoPlan` |
| `3.3.rule.safety_expected.ok` | 흔들림 전 예상 안전 S 가 {s}점으로 IND 승인 기준({min}점) 이상이에요. | `{s}` · `{min}` | §5.10 규칙 7 · `rules.safetyOk` |
| `3.3.rule.safety_expected.fail` | 흔들림 전 예상 안전 S 가 {s}점으로 IND 승인 기준({min}점)보다 낮아요. 이 조합으로는 승인받을 수 없어요. | `{s}` · `{min}` | §5.10 규칙 7 · `rules.safetyLow` |
| `3.3.rule.safety_expected.unknown` | 후보 물성이나 조합 정보가 부족해 예상 안전 S 를 계산할 수 없어요. | — | §5.10 규칙 7 · `rules.safetyUnknown` |
| `3.3.rule.risk_monitor.ok` | 주의해야 할 위험 항목({what})에 대한 감시 계획을 ⑥번 칸에 작성했어요. | `{what}` | §5.10 규칙 8 · `rules.monitorOk` |
| `3.3.rule.risk_monitor.fail` | 위험 신호나 동물 소견이 '보통' 이상인 항목({what})이 있어요. ⑥번 감시 계획 칸을 꼭 작성해 주세요. | `{what}` | §5.10 규칙 8 · `rules.monitorMissing` |
| `3.3.rule.risk_monitor.none` | 심장(hERG)과 간 위험 신호가 모두 낮아 별도의 특별 감시 조건 없이 통과했어요. | — | §5.10 규칙 8 · `rules.monitorNone` |
| `3.3.rule.pledges.ok` | ⑦번 서약 두 가지에 모두 체크했어요. | — | §5.10 규칙 9 · `rules.pledgeOk` |
| `3.3.rule.pledges.fail` | ⑦번 서약 두 가지에 모두 체크해야 신청서를 낼 수 있어요. | — | §5.10 규칙 9 · `rules.pledgeMissing` |
| `3.3.revise.status` | 보완 요구 — 지적된 칸을 고쳐서 무료로 다시 심사받으세요 | — | §5.10 · §5.11 · `status.revise` · `doc.verdict.revise` |
| `3.3.revise.itemHeader` | [AI 심사] AI 심사관(식약처 · FDA 심사관 역할)의 칸별 검토 의견이에요(80자 이내). | — | §5.11 투명성 · 추가 주의('AI 심사' · 'AI 심사관') |
| `3.3.revise.itemStatus.ok` | 문제 없음(ok) — 기준에 맞게 잘 작성했어요. | — | §5.11 칸별 상태 4종(`ok`) |
| `3.3.revise.itemStatus.missing` | 빠짐(missing) — 꼭 들어가야 할 핵심 내용이 빠져 있어요. | — | §5.11 칸별 상태 4종(`missing`) |
| `3.3.revise.itemStatus.inconsistent` | 앞뒤 안 맞음(inconsistent) — 동물실험 소견이나 도구 숫자와 서술 내용이 서로 어긋나요. | — | §5.11 칸별 상태 4종(`inconsistent`) |
| `3.3.revise.itemStatus.unclear` | 분명하지 않음(unclear) — 기준이나 숫자가 모호하니 더 구체적으로 적어 주세요. | — | §5.11 칸별 상태 4종(`unclear`) |
| `3.3.revise.feedbackHeader` | [AI 심사] AI 심사관의 종합 피드백(300자 이내)이에요. 판정에 이의가 있으면 선생님께 정정을 요청할 수 있어요. | — | §5.11 투명성 · 이의 제기 |
| `3.3.revise.resubmitGuide` | 보완 요구 단계에서는 연구비가 들지 않아요. 지적받은 칸을 고친 뒤 [서류 심사 받기(무료)] 단추를 다시 눌러 주세요. | — | §5.10 심사 흐름 · `doc.reviewBtn` · `doc.rulesHint` |
| `3.3.revise.staleNotice` | 심사받은 뒤 신청서 내용이 바뀌었어요(심사 판 {a} → 지금 판 {b}). 바뀐 판으로 다시 서류 심사를 통과해야 접수할 수 있어요. | `{a}` · `{b}` | §5.11 · `doc.reviewStale` |
| `3.3.revise.limitNotice` | AI 서류 심사는 신청서 1건당 하루 {n}회(모둠 하루 15회)까지 요청할 수 있어요. 규칙 검사에서 걸린 경우나 같은 서류 판을 다시 부른 경우는 횟수에 세지 않아요. | `{n}` | §5.10 · §5.11 횟수 · `doc.reviewLimit` |
| `3.3.revise.pendingNotice` | [AI 심사] AI 심사관이 신청서를 읽고 있어요(수 초 ~ 수십 초 걸려요). 심사가 끝날 때까지 기다리지 않고 다른 칸이나 다른 단계를 계속 진행해도 돼요. | — | §5.11 비동기 심사 · `doc.reviewPending` |
| `3.3.revise.teacherNotice` | AI 심사 연결이 지연되어 '심사 대기' 상태예요. 신청서는 잠기지 않으며, 자동으로 다시 시도하거나 선생님이 직접 확인해 통과시켜 주실 수 있어요. | — | §5.11 장애 대비 · `doc.reviewTeacher` |
| `3.3.submit.passedNotice` | 규칙 검사와 AI 심사관의 서류 심사를 모두 통과했어요! 이제 수수료를 내고 정식으로 IND 를 접수할 수 있어요. | — | §5.10 심사 흐름 · `status.passed` · `doc.verdict.pass` |
| `3.3.submit.button` | 접수하기 — 수수료 {fee} | `{fee}` | §5.10 심사 흐름 · `doc.submitBtn` |
| `3.3.submit.confirm` | 접수하면 우리 스타트업 제약회사 연구비에서 IND 수수료 {fee}가 차감되고 {days}게임 일 뒤에 승인 판정이 나요. 접수한 뒤에는 신청서를 고칠 수 없어요. | `{fee}` · `{days}` | §5.10 심사 흐름 · `doc.submitConfirm` · `doc.locked` |
| `3.3.submit.waiting` | IND 접수 완료({from}일차 접수 → {to}일차 판정 예정 · 진행률 {pct}%) — 나라에서 신청서를 검토하고 있어요. | `{from}` · `{to}` · `{pct}` | §5.10 심사 흐름 · `status.submitted` · `doc.waiting` |
| `3.3.approval.title` | IND 승인서(임상시험 계획 승인서) | — | §5.10 · `status.approved` · `doc.approvedTitle` |
| `3.3.approval.row.candidate` | 후보 물질 | — | §5.10 · `doc.approvalRows.candidate` |
| `3.3.approval.row.form` | 제형 | — | §5.10 · `doc.approvalRows.form` |
| `3.3.approval.row.dose` | 시작 용량 | — | §5.10 · `doc.approvalRows.dose` |
| `3.3.approval.row.population` | 환자군(다음 상 기준) | — | §5.10 · `doc.approvalRows.population` |
| `3.3.approval.row.endpoint` | 1차 평가지표(1상: 안전성 · 이상사례 / 다음 상 기준) | — | §5.10 · `doc.approvalRows.endpoint` |
| `3.3.approval.row.score` | 예상 점수(흔들림 없음, S ≥ 35 통과) | — | §5.10 · `doc.approvalRows.score` |
| `3.3.approval.row.day` | 승인일 | — | §5.10 · `doc.approvalRows.day` |
| `3.3.approval.notDrugApprovalNote` | IND 승인은 시판 약 허가가 아니에요. 사람에게 첫 임상시험(1상)을 시작해도 좋다는 허락이며, 이 승인서의 제형 · 용량 · 환자군 · 1차 평가지표가 4.1 임상 단계의 입력으로 넘어가요. | — | §5.10 완료 조건 · 흔한 오해 · `doc.approvedNote` |
| `3.3.approval.phase1Gap` | 1상 통과 기준(안전 S ≥ {p1})까지 흔들림 전 예상치로 {gap}점 모자라요. 4.1 임상 단계에서 시작 용량을 더 낮춰 도전할 수 있어요. | `{p1}` · `{gap}` | §5.10 · `doc.phase1Gap` |
| `3.3.approval.phase1Ok` | 흔들림 전 예상치로 1상 안전 기준(S ≥ {p1})까지 거뜬히 넘는 조합이에요. 다만 실제 1상 판정에는 ±6점 흔들림이 더해져요. | `{p1}` | §5.10 · game-rules · `doc.phase1Ok` |
| `3.3.approval.boardApproved` | ◆ {ticker} IND 승인 — {code} · {disease} 첫 사람 임상시험 돌입(기업가치 0~5% 반영) | `{ticker}` · `{code}` · `{disease}` | §5.10 심사 흐름 · `board.approved` |
| `3.3.approval.boardHeld` | ◆ {ticker} IND 보류(Clinical Hold) — {code} · {disease} 임상 계획 재검토(기업가치 −8~0% 반영) | `{ticker}` · `{code}` · `{disease}` | §5.10 심사 흐름 · `board.held` |
| `3.3.approval.heldNotice` | 예외적인 사유(선생님 수동 정정 등)로 IND 가 보류되었어요. 선생님과 보류 사유를 확인한 뒤 새 신청서를 작성해 다시 도전할 수 있어요. | — | §5.10 심사 흐름 · `status.held` · `doc.heldNote` |

**메모**
- 모든 자리표시자는 기존 `packages/web-contract/src/ind.ts`(`IND_COPY`)의 이름을 그대로 유지했으며 새로 추가한 자리표시자는 없습니다.
- MRSD 검사를 통과한 서류는 `S ≥ 35`(흔들림 없음)가 보장되므로, 실제 임상 보류 사유인 서류 · 자료 결함은 수수료 과금 전의 무료 '보완 요구' 단계에서 걸러지도록 안내했습니다.
- LLM 심사 결과 영역(`3.3.revise.itemHeader` · `3.3.revise.feedbackHeader` · `3.3.revise.pendingNotice`)에는 `[AI 심사]` 표시와 `AI 심사관` 호칭만 썼습니다.
