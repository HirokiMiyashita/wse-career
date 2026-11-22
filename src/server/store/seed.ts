import { defaultScope } from "@/lib/domain/constants";
import type { Approval, Artist, Deal, Knowledge, Project, Song, Task } from "@/lib/domain/types";

/** サンプルデータ（デモ用。実在の数値・契約内容ではありません） */

const t = (o: Omit<Task, "status" | "goals" | "lever"> & Partial<Pick<Task, "status" | "goals" | "lever">>): Task => ({
  status: "未着手",
  goals: [],
  lever: null,
  ...o,
});

function artists(): Artist[] {
  return [
    {
      id: "carz",
      name: "CARZ",
      role: "ラッパー／横浜",
      color: "#E8590C",
      plan: {
        horizon: "2029年末",
        years: 3,
        vision: "横浜発のラッパーとして全国に届き、東名阪でワンマンが成立している",
        status: "確定",
        scope: defaultScope(),
        pillars: [
          { id: "work", name: "作品", goal: "ライブで再現できる代表作を持つ", kpis: [{ label: "フルアルバム", base: 0, now: 0, target: 2, unit: "作" }, { label: "月10万再生を超える曲", base: 0, now: 1, target: 3, unit: "曲" }] },
          { id: "live", name: "ライブ", goal: "横浜の外でもワンマンが成立する", kpis: [{ label: "ワンマン最大動員", base: 0, now: 0, target: 800, unit: "人" }, { label: "ワンマンを開催した都市", base: 0, now: 0, target: 3, unit: "都市" }] },
          { id: "fan", name: "リスナー", goal: "横浜の外にリスナーを広げる", kpis: [{ label: "月間リスナー", base: 12000, now: 18000, target: 80000, unit: "人" }, { label: "神奈川以外のリスナー比率", base: 30, now: 38, target: 65, unit: "%" }] },
          { id: "base", name: "活動基盤", goal: "制作と活動を無理なく続けられる", kpis: [{ label: "年間リリース曲数", base: 3, now: 4, target: 8, unit: "曲" }, { label: "年間の活動収支", base: -60, now: -40, target: 0, unit: "万円" }] },
        ],
        steps: [
          { label: "2026–27", text: "1stアルバムと地元ワンマンで、作品とライブの基盤をつくる", focus: ["work", "live"] },
          { label: "2028", text: "東京で動員をつくり、リスナーを全国へ広げる", focus: ["fan", "live"] },
          { label: "2029", text: "東名阪ワンマンを成立させる", focus: ["live", "base"] },
        ],
        ideas: [
          { id: "I1", step: 1, title: "東京での対バン出演（年6本）", pillars: ["live", "fan"] },
          { id: "I2", step: 1, title: "2ndアルバム制作", pillars: ["work", "fan"] },
          { id: "I3", step: 2, title: "東名阪ワンマンツアー", pillars: ["live", "base"] },
        ],
        nextReview: "2026-12-01",
        reviews: [
          { date: "2026-10-01", kind: "四半期レビュー", participants: "CARZ・WS代表", summary: "1stアルバムの収録10曲を確定し、ワンマン会場を横浜（キャパ400）に決めた。", decisions: ["2026–27のステップを「アルバム＋地元ワンマン」の連動企画として進める", "客演は1曲までに絞り、制作期間を優先する"], nextActions: ["会場の本契約（11月中）", "先行曲①の公開準備"] },
          { date: "2026-07-01", kind: "キャリアプラン策定", participants: "CARZ・WS代表", summary: "3年後の姿と4つの柱を合意。最初のステップは作品とライブの基盤づくりに集中する。", decisions: ["3年後の姿：東名阪でワンマンが成立している", "2026–27は横浜でのワンマンを最優先にする"], nextActions: ["1stアルバムの企画書を作る"] },
        ],
      },
    },
    {
      id: "noa",
      name: "NOA（仮）",
      role: "シンガー",
      color: "#9C36B5",
      plan: {
        horizon: "2028年末",
        years: 2,
        vision: "東京でライブに定評のあるシンガーとして、固定客でワンマンを続けられている",
        status: "確定",
        scope: null,
        pillars: [
          { id: "work", name: "作品", goal: "ライブで映える曲を揃える", kpis: [{ label: "EP・アルバム", base: 1, now: 1, target: 3, unit: "作" }] },
          { id: "live", name: "ライブ", goal: "東京でワンマンを定例化する", kpis: [{ label: "ワンマン最大動員", base: 0, now: 0, target: 400, unit: "人" }, { label: "年間ワンマン本数", base: 0, now: 0, target: 2, unit: "本" }] },
          { id: "fan", name: "リスナー", goal: "固定客を増やす", kpis: [{ label: "月間リスナー", base: 4100, now: 9000, target: 30000, unit: "人" }] },
          { id: "base", name: "活動基盤", goal: "無理のない制作ペースを保つ", kpis: [{ label: "年間リリース曲数", base: 3, now: 5, target: 8, unit: "曲" }] },
        ],
        steps: [
          { label: "2027", text: "2nd EPと初ワンマンで、東京の固定客をつくる", focus: ["live", "fan"] },
          { label: "2028", text: "ワンマンを年2回の定例にする", focus: ["live", "base"] },
        ],
        ideas: [{ id: "I4", step: 1, title: "3rd EP＋秋のワンマン", pillars: ["work", "live"] }],
        nextReview: "2026-12-10",
        reviews: [
          { date: "2026-10-15", kind: "四半期レビュー", participants: "NOA・WS代表", summary: "1st EPの実績（ライブ転換率0.8%）を踏まえ、初ワンマンは東京のキャパ250規模を軸に検討する。", decisions: ["2nd EPとワンマンを連動させる", "会場規模と時期は、進め方の案を比較して決める"], nextActions: ["2nd EPの進め方をAIで比較する"] },
        ],
      },
    },
    {
      id: "shun",
      name: "SHUN（仮）",
      role: "トラックメイカー／ラッパー",
      color: "#0C8599",
      plan: {
        horizon: "2028年末",
        years: 2,
        vision: "トラックメイカー兼ラッパーとして、制作ペースを保ちながら認知を広げている",
        status: "確定",
        scope: null,
        pillars: [
          { id: "work", name: "作品", goal: "連続リリースで制作ペースを保つ", kpis: [{ label: "年間リリース曲数", base: 2, now: 3, target: 8, unit: "曲" }] },
          { id: "live", name: "ライブ", goal: "自主企画ライブを定着させる", kpis: [{ label: "企画ライブ最大動員", base: 0, now: 138, target: 300, unit: "人" }] },
          { id: "fan", name: "リスナー", goal: "認知を広げる", kpis: [{ label: "月間リスナー", base: 6200, now: 11400, target: 30000, unit: "人" }] },
          { id: "base", name: "活動基盤", goal: "楽曲提供など制作の仕事を増やす", kpis: [{ label: "楽曲提供・制作案件", base: 0, now: 0, target: 4, unit: "件/年" }] },
        ],
        steps: [
          { label: "2026", text: "連続配信で、制作ペースと認知の手応えをつかむ", focus: ["work", "fan"] },
          { label: "2027–28", text: "第2弾と企画ライブで動員をつくる", focus: ["live", "fan"] },
        ],
        ideas: [],
        nextReview: "2026-11-20",
        reviews: [
          { date: "2026-07-20", kind: "企画の振り返り", participants: "SHUN・WS代表", summary: "連続配信第1弾はリスナー目標を達成。企画ライブは138人で未達（92%）。", decisions: ["第2弾ではライブ告知を本番8〜10週前に開始する", "権利・クレジット担当を企画承認時に指定する"], nextActions: ["第2弾の企画書を作る"] },
        ],
      },
    },
  ];
}

