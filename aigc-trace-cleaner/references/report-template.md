# 检测报告模板（Markdown 默认 / HTML 可选）

## 一、Markdown 报告结构（默认交付）

```markdown
# AI 痕迹检测报告 ——《论文标题》

- 生成时间：YYYY-MM-DD
- 论文信息：字数 XXXX 字｜章节 X 章｜图表 X 图 X 表
- **AI 生成概率：D 级（约 65%）**
- 问题统计：🔴 严重 X 个 ｜ 🟡 中等 Y 个 ｜ 🟢 轻微 Z 个

## 一、总体评估
（200–300 字综合评价：最突出的问题、最可疑的章节、整体像不像人写的）

### 10 维得分（0–100，越低问题越多）
| 维度 | 得分 | 严重/中等/轻微 |
|---|---|---|
| 1 词汇层 | 45 | 3/8/5 |
| …（10 行） | | |

> 最需改进的 3 个维度：① … ② … ③ …

## 二、详细问题清单（按论文顺序）

### P-001 ｜ 摘要第 2 段第 3 句
- **所属维度**：维度 1 词汇层
- **问题类型**：AI 高频词滥用
- **严重度**：🟡 中等
- **原文**："在此基础上，本文进一步分析了…"
- **深度分析**："在此基础上"与"进一步"均为 AI 典型过渡词，同句出现暴露生成痕迹；人类通常直接写"进而分析"或"我们分析"。
- **修改建议**：删"在此基础上"，"进一步分析"→"分析"，"本文"→"我们"。
- **修改示例**：
  - 原文：在此基础上，本文进一步分析了 Y 与 X 的关系。
  - 改后：进而，我们分析了 Y 与 X 的关系。

### P-002 ｜ …

## 三、维度汇总
| 维度 | 问题数 | 典型问题（2–3 个） | 改进方向 |
|---|---|---|---|
| 1 词汇层 | 16 | AI 高频词 9、空洞形容词连用 4、进行+名词 3 | 先删后换，优先处理强标志词 |

## 四、优先级修改路线图
- **第一优先级（必须改）**：P-00x、P-00y …（🔴）
- **第二优先级（建议改）**：…（🟡）
- **第三优先级（可选）**：…（🟢）
- 预计修改时间：约 X 小时
- 批量技巧：针对最集中的 3 个维度给 3 条批量处理技巧

## 五、附录
- 附录 A：本次命中的 AI 高频词表（词 / 次数 / 阈值 / 建议替换）
- 附录 B：建议注入的人味表达位置清单（段落 + 建议表达）
- 附录 C：检测方法说明与阈值来源
- 附录 D：修改原则提醒（只改表达不改内容等）
```

## 二、HTML 报告（用户要求时）

### 2.1 基本骨架

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>AI痕迹检测报告 - [论文标题]</title>
<style>
body{font-family:-apple-system,"Microsoft YaHei",sans-serif;max-width:1000px;margin:0 auto;padding:20px;background:#f5f7fa;color:#333;line-height:1.6}
h1{color:#1a3c6e;border-bottom:3px solid #1a3c6e;padding-bottom:10px}
h2{color:#2c5a8e;margin-top:30px;border-left:4px solid #2c5a8e;padding-left:10px}
.severity-severe{background:#ffebee;color:#b71c1c;padding:2px 8px;border-radius:4px;font-weight:bold}
.severity-medium{background:#fff8e1;color:#8a6d00;padding:2px 8px;border-radius:4px;font-weight:bold}
.severity-light{background:#e8f5e9;color:#1b5e20;padding:2px 8px;border-radius:4px;font-weight:bold}
.issue-card{background:#fff;border-radius:8px;padding:15px;margin-bottom:15px;box-shadow:0 2px 4px rgba(0,0,0,.1);border-left:4px solid #ccc}
.issue-card.severe{border-left-color:#b71c1c}
.issue-card.medium{border-left-color:#8a6d00}
.issue-card.light{border-left-color:#1b5e20}
.comparison{display:flex;gap:10px;margin-top:10px}
.original{flex:1;background:#fff3e0;padding:10px;border-radius:4px}
.modified{flex:1;background:#e8f5e9;padding:10px;border-radius:4px}
table{width:100%;border-collapse:collapse;margin:15px 0}
th{background:#1a3c6e;color:#fff;padding:10px;text-align:left}
td{padding:8px 10px;border-bottom:1px solid #eee}
tr:nth-child(even){background:#f8f9fa}
</style>
</head>
<body>
<!-- 报告内容：总体评估 → 详细问题清单 → 维度汇总 → 优先级建议 → 附录 -->
</body>
</html>
```

### 2.2 问题卡片结构

```html
<div class="issue-card medium">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <strong>P-001 ｜ 摘要第2段第3句</strong>
    <span class="severity-medium">🟡 中等</span>
  </div>
  <p><strong>所属维度：</strong>维度1：词汇层AI痕迹</p>
  <p><strong>问题类型：</strong>AI高频词滥用</p>
  <p><strong>原文：</strong>"在此基础上，本文进一步分析了…"</p>
  <p><strong>深度分析：</strong>…</p>
  <p><strong>修改建议：</strong>…</p>
  <div class="comparison">
    <div class="original"><strong>原文：</strong><br>…</div>
    <div class="modified"><strong>修改后：</strong><br>…</div>
  </div>
</div>
```

### 2.3 HTML 报告必备内容块

报告标题 + 生成时间 + 论文基本信息 ｜ 总体评估区（概率、10 维雷达/条形、整体评价、问题统计）｜ 详细问题清单（卡片，按论文顺序）｜ 维度汇总表 ｜ 优先级建议 ｜ 附录（命中词表、人味注入位置、方法说明）。
