# 完整反馈与宿主综合判断

每次先完成已选 agent 的独立输入捕获；两份任务、目标与获准材料一致，首次派发前两份都已准备好。首审不接收同伴结论。完成后读取明确 run 的完整报告，再进行宿主综合；不用投票推定正确，也不增加第三次模型调用。运行失败／uncertain 保留准确状态，完整展示可用报告。

使用安装目录下 `scripts/review-records.mjs synthesize`，stdin JSON：

```json
{"taskId":"T20","runIds":["明确的运行UUID"],"view":"full"}
```

runIds 支持一个，或同任务同对话、不同 executionKind 的两个。历史选择仅按显式 UUID，不搜索旧成功。省略 assessment 时逐条保留原发现为 unresolved；这是待综合状态，不代表已合并。默认 full 展示所有发现、严重程度、原证据、行动、限制、原回复及已有复查记录。用户明确要简版时才设置 summary；JSON 仍保留完整发现，并给同轮 `fullRecord` 命令定位。超出交付上限时明确报错或由宿主分段交付同轮完整产物，保持原文，不静默截断。

综合时宿主填写 assessment，结构如下：

```json
{
  "judgment":"根据实际来源给出综合判断、优先行动及未决项；这是宿主判断。",
  "groups":[{
    "groupId":"G1",
    "category":"unresolved",
    "decision":"retained",
    "references":[{"runId":"原始运行UUID","findingId":"F1"}],
    "rationale":"保留、合并或处置的证据依据；明确分歧和限制。",
    "evidence":[{"runId":"原始运行UUID","sourceId":"S1","excerptId":"E1"}],
    "action":"具体修正或核验步骤"
  }]
}
```

每条原发现恰好属于一个 group；少数意见和 Low/info 也必须登记。group 保留原始 run/finding 引用，输出补入原始证据字节范围和原文。综合分类：agreement 共同发现、unique 单方新增、disagreement 分歧、unresolved 未决。前三类要求两份有效结果与同任务／目标／材料；unique 只关联一个 run，agreement/disagreement 关联两个。没有另一位有效报告时不能声称单方新增或形成共识。

处置为 retained、merged、rejected、deferred、closed、reopened。每项须有非空 rationale；merged 仅用于有证据的共同发现；merged/rejected/closed/reopened 须提供当前已读覆盖内的证据。rejected/closed 的 action 为 null，deferred/reopened 提供具体行动。closed/reopened 还必须由相应 run 已保存、来源绑定的复查 assessment 支持；先按 annotate 协议处理历史来源和当前证据，不能在综合时临时伪造状态。原报告与原行动继续完整展示；宿主处置从来不删除原发现。

输出含报告、所有 group、综合 judgment、prompt/result 身份哈希和 synthesisSha256。命令只读，不修改原报告或保存新状态；需要留档时将完整 JSON/Markdown 交付到 Git 外私有报告，并与同轮完整原报告一起保留。已有按 run 保存的 annotate 复查记录仍按原协议管理。

匹配输入证明任务／材料一致，不证明语义正确或首审隔离。firstReviewIndependence 保持 not_verified：现有记录没有权威的双输入预派发时序证明，不能用调用者提供的 capturedAt 冒充认证。宿主依上述流程核对实际顺序并披露未核验范围。综合 categories、理由及判断始终标 host_judgment_not_independently_verified；gradeBandAssessment=not_assessed，提交状态 not_verified。档位分析仍遵循实际 rubric、最低目标与可选规划目标规则。

评分区间合并时，保留每位审阅者的逐项依据、覆盖、原始估分及分歧，不把两个总分取平均当作正确成绩。材料充分的未验证模型估分可在 findings 和综合判断中呈现；缺少关键材料只评已覆盖项，未知不按零分或外推总分。gradeBandAssessment=not_assessed 是等级达成未认证，不代表禁止模型估分。模型估分、目标与封存后的老师实际评分分开；无稿建议是有条件规划，不能冒充当前成绩。