function projects(): Project[] {
  const p1Tasks: Task[] = [
    t({ id: "T01", ws: "plan", title: "企画の目的・コンセプト・ターゲット協議", exec: "joint", approver: "joint", start: "2026-09-01", due: "2026-09-26", status: "完了", trigger: "キャリア目標の確認後", doneWhen: "企画メモ（目的・時期・ターゲット）を合意", affects: "全工程", onChange: "方針変更は共同判断" }),
    t({ id: "T02", ws: "plan", title: "予算・役割分担の確定", exec: "ws", approver: "joint", start: "2026-09-20", due: "2026-10-02", status: "完了", trigger: "企画メモ合意", doneWhen: "予算表・担当表を承認", affects: "全工程の発注", onChange: "費目間移動10%超は共同判断（仮）" }),
    t({ id: "T03", ws: "plan", title: "共同承認（企画書）", exec: "joint", approver: "joint", start: "2026-10-03", due: "2026-10-03", status: "完了", trigger: "予算・役割確定", doneWhen: "本人＋WSが承認", affects: "実行フェーズ開始", onChange: "—" }),
    t({ id: "T04", ws: "audio", title: "収録候補曲の選定（10曲）", exec: "artist", approver: "joint", start: "2026-09-15", due: "2026-10-17", status: "完了", goals: ["G2"], trigger: "デモから収録候補を抽出", doneWhen: "収録10曲と曲順案を確定", affects: "録音・ビート権利・MV曲選定", onChange: "差替えは楽曲管理で記録" }),
    t({ id: "T05", ws: "audio", title: "ビート権利条件の確認・買い切り前倒し（M3・M7）", exec: "ws", approver: "joint", start: "2026-10-01", due: "2026-10-24", status: "完了", trigger: "候補ビート選定", doneWhen: "契約・許諾を取得し条件を記録", affects: "録音・配信クレジット・分配", onChange: "権利条件の変更は共同判断", note: "順序を変更：制作前に買い切りを実施。買い切りの範囲（独占・著作権・原盤・印税分配）は契約書で個別に確認。" }),
    t({ id: "T10", ws: "audio", title: "先行曲① MIX／MASTER完成", exec: "eng", approver: "artist", start: "2026-10-20", due: "2026-11-07", status: "完了", lever: "single", goals: ["G1"], trigger: "先行曲①の録音完了", doneWhen: "納品用マスター完成", affects: "先行曲①配信登録", onChange: "—" }),
    t({ id: "T06", ws: "audio", title: "レコーディング（全10曲）", exec: "artist", approver: "ws", start: "2026-10-20", due: "2026-12-12", status: "進行中", goals: ["G2"], trigger: "ビート条件確定", doneWhen: "全曲のボーカルテイク確定", affects: "MIX・客演録音", onChange: "延期時はMIX・MASTER・配信納品を再計算" }),
    t({ id: "T07", ws: "audio", title: "客演パート録音（M5）", exec: "artist", approver: "joint", start: "2026-11-25", due: "2026-12-05", status: "保留", lever: "feat", goals: ["G1"], trigger: "変更CH-003の承認", doneWhen: "客演テイク受領", affects: "MIX・契約・クレジット・予算", onChange: "CH-003で影響確認中" }),
    t({ id: "T08", ws: "audio", title: "MIX（全10曲）", exec: "eng", approver: "artist", start: "2026-12-01", due: "2027-01-16", goals: ["G2"], trigger: "各曲のテイク確定", doneWhen: "全曲MIX承認", affects: "MASTER・MV音源", onChange: "遅延時はMASTER日程を再調整" }),
    t({ id: "T09", ws: "audio", title: "MASTER", exec: "ms", approver: "artist", start: "2027-01-12", due: "2027-01-23", goals: ["G2"], trigger: "全曲MIX承認", doneWhen: "納品用マスター完成", affects: "アルバム配信登録", onChange: "—" }),
    t({ id: "T29", ws: "visual", title: "ジャケット方向性ラフ共有", exec: "design", approver: "joint", start: "2026-11-04", due: "2026-11-13", status: "進行中", lever: "mv", trigger: "アルバムコンセプト確定", doneWhen: "方向性を1案に決定", affects: "共通撮影の衣装・場所", onChange: "—" }),
    t({ id: "T11", ws: "visual", title: "MV企画・絵コンテ（先行曲②）", exec: "film", approver: "joint", start: "2026-11-01", due: "2026-11-28", status: "進行中", lever: "mv", goals: ["G1"], trigger: "先行曲②の決定", doneWhen: "絵コンテ・撮影計画を承認", affects: "共通撮影", onChange: "—" }),
    t({ id: "T12", ws: "visual", title: "共通撮影：MV＋ジャケット＋宣材写真", exec: "film", approver: "ws", start: "2026-12-20", due: "2026-12-20", group: "SHOOT-1", lever: "mv", goals: ["G1"], trigger: "絵コンテ・ジャケ方向性の承認", doneWhen: "全素材の撮影完了", affects: "MV編集・ジャケット制作・宣材", onChange: "日程変更時はスタジオ・出演者・告知を確認", note: "まとめて実施：同じ場所・衣装・スタッフで3成果物を撮影。仕上げ・承認は成果物ごとに別管理。" }),
    t({ id: "T13", ws: "visual", title: "MV編集", exec: "film", approver: "joint", start: "2026-12-21", due: "2027-01-15", group: "SHOOT-1", lever: "mv", goals: ["G1"], trigger: "共通撮影の素材受領", doneWhen: "MV完成データ承認", affects: "MV公開・PR", onChange: "—" }),
    t({ id: "T14", ws: "visual", title: "ジャケット制作", exec: "design", approver: "joint", start: "2026-12-21", due: "2027-01-16", group: "SHOOT-1", lever: "mv", trigger: "共通撮影の素材受領", doneWhen: "ジャケット完成データ承認", affects: "配信登録", onChange: "—" }),
    t({ id: "T15", ws: "dist", title: "先行曲① 配信登録・素材納品", exec: "dist", approver: "ws", start: "2026-11-07", due: "2026-11-14", status: "完了", lever: "single", trigger: "マスター・ジャケ・クレジット", doneWhen: "登録・審査完了", affects: "先行曲①公開", onChange: "—" }),
    t({ id: "T16", ws: "dist", title: "クレジット・権利情報の確定", exec: "acct", approver: "ws", start: "2026-12-15", due: "2027-01-23", trigger: "全曲の参加者確定", doneWhen: "クレジット表・権利情報を確定", affects: "アルバム配信登録・分配", onChange: "客演追加時は再確認" }),
    t({ id: "T17", ws: "dist", title: "アルバム配信登録・納品", exec: "dist", approver: "ws", start: "2027-01-26", due: "2027-02-06", goals: ["G2"], trigger: "マスター・ジャケ・クレジット確定", doneWhen: "登録・審査完了", affects: "アルバム発売", onChange: "発売延期時は納品日を再設定" }),
    t({ id: "T18", ws: "promo", title: "先行曲① 公開・SNS告知（本人投稿）", exec: "artist", approver: "none", start: "2026-12-04", due: "2026-12-04", lever: "single", goals: ["G1"], trigger: "配信公開", doneWhen: "公開確認", affects: "—", onChange: "—" }),
    t({ id: "T19", ws: "promo", title: "PR・メディア送付（先行曲②＋MV）", exec: "pr", approver: "ws", start: "2027-01-05", due: "2027-01-22", lever: "pr", goals: ["G1"], trigger: "MV完成", doneWhen: "送付リスト全件送付", affects: "—", onChange: "—" }),
    t({ id: "T20", ws: "promo", title: "アルバム・ワンマン告知開始", exec: "ws", approver: "joint", start: "2027-02-05", due: "2027-02-05", lever: "ticket", goals: ["G3"], trigger: "会場本契約・券種確定", doneWhen: "告知公開", affects: "チケット発売", onChange: "延期時は告知文・券売日を再設定" }),
    t({ id: "T21", ws: "promo", title: "アルバム発売プロモーション", exec: "pr", approver: "ws", start: "2027-02-16", due: "2027-03-13", lever: "pr", goals: ["G2"], trigger: "告知開始", doneWhen: "施策完了", affects: "—", onChange: "—" }),
    t({ id: "T22", ws: "live", title: "会場仮押さえ（キャパ400）", exec: "live", approver: "ws", start: "2026-10-15", due: "2026-10-31", status: "完了", lever: "ticket", trigger: "共同承認", doneWhen: "仮押さえ確定", affects: "本契約", onChange: "—" }),
    t({ id: "T23", ws: "live", title: "会場本契約・キャンセル規定の確認", exec: "ws", approver: "joint", start: "2026-11-10", due: "2026-11-14", status: "確認待ち", lever: "ticket", goals: ["G3", "G4"], trigger: "仮押さえ", doneWhen: "本契約締結（締結実務は経理・契約担当）", affects: "告知・券売", onChange: "条件変更は共同判断" }),
    t({ id: "T24", ws: "live", title: "チケット券種・販売設計", exec: "live", approver: "ws", start: "2026-12-01", due: "2027-01-30", lever: "ticket", goals: ["G3", "G4"], trigger: "会場本契約", doneWhen: "券種・価格・販売日を確定", affects: "告知", onChange: "—" }),
    t({ id: "T30", ws: "live", title: "ライブ物販の企画（個別協議）", exec: "artist", approver: "joint", start: "2027-01-15", due: "2027-03-15", scope: "個別協議", lever: "merch", goals: ["G4"], trigger: "ワンマン告知", doneWhen: "物販内容・数量を確定", affects: "ライブ収支", onChange: "—", note: "グッズ企画・販売の運営はWSの標準業務外。必要性・体制・予算に応じて個別に協議。" }),
    t({ id: "T25", ws: "live", title: "演出・セットリスト", exec: "artist", approver: "joint", start: "2027-02-01", due: "2027-03-31", lever: "show", trigger: "アルバム曲確定", doneWhen: "セットリスト・演出案確定", affects: "リハーサル", onChange: "—" }),
    t({ id: "T26", ws: "live", title: "リハーサル", exec: "artist", approver: "ws", start: "2027-04-06", due: "2027-04-15", lever: "show", trigger: "セットリスト確定", doneWhen: "通しリハ完了", affects: "本番", onChange: "—" }),
    t({ id: "T27", ws: "live", title: "ワンマン本番", exec: "artist", approver: "none", start: "2027-04-17", due: "2027-04-17", goals: ["G3"], trigger: "—", doneWhen: "終演", affects: "収支確認", onChange: "—" }),
    t({ id: "T28", ws: "live", title: "ワンマン収支の確認（数値は経理から共有）", exec: "ws", approver: "joint", start: "2027-04-18", due: "2027-05-14", goals: ["G4"], trigger: "精算完了の連絡", doneWhen: "収支を記録し振り返りへ", affects: "振り返り", onChange: "—" }),
  ];
  return [
    {
      id: "P1",
      artistId: "carz",
      title: "1stアルバム発売とワンマン開催",
      types: ["アルバム", "ワンマン"],
      linked: "アルバム発売の6週後にワンマン。アルバム施策とライブ告知を連動",
      phase: 3,
      period: "2026/09 – 2027/05",
      purpose: ["名刺代わりになり、ライブで再現できるアルバムをつくる", "横浜以外のリスナーを増やし、次のワンマンにつなげる", "ワンマンを単体で赤字にしない"],
      goals: [
        { id: "G1", label: "月間リスナー", now: 18000, target: 35000, unit: "人", due: "2027-04", basis: "満員400人に必要な転換率を実績範囲に収めるため", pillar: "fan" },
        { id: "G2", label: "アルバム初月再生", now: 0, target: 600000, unit: "回", due: "2027-04", basis: "客演曲（2026夏）の実績から推定", pillar: "work" },
        { id: "G3", label: "ワンマン動員", now: 0, target: 400, unit: "人", due: "2027-04-17", basis: "会場キャパ（仮押さえ済み）", pillar: "live" },
        { id: "G4", label: "ワンマン単体の収支", now: null, target: 0, unit: "円以上", due: "2027-05", basis: "チケット＋物販 − 会場・制作・物販原価", pillar: "base" },
      ],
      model: { listeners: 35000, conv: 1.15, capacity: 400, price: 3800, merchRate: 35, merchSpend: 4000, plays: 600000, perPlay: 0.4 },
      milestones: [
        { date: "2026-10-03", label: "共同承認" },
        { date: "2026-12-04", label: "先行曲① 配信" },
        { date: "2026-12-20", label: "共通撮影" },
        { date: "2027-01-22", label: "先行曲②＋MV公開" },
        { date: "2027-02-05", label: "アルバム・ワンマン告知" },
        { date: "2027-02-19", label: "チケット一般発売" },
        { date: "2027-03-05", label: "アルバム発売" },
        { date: "2027-04-17", label: "ワンマン" },
      ],
      tasks: p1Tasks,
      budget: [
        { category: "音源", item: "録音スタジオ", plan: 320000, committed: 320000, paid: 180000 },
        { category: "音源", item: "MIX（10曲）", plan: 300000, committed: 300000, paid: 0 },
        { category: "音源", item: "MASTER", plan: 120000, committed: 0, paid: 0 },
        { category: "音源", item: "ビート買い切り（M3・M7）", plan: 160000, committed: 160000, paid: 160000 },
        { category: "ビジュアル", item: "共通撮影（MV＋ジャケ＋宣材）", plan: 520000, committed: 520000, paid: 0 },
        { category: "ビジュアル", item: "MV編集", plan: 180000, committed: 0, paid: 0 },
        { category: "ビジュアル", item: "ジャケットデザイン", plan: 100000, committed: 100000, paid: 0 },
        { category: "宣伝", item: "PR・メディア", plan: 150000, committed: 0, paid: 0 },
        { category: "宣伝", item: "広告出稿（外部実行）", plan: 100000, committed: 0, paid: 0 },
        { category: "宣伝", item: "素材制作", plan: 50000, committed: 40000, paid: 40000 },
        { category: "ライブ", item: "会場費", plan: 450000, committed: 450000, paid: 150000 },
        { category: "ライブ", item: "制作・音響照明", plan: 400000, committed: 0, paid: 0 },
        { category: "ライブ", item: "スタッフ", plan: 150000, committed: 0, paid: 0 },
        { category: "ライブ", item: "雑費", plan: 100000, committed: 0, paid: 0 },
        { category: "グッズ", item: "物販製造（個別協議）", plan: 250000, committed: 0, paid: 0 },
        { category: "配信", item: "外部流通手数料", plan: null, committed: null, paid: null },
      ],
      changes: [
        { id: "CH-003", date: "2026-11-12", title: "客演追加（M5）", type: "追加", areas: ["録音日", "契約・権利", "MIX", "配信クレジット", "予算"], cost: 80000, days: 0, judgement: "重要", status: "判断待ち", by: "CARZ", memo: "客演候補と条件を確認中。権利・分配は契約書で確認。" },
        { id: "CH-002", date: "2026-11-05", title: "MV撮影日 12/13 → 12/20", type: "延期", areas: ["スタジオ", "出演者", "ジャケット撮影", "編集", "告知"], cost: 0, days: 7, judgement: "権限内", status: "調整済み", by: "映像チーム", memo: "MV公開日（1/22）に影響なし。ジャケット撮影も同日に移動。" },
        { id: "CH-001", date: "2026-10-08", title: "ビート買い切りを制作前に前倒し（M3・M7）", type: "順序変更", areas: ["契約・権利", "予算"], cost: 0, days: 0, judgement: "重要", status: "承認済み", by: "WS代表", memo: "予算内の前倒し。権利条件を伴うため共同判断。" },
      ],
      planSource: "標準テンプレート「アルバム＋ワンマン」から作成",
      step: 0,
      pillars: ["work", "live", "fan"],
      why: "作品の柱「代表作を持つ」とライブの柱「ワンマン成立」の最初の一歩。地元で400人を満員にし、2028年の東京展開の土台にする。",
    },
    {
      id: "P2",
      artistId: "noa",
      title: "2nd EPリリースと東京ワンマン",
      types: ["EP", "ワンマン"],
      linked: "EP施策とワンマン告知を連動（時期は協議中）",
      phase: 1,
      period: "2026/11 – 2027/06（予定）",
      purpose: ["ライブで映える曲を軸にしたEPをつくる", "東京で固定客をつくる最初のワンマンを成立させる"],
      goals: [
        { id: "G1", label: "月間リスナー", now: 9000, target: 20000, unit: "人", due: "2027-05", basis: "協議中", pillar: "fan" },
        { id: "G3", label: "ワンマン動員", now: 0, target: 250, unit: "人", due: "2027-06", basis: "候補会場キャパ", pillar: "live" },
        { id: "G4", label: "ワンマン単体の収支", now: null, target: 0, unit: "円以上", due: "2027-07", basis: "—", pillar: "base" },
      ],
      model: { listeners: 20000, conv: 1.0, capacity: 250, price: 3500, merchRate: 38, merchSpend: 3500, plays: 250000, perPlay: 0.4, record: 0.8 },
      milestones: [],
      tasks: [],
      budget: [],
      changes: [],
      planSource: null,
      step: 0,
      pillars: ["work", "live", "fan"],
      why: "ライブの柱「東京でワンマンを定例化」の出発点。初ワンマンで固定客の規模を確かめる。",
    },
    {
      id: "P3",
      artistId: "shun",
      title: "シングル3作 連続配信＋企画ライブ",
      types: ["シングル×3", "企画ライブ"],
      linked: "3作目の翌月に企画ライブ",
      phase: 5,
      period: "2026/01 – 2026/07（完了）",
      purpose: ["4週間隔の連続配信で制作ペースと認知を両立する", "初の企画ライブで動員の手応えを測る"],
      goals: [
        { id: "G1", label: "月間リスナー", now: 11400, target: 10000, unit: "人", due: "2026-06", basis: "—", pillar: "fan" },
        { id: "G3", label: "企画ライブ動員", now: 138, target: 150, unit: "人", due: "2026-06-20", basis: "—", pillar: "live" },
      ],
      model: { listeners: 11400, conv: 1.2, capacity: 150, price: 3000, merchRate: 30, merchSpend: 3000, plays: 412000, perPlay: 0.4 },
      milestones: [
        { date: "2026-01-31", label: "共同承認" },
        { date: "2026-04-10", label: "Single 1" },
        { date: "2026-05-08", label: "Single 2" },
        { date: "2026-06-05", label: "Single 3" },
        { date: "2026-06-20", label: "企画ライブ" },
      ],
      tasks: [
        t({ id: "S01", ws: "plan", title: "企画協議・共同承認", exec: "joint", approver: "joint", start: "2026-01-10", due: "2026-01-31", status: "完了" }),
        t({ id: "S02", ws: "audio", title: "シングル3曲 制作", exec: "artist", approver: "ws", start: "2026-02-01", due: "2026-04-10", status: "完了", lever: "single" }),
        t({ id: "S03", ws: "visual", title: "共通撮影：MV＋ジャケット3作", exec: "film", approver: "ws", start: "2026-03-01", due: "2026-03-01", status: "完了", group: "SHOOT-S", lever: "mv" }),
        t({ id: "S04", ws: "dist", title: "配信登録（3作）", exec: "dist", approver: "ws", start: "2026-03-10", due: "2026-05-01", status: "完了", lever: "single" }),
        t({ id: "S05", ws: "promo", title: "リリース告知・PR", exec: "pr", approver: "ws", start: "2026-04-01", due: "2026-06-05", status: "完了", lever: "pr" }),
        t({ id: "S06", ws: "live", title: "企画ライブ（キャパ150）", exec: "artist", approver: "none", start: "2026-06-20", due: "2026-06-20", status: "完了", lever: "ticket" }),
        t({ id: "S07", ws: "live", title: "収支確認・振り返り", exec: "ws", approver: "joint", start: "2026-06-21", due: "2026-07-15", status: "完了" }),
      ],
      budget: [
        { category: "音源", item: "制作（3曲）", plan: 300000, committed: 300000, paid: 290000 },
        { category: "ビジュアル", item: "共通撮影＋編集", plan: 380000, committed: 380000, paid: 372000 },
        { category: "宣伝", item: "PR", plan: 120000, committed: 120000, paid: 118000 },
        { category: "ライブ", item: "会場・制作", plan: 260000, committed: 260000, paid: 254000 },
        { category: "グッズ", item: "物販製造", plan: 80000, committed: 80000, paid: 80000 },
      ],
      changes: [
        { id: "CH-S1", date: "2026-04-20", title: "Single 2 の公開を1週延期", type: "延期", areas: ["配信納品", "告知"], cost: 0, days: 7, judgement: "権限内", status: "調整済み", by: "WS代表", memo: "クレジット確認の遅れ。担当不明確が原因。" },
      ],
      planSource: "標準テンプレート「連続シングル」から作成",
      step: 0,
      pillars: ["work", "fan"],
      why: "作品の柱「制作ペース」とリスナーの柱の手応えを測る、最初のステップ。",
      review: {
        recordedAt: "2026-07-15",
        kpis: [
          { label: "月間リスナー", target: "10,000人", result: "11,400人", verdict: "達成" },
          { label: "シングル累計再生", target: "300,000回", result: "412,000回", verdict: "達成" },
          { label: "企画ライブ動員", target: "150人", result: "138人", verdict: "未達（92%）" },
          { label: "企画全体の収支", target: "−30万円以内", result: "−18万円", verdict: "達成" },
        ],
        good: ["4週間隔の配信で、毎回の初週再生が前作を上回った", "MV撮影日にジャケット3作を共通撮影し、撮影費を個別手配の見積比で約2割抑えた"],
        issues: ["ライブ告知が本番6週前と遅く、券売の立ち上がりが鈍かった", "クレジット確認の担当が曖昧で、Single 2 の配信登録が1週遅れた"],
        next: ["ライブ告知は本番の8〜10週前に開始する", "権利・クレジット確認の担当者を企画承認時に指定する"],
        careerUpdates: ["柱「リスナー」月間リスナーを 11,400人 に更新", "柱「ライブ」企画ライブ最大動員を 138人 に更新", "2026/07/20 のキャリアレビューで第2弾の方針を決定"],
      },
    },
    {
      id: "P4",
      artistId: "shun",
      title: "シングル連続配信 第2弾",
      types: ["シングル×4"],
      linked: "—",
      phase: 2,
      period: "2027/02 – 2027/09（予定）",
      purpose: ["第1弾の学びを反映し、ライブ告知を前倒しした連続配信を行う"],
      goals: [
        { id: "G1", label: "月間リスナー", now: 11400, target: 20000, unit: "人", due: "2027-09", basis: "第1弾の伸び率から", pillar: "fan" },
        { id: "G3", label: "ライブ動員", now: 0, target: 250, unit: "人", due: "2027-09", basis: "候補会場", pillar: "live" },
      ],
      model: { listeners: 20000, conv: 1.2, capacity: 250, price: 3200, merchRate: 30, merchSpend: 3000, plays: 600000, perPlay: 0.4, record: 1.2 },
      milestones: [
        { date: "2026-11-20", label: "共同承認（予定）" },
        { date: "2027-03-05", label: "Single 1" },
        { date: "2027-04-02", label: "Single 2" },
        { date: "2027-04-30", label: "Single 3" },
        { date: "2027-05-28", label: "Single 4" },
      ],
      tasks: [
        t({ id: "U01", ws: "plan", title: "企画書の共同承認", exec: "joint", approver: "joint", start: "2026-11-20", due: "2026-11-20", status: "確認待ち" }),
        t({ id: "U02", ws: "audio", title: "シングル4曲 制作", exec: "artist", approver: "ws", start: "2026-12-01", due: "2027-04-20", lever: "single" }),
        t({ id: "U03", ws: "visual", title: "共通撮影：MV2本＋ジャケット4作", exec: "film", approver: "ws", start: "2027-01-24", due: "2027-01-24", group: "SHOOT-U", lever: "mv" }),
        t({ id: "U04", ws: "live", title: "会場仮押さえ（キャパ250）", exec: "live", approver: "ws", start: "2026-12-01", due: "2026-12-25", lever: "ticket" }),
      ],
      budget: [
        { category: "音源", item: "制作（4曲）", plan: 400000, committed: 0, paid: 0 },
        { category: "ビジュアル", item: "共通撮影＋編集", plan: 520000, committed: 0, paid: 0 },
        { category: "宣伝", item: "PR", plan: 160000, committed: 0, paid: 0 },
        { category: "ライブ", item: "会場・制作", plan: 480000, committed: 0, paid: 0 },
      ],
      changes: [],
      planSource: "第1弾の振り返りを反映して作成",
      step: 1,
      pillars: ["live", "fan"],
      why: "第1弾の学び（告知の前倒し）を反映し、ライブの柱「企画ライブの定着」を進める。",
    },
  ];
}

