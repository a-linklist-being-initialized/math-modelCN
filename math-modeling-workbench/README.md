# 数学建模 Workbench —— DSH Agent 预设（自包含，可整体迁移）

一个**完全自包含**的数学建模 Agent 预设：内置完整知识库（三阶段角色规范、算法资料、工具说明）
与工作流引擎（任务看板、进度看板、五门禁质检、完成判定）。**不依赖任何外部路径**，
插件通过 `import.meta.url` 相对定位同目录知识库，可整体复制/改名到任意机器。

> 适用：DeepSeek Harness（dsh）。它使用 dsh 的 Agent 预设机制（`agent.cordis.yml` + Cordis 插件），
> 其他 Agent 请直接使用仓库顶层的独立技能目录。

---

## 一、目录结构

```text
math-modeling-workbench/            # 预设根（整体复制即可用）
├── agent.cordis.yml                # 预设组装：工具行 + 系统提示段 + 技能注册行
├── preset.yml                      # 预设元数据（显示名「数学建模 Workbench」/ 描述）
├── plugins/                        # 9 个零依赖 ESM 插件
│   ├── math-modeling.mjs           #   工作流引擎：注册 mm_* 工具与建模协议系统提示
│   ├── data-preprocess-r.mjs       #   注册「数据预处理R语言」技能
│   ├── modeling-approach.mjs       #   注册「建模思路」技能
│   ├── skill-creator.mjs           #   注册「skill-creator」技能
│   ├── docx-cn.mjs                 #   注册「docx-cn」技能
│   ├── find-skills.mjs             #   注册「find-skills」技能
│   ├── brainstorming.mjs           #   注册「brainstorming」技能
│   ├── chinese-thesis-workbench.mjs#   注册「chinese-thesis-workbench」技能
│   └── paper-review.mjs            #   注册「paper-review」技能
└── skills/                         # 9 个随预设持久化的技能知识库
    ├── math-modeling/              #   主协议 + 三角色规范 + 7 类算法资料 + 6 类工具说明
    ├── 数据预处理R语言/              #   10 步统计预处理（R / Python，含模板脚本）
    ├── 建模思路/                     #   冲奖模型设计方法论 + 范例
    ├── skill-creator/              #   技能创作器
    ├── docx-cn/                    #   Word 文档处理
    ├── find-skills/                #   技能发现
    ├── brainstorming/              #   需求与设计头脑风暴
    ├── chinese-thesis-workbench/   #   中文本科论文工作台
    └── paper-review/               #   学术论文审阅
```

> `skills/` 中的 `docx-cn`、`find-skills`、`chinese-thesis-workbench`、`skill-creator` 是社区开源技能（各自带 `LICENSE`），
> 放在预设内是为了让预设**自包含**；它们的许可证见仓库根目录 [`THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.md)。

---

## 二、安装

### Windows（PowerShell）

```powershell
git clone https://github.com/a-linklist-being-initialized/math-modelCN.git
cd math-modelCN

# 预设根目录 = %DSH_HOME%\.agent-presets\ ，目录名即预设 id
Copy-Item -Recurse .\math-modeling-workbench "$env:DSH_HOME\.agent-presets\math-modeling"
```

### macOS / Linux

```bash
git clone https://github.com/a-linklist-being-initialized/math-modelCN.git
cd math-modelCN
cp -r ./math-modeling-workbench "$DSH_HOME/.agent-presets/math-modeling"
```

> 目标目录名就是**预设 id**（仅小写字母/数字/连字符）。若 `math-modeling` 已被占用，改成别的名字即可，
> 插件会自动定位同目录知识库，**无需改任何配置**。

### 生效方式

**重启 DSH**（或新建会话），在预设选择器中即可看到 **「数学建模 Workbench」**。

---

## 三、装好之后你会得到什么

### 工作流工具（`mm_*`）

| 工具 | 作用 |
|---|---|
| `mm_project_init` | 初始化或续接项目（竞赛/届次/子问题/论文格式；SKILL_ROOT 默认用内置知识库；PROJECT_ROOT 默认当前会话工作区） |
| `mm_phase_enter` | 进入 建模手 / 编程手 / 论文手 阶段：校验前置门禁，**实际读取并返回该角色 SKILL.md 全文**，注入该阶段标准任务清单 |
| `mm_todo` | 阶段任务看板：`list` 查看、`check` 勾选、`reset` 重置 |
| `mm_state` | 三阶段进度看板：阶段步进、五门禁状态、任务完成度、下一动作 |
| `mm_gate` | 门禁质检：`prepare` 生成独立只读质检简报（交给 Subagent 执行）、`record` 校验并记录回执（PASS/FAIL/BLOCKED） |
| `mm_check_deliverables` | 按阶段做确定性交付物检查（代码/结果表/三类候选图/复现清单/论文与正式图） |
| `mm_skill_read` | 按需读取知识库内资料（算法索引、图表规范、docx/pdf/xlsx 工具说明…） |
| `mm_complete` | 完成判定：五门禁全 PASS + 交付物齐全 + 通过后产物无实质变化（漂移检测） |
| `mm_log` | 向项目账本追加事件（返工/决策），用于"修正后复验"追踪 |

### 工作流骨架

- **三阶段**：建模手 → 编程手 → 论文手（进入下一阶段前必须通过前置门禁）
- **五门禁**：`M1` 建模终检 → `P1` 最小可运行结果 → `P2` 编程终检 → `W1` 证据大纲 → `W2` 论文终检
- **质检方式**：到门禁节点由主 Agent 派发**独立只读 Subagent** 质检（作者自检不能替代独立验收）
- **状态持久化**：`<PROJECT_ROOT>/.math-modeling/state.json`，跨会话可续接

### 内置技能（skill 工具可直接加载）

`math-modeling`（主协议）、`数据预处理R语言`、`建模思路`、`skill-creator`、`docx-cn`、`find-skills`、
`brainstorming`、`chinese-thesis-workbench`、`paper-review`。

---

## 四、使用示例

```text
我：开始数学建模，题目与附件在当前工作区

Agent：[mm_project_init] 项目已初始化：目标竞赛 CUMCM 2026；当前阶段=建模手
       [mm_phase_enter phase=modeling] 已读取 references/roles/建模手/SKILL.md 全文
       [mm_todo list] 建模手 7 项任务看板已生成 …
       [mm_gate gate=M1 mode=prepare] 建模终检简报已生成 → 派发独立只读 Subagent
       …
       [mm_complete] COMPLETE：五门禁全 PASS、交付物齐全、无漂移
```

---

## 五、许可与免责

- 本预设本体（组装、插件、编排说明）采用 **MIT 许可证**（见仓库根 [`LICENSE`](../LICENSE)）。
- 预设内的社区技能保留各自许可证（见 [`THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.md)）。
- 生成的论文仅供参考，**不作为可直接提交的作品**；论文结构与格式必须以目标竞赛当届官方规则与官方模板为准。
- 请遵守竞赛对 AI 工具使用的规定（核心建模与核心写作应由参赛者主导，并按当届要求声明）。
