# 第三方组件声明 / Third-Party Notices

本仓库包含若干来自社区的开源技能（Skill）。这些组件**不适用本仓库的 MIT 许可证**，
而是保留各自原有的许可证；使用、修改或再分发前请阅读对应目录下的 `LICENSE` 文件。

| 组件 | 仓库内位置 | 自带许可证文件 | 说明 |
|---|---|---|---|
| `docx-cn` | `01_docx-cn__docx-cn/`<br>`math-modeling-workbench/skills/docx-cn/` | `LICENSE.txt` | Word 文档处理技能（创建/读取/编辑 .docx） |
| `find-skills` | `02_find-skills__find-skills/`<br>`math-modeling-workbench/skills/find-skills/` | `LICENSE` | 场景/关键词双模式技能发现 |
| `chinese-thesis-workbench` | `04_chinese-thesis-workbench__chinese-thesis-workbench/`<br>`math-modeling-workbench/skills/chinese-thesis-workbench/` | `LICENSE` | 中文本科毕业论文 / 毕设工作台 |
| `skill-creator` | `math-modeling-workbench/skills/skill-creator/` | `LICENSE.txt` | 技能创作器（创建/打包/校验 skill） |

> 上述组件在 `math-modeling-workbench/` 预设内出现的副本，是为了让该预设**自包含、可整体迁移**
> （插件通过 `import.meta.url` 相对定位同目录知识库），其许可证与独立目录中的版本一致。

## 资料类内容

- `数学建模算法/` —— 32 份中文算法资料（PDF），来自互联网公开整理，版权归原作者所有，仅供学习交流。
- `math-modeling-workbench/skills/math-modeling/assets/` —— 数学建模算法说明文档（优化/预测/评价/图论/统计/综合/机器学习）。
- `数学建模竞赛网上资源.md` —— 竞赛官网与学习资源链接整理。

如你是上述内容的权利人并希望调整署名或移除，请提 Issue 联系仓库作者。

## 作者原创内容

除上表所列组件与资料外，本仓库其余内容（工作流技能 `1start-mathmodel` ~ `6verity`、`doctor`、
`skill-prework`、`aigc-trace-cleaner`、`mathmodel-figure-templates`、`math-modeling-workbench` 预设本体、
README 与其视觉素材等）由仓库作者创作，采用 **MIT 许可证**（见 [`LICENSE`](LICENSE)）。

## 许可证适用范围（MIT 覆盖范围）

[`LICENSE`](LICENSE) 中的 MIT 许可证适用于**仓库作者原创内容**：

- 工作流技能：`1start-mathmodel`、`2analysis-modeling`、`3coding-visual`、`4drawio`、`5writing`、`6verity`
- 工具技能：`doctor`、`skill-prework`、`aigc-trace-cleaner`、`mathmodel-figure-templates`
- Agent 预设：`math-modeling-workbench/`（组装文件、插件、编排说明）
- 仓库文档与素材：`README.md`、`assets/`、本文件

**不适用** MIT 的部分（各自保留原许可证）：

- `01_docx-cn__docx-cn/`、`02_find-skills__find-skills/`、`04_chinese-thesis-workbench__*/`
- `math-modeling-workbench/skills/` 下的 `docx-cn`、`find-skills`、`chinese-thesis-workbench`、`skill-creator`
  （含各自 `LICENSE` / `LICENSE.txt`）
- `数学建模算法/` 及各类算法资料 PDF（公开整理，版权归原作者，仅供学习交流）