function approvals(): Approval[] {
  return [
    { id: "A1", kind: "change", projectId: "P1", artistId: "carz", ref: "CH-003", title: "客演追加（M5）：予算 +¥80,000・権利条件あり", reason: "承認済み予算の超過／権利条件を伴う", due: "2026-11-20", ws: false, artist: false },
    { id: "A2", kind: "task", projectId: "P1", artistId: "carz", ref: "T23", title: "ワンマン会場の本契約（キャンセル規定）", reason: "予算内だが契約条件を伴う", due: "2026-11-14", ws: true, artist: false },
    { id: "A3", kind: "deal", projectId: null, artistId: "carz", ref: "D2", title: "飲料ブランド SNSタイアップの受諾判断", reason: "表現制約・競合条項があり本人協議が必要", due: "2026-11-22", ws: true, artist: false },
    { id: "A4", kind: "task", projectId: "P4", artistId: "shun", ref: "U01", title: "SHUN 連続配信 第2弾 企画書の共同承認", reason: "企画の共同承認", due: "2026-11-20", ws: false, artist: false },
  ];
}

function songs(): Record<string, Song[]> {
  return {
    carz: [
      { no: "M1", title: "TRACK 01（仮）", beat: "プロデューサーA", stage: 5, rights: ["ok", "ok", "ok", "ok"], memo: "先行曲①（12/4配信）" },
      { no: "M2", title: "TRACK 02（仮）", beat: "プロデューサーA", stage: 2, rights: ["ok", "ok", "ng", "ng"], memo: "先行曲②候補・MV曲" },
      { no: "M3", title: "TRACK 03（仮）", beat: "ビート購入（買い切り）", stage: 2, rights: ["ok", "ng", "ng", "ok"], memo: "買い切り済み。著作権・原盤の扱いは契約書で確認中" },
      { no: "M4", title: "TRACK 04（仮）", beat: "自作", stage: 2, rights: ["na", "ok", "ok", "ok"], memo: "" },
      { no: "M5", title: "TRACK 05（仮）", beat: "プロデューサーB", stage: 1, rights: ["ok", "ng", "ng", "ng"], memo: "客演追加を協議中（CH-003）" },
      { no: "M6", title: "TRACK 06（仮）", beat: "プロデューサーB", stage: 2, rights: ["ok", "ok", "ng", "ng"], memo: "" },
      { no: "M7", title: "TRACK 07（仮）", beat: "ビート購入（買い切り）", stage: 2, rights: ["ok", "ng", "ng", "ok"], memo: "買い切り済み" },
      { no: "M8", title: "TRACK 08（仮）", beat: "自作", stage: 1, rights: ["na", "ok", "ok", "ok"], memo: "" },
      { no: "M9", title: "TRACK 09（仮）", beat: "プロデューサーA", stage: 1, rights: ["ok", "ng", "ng", "ng"], memo: "" },
      { no: "M10", title: "TRACK 10（仮）", beat: "未定", stage: 0, rights: ["ng", "ng", "ng", "ng"], memo: "差替え候補あり" },
    ],
  };
}

function deals(): Deal[] {
  return [
    { id: "D5", artistId: "shun", title: "楽曲提供の問い合わせ（インディーズ歌手）", stage: 0, date: "2026-11-14", fee: "未提示", next: "内容確認・本人に共有" },
    { id: "D3", artistId: "noa", title: "地方フェス出演オファー（2027夏）", stage: 1, date: "2026-11-10", fee: "¥80,000＋交通費", next: "日程・条件の一次評価" },
    { id: "D1", artistId: "carz", title: "アパレルブランド 店舗イベント出演", stage: 2, date: "2026-11-02", fee: "提示 ¥150,000／希望 ¥200,000", next: "11/18 条件回答" },
    { id: "D2", artistId: "carz", title: "飲料ブランド SNSタイアップ", stage: 3, date: "2026-10-28", fee: "¥300,000", next: "表現制約・競合条項を本人と協議", sensitive: true },
    { id: "D4", artistId: "carz", title: "ポッドキャスト出演", stage: 5, date: "2026-11-08", fee: "無償（告知枠あり）", next: "反響を記録" },
  ];
}

function knowledge(): Knowledge[] {
  return [
    { projectId: "P3", artistId: "shun", title: "シングル3作 連続配信＋企画ライブ", date: "2026/07", metrics: [["月間リスナー", "6,200 → 11,400"], ["ライブ転換率", "1.2%"], ["物販購買率", "30%"]], learning: "ライブ告知は本番8〜10週前に開始する／権利・クレジット担当を企画承認時に指定する" },
    { projectId: null, artistId: "noa", title: "1st EP＋企画ライブ", date: "2025/11", metrics: [["月間リスナー", "4,100 → 7,600"], ["ライブ転換率", "0.8%"], ["物販購買率", "38%"]], learning: "物販はライブ限定品の比率を上げると購買率が伸びた" },
    { projectId: null, artistId: "carz", title: "客演曲リリース", date: "2026/08", metrics: [["月間リスナー", "+3,000（1か月）"], ["初月再生", "約18万回"]], learning: "客演曲は相手側リスナーの流入が大きい。権利・分配は事前に確定" },
  ];
}

export interface Db {
  artists: Artist[];
  projects: Project[];
  approvals: Approval[];
  songs: Record<string, Song[]>;
  deals: Deal[];
  knowledge: Knowledge[];
  seq: number;
}

export function createSeed(): Db {
  return { artists: artists(), projects: projects(), approvals: approvals(), songs: songs(), deals: deals(), knowledge: knowledge(), seq: 100 };
}
