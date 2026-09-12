#!/usr/bin/env node
// aigc-trace-cleaner 机械统计扫描器（零依赖，Node >= 18）
//
// 用法：
//   node scan.mjs <文本文件.txt|.md|.docx> [--json]
//   node scan.mjs --dir <目录>                     # 扫描目录下所有 .txt/.md
//   node scan.mjs <论文.docx>                      # 直接读 docx（纯 Node 内置 zip，不依赖外部程序）
//   （Windows/沙箱环境建议用正斜杠路径，例如 E:/path/to/论文.docx）
//
// 输出：人读摘要（默认）或 JSON（--json），供检测报告直接引用。
// 说明：本脚本只做"可机械判定"的统计；语义级判断（逻辑断层、幻觉文献等）仍由模型完成。

import { readFileSync, readdirSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'
import { join, extname, basename, resolve } from 'node:path'

// ---------- 词库（与 references/ai-word-library.md 同步） ----------
const TRANSITIONS = ['在此基础上', '进一步分析表明', '进一步显示', '进一步表明', '综上所述', '由此可见', '值得注意的是', '需要指出的是', '不难发现', '众所周知', '显而易见', '毋庸置疑', '因此', '然而', '此外', '首先', '其次', '最后', '总的来说', '总之']
const EMPTY_ADJ = ['完整的', '详细的', '全面的', '系统的', '深入的', '精确的', '有效的', '显著的', '重要的', '关键的', '核心的', '主要的', '基本的', '根本的', '必要的', '必需的', '充分的', '充足的', '丰富的', '有力的', '有益的', '有用的', '有意义的', '有价值的', '有针对性的', '有代表性的', '有说服力的', '有创造性的', '有创新性的', '有突破性的']
const PERFORM_VERBS = ['进行分析', '进行计算', '进行比较', '进行优化', '进行验证', '进行检验', '进行估计', '进行预测', '进行分类', '进行聚类', '进行回归', '进行拟合', '进行求解', '进行建模', '进行研究', '进行探讨', '进行讨论', '进行总结', '进行推理', '进行判断', '进行决策', '进行选择', '进行筛选', '进行清洗', '进行预处理', '进行设计', '进行开发', '进行实现', '进行测试', '进行评估', '进行评价', '进行度量', '进行测量']
const SELF_REF = ['本文提出', '本文采用', '本文使用', '本文的方法', '本文阈值']
const HUMAN_MARKERS = ['说白了', '换句话说', '简单来说', '换个角度看', '一个细节是', '值得一提的是', '有意思的是', '不难理解', '我们倾向于', '我们认为', '在我们看来', '我们的经验是', '我们建议', '我们选择', '大致', '大概', '基本上', '在一定程度上', '似乎', '也许', '有待进一步验证']
const HEDGES = ['可能', '也许', '大致', '大概', '基本上', '在一定程度上', '似乎', '倾向于', '有待', '未必', '不一定']

// ---------- 工具 ----------
const count = (text, needle) => text.split(needle).length - 1
const cjkLen = (s) => (s.match(/[\u4e00-\u9fa5]/g) || []).length
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
const std = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)) }
const round = (x, n = 3) => Math.round(x * 10 ** n) / 10 ** n

// 纯 Node 读取 docx 正文（内置 zip：中央目录 + raw inflate，零依赖、不 spawn 外部进程）
function unzipEntry(buf, wantName) {
  // 1) 定位 EOCD
  let eocd = -1
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('不是有效的 zip/docx（未找到 EOCD）')
  const cdOffset = buf.readUInt32LE(eocd + 16)
  const cdCount = buf.readUInt16LE(eocd + 10)
  let p = cdOffset
  for (let n = 0; n < cdCount; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break
    const method = buf.readUInt16LE(p + 10)
    const compSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const localOffset = buf.readUInt32LE(p + 42)
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8')
    if (name === wantName) {
      const lNameLen = buf.readUInt16LE(localOffset + 26)
      const lExtraLen = buf.readUInt16LE(localOffset + 28)
      const dataStart = localOffset + 30 + lNameLen + lExtraLen
      const data = buf.subarray(dataStart, dataStart + compSize)
      return method === 0 ? data : inflateRawSync(data)
    }
    p += 46 + nameLen + extraLen + commentLen
  }
  throw new Error('zip 内未找到 ' + wantName)
}

function extractDocx(file) {
  const buf = readFileSync(file)
  const xml = unzipEntry(buf, 'word/document.xml').toString('utf8')
  return xml.split('</w:p>').map((p) => p.replace(/<w:tab[^>]*\/>/g, ' ').replace(/<w:br[^>]*\/>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()).filter(Boolean).join('\n')
}

// ---------- 国赛 AI 合规机械核查（对照 references/national-competition-compliance.md） ----------
function seqCheck(arr) {
  const s = [...new Set(arr)].sort((a, b) => a - b)
  const gaps = []
  for (let i = 1; i < s.length; i++) if (s[i] !== s[i - 1] + 1) gaps.push(s[i - 1] + '→' + s[i])
  return { 最大编号: s.length ? s[s.length - 1] : 0, 编号个数: s.length, 断号: gaps }
}

function complianceCheck(text) {
  const paras = text.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  const out = {}

  // 1) 摘要字数（摘要 → 关键词/正文 之间）
  const absStart = paras.findIndex((p) => /^摘\s*要/.test(p))
  let absText = ''
  if (absStart >= 0) {
    for (let i = absStart + 1; i < paras.length; i++) {
      if (/^关键词/.test(paras[i]) || /^1\s+问题重述/.test(paras[i]) || /^一[、\s]/.test(paras[i])) break
      absText += paras[i]
    }
  }
  const absLen = cjkLen(absText)
  out.摘要 = {
    字数: absLen,
    判定: absLen === 0 ? '未识别到摘要（需人工核验）' : absLen >= 800 && absLen <= 1000 ? '合格(800–1000字)' : '存在问题(国赛要求800–1000字)',
    含关键词: paras.some((p) => /^关键词/.test(p)),
  }

  // 2) 模型假设条数（国赛建议 4–6 条）
  const asIdx = paras.findIndex((p) => /模型假设/.test(p))
  let asCount = 0
  if (asIdx >= 0) {
    for (let i = asIdx + 1; i < Math.min(paras.length, asIdx + 40); i++) {
      if (/^(4|四)[、\s]/.test(paras[i]) || /符号说明/.test(paras[i])) break
      if (/^\d{1,2}\s*[.、]/.test(paras[i])) asCount++
    }
  }
  out.模型假设 = { 条数: asCount, 判定: asCount === 0 ? '未识别（需人工核验）' : asCount >= 4 && asCount <= 6 ? '合格(4–6条)' : '存在问题(国赛建议4–6条)' }

  // 3) 三大检验（误差/灵敏度/稳健性）
  const chk = { 误差分析: /误差分析|误差估计|残差分析|交叉验证|回测/.test(text), 灵敏度分析: /灵敏度|敏感性/.test(text), 稳健性分析: /稳健|鲁棒/.test(text) }
  out.三大检验 = { ...chk, 判定: Object.values(chk).every(Boolean) ? '齐全' : '缺失: ' + Object.entries(chk).filter(([, v]) => !v).map(([k]) => k).join('、') }

  // 4) 结构模块完整性
  const mods = ['关键词', '问题重述', '问题分析', '模型假设', '符号说明', '模型检验', '优缺点', '参考文献']
  out.结构模块 = Object.fromEntries(mods.map((m) => [m, text.includes(m)]))
  out.结构模块.缺失 = mods.filter((m) => !text.includes(m))

  // 5) 匿名合规线索（学校/姓名/队号/联系方式；排除赛名与声明中的合规用词）
  const anonRe = /(队号|指导教师|联系电话|姓名\s*[:：]|@[a-z0-9.-]+\.[a-z]{2,}|\b1[3-9]\d{9}\b|[\u4e00-\u9fa5]{2,8}(大学(?!生)|学院|中学))/
  const anonExclude = /数学建模竞赛|工具使用声明|人工智能工具使用规定|参赛队|参赛队员|组委会|参考文献|\[\d+\]/
  const anonHits = paras.filter((p) => anonRe.test(p) && !anonExclude.test(p)).slice(0, 5)
  out.匿名合规 = {
    疑似命中: anonHits.length,
    示例: anonHits.map((s) => s.slice(0, 40)),
    判定: anonHits.length ? '待人工核验（疑似身份信息）' : '未发现明显身份信息',
  }

  // 6) 图表 / 公式编号连续性
  out.图表编号 = {
    图: seqCheck([...text.matchAll(/图\s*(\d+)/g)].map((m) => +m[1])),
    表: seqCheck([...text.matchAll(/表\s*(\d+)/g)].map((m) => +m[1])),
  }
  out.公式编号 = seqCheck([...text.matchAll(/\((\d{1,3})\)/g)].map((m) => +m[1]))

  // 7) AI 使用声明
  out.AI声明 = { 存在: /AI\s*工具使用声明|人工智能工具使用规定|AI\s*使用声明|AI\s*工具使用详情/.test(text) }

  // 8) 必须人工核验的项（文本层无法判定）
  out.人工核验项 = ['正文页数（20–32 页，最优 25–30）', '摘要是否单独一页且不跨页', '三线表规范', '图片清晰度与配色是否默认模板', '字体/字号/行距/页边距统一性', '页眉页脚是否含身份信息']
  return out
}

function analyze(text, label) {
  const paras = text.split(/\n+/).map((p) => p.trim()).filter((p) => cjkLen(p) > 0)
  const plens = paras.map(cjkLen)
  const sentences = text.split(/[。！？!?；;]/).map((s) => s.trim()).filter((s) => cjkLen(s) > 0)
  const slens = sentences.map(cjkLen)
  const total = cjkLen(text)

  const hit = {}
  for (const w of [...TRANSITIONS, ...EMPTY_ADJ, ...PERFORM_VERBS, ...SELF_REF]) {
    const c = count(text, w)
    if (c > 0) hit[w] = c
  }
  // 空洞形容词连用（同一句内 ≥2 个）
  let adjPairs = 0
  for (const s of sentences) {
    const n = EMPTY_ADJ.filter((a) => s.includes(a)).length
    if (n >= 2) adjPairs++
  }
  // 小数位 >3 的数字
  const longDecimals = (text.match(/\d+\.\d{4,}/g) || []).length
  // 图表标题模板化
  const figTitles = (text.match(/[图表]\s*\d+\s*[^\n]{0,40}/g) || [])
  const tplTitles = figTitles.filter((t) => /(对比|结果|曲线|示意图|参数设置|统计数据)$/.test(t.trim())).length

  const r = {
    label,
    总字数_汉字: total,
    段落数: paras.length,
    段落长度: { 均值: round(mean(plens), 1), 标准差: round(std(plens), 1), 最短: Math.min(...plens, 0), 最长: Math.max(...plens, 0), 变异系数: round(std(plens) / (mean(plens) || 1)), 判定: std(plens) < 30 ? 'AI嫌疑(标准差<30)' : std(plens) < 50 ? '偏均匀' : '正常(>50)' },
    句长: { 句数: slens.length, 均值: round(mean(slens), 1), 超50字长句占比: round(slens.filter((x) => x > 50).length / (slens.length || 1)), 超50字长句占比判定: slens.filter((x) => x > 50).length / (slens.length || 1) > 0.4 ? 'AI嫌疑(>40%)' : '正常' },
    的字密度: round(count(text, '的') / (total || 1)) + ' (正常3-5%，>6%可疑)',
    过渡词密度_每千字: round(([...TRANSITIONS].reduce((s, w) => s + count(text, w), 0) / (total || 1)) * 1000, 1),
    人味指标: { 人味表达数: HUMAN_MARKERS.reduce((s, w) => s + count(text, w), 0), 每千字: round((HUMAN_MARKERS.reduce((s, w) => s + count(text, w), 0) / (total || 1)) * 1000, 2) + ' (人类1-2处/千字)', 不确定性词数: HEDGES.reduce((s, w) => s + count(text, w), 0), 设问句数: (text.match(/[？?]/g) || []).length, 破折号数: count(text, '——') },
    结构指标: { 空洞形容词连用句数: adjPairs, 超3位小数数字个数: longDecimals, 图表标题数: figTitles.length, 疑似模板化标题数: tplTitles },
    高频词命中: hit,
    可疑段落摘录: paras.filter((p) => { const n = [...TRANSITIONS, ...EMPTY_ADJ, ...PERFORM_VERBS].filter((w) => p.includes(w)).length; return n >= 3 }).slice(0, 10).map((p) => p.slice(0, 80)),
  }
  // 综合风险提示（仅机械层面）
  const flags = []
  if (r.段落长度.判定.startsWith('AI')) flags.push('段落长度过于均匀')
  if (r.句长.超50字长句占比判定.startsWith('AI')) flags.push('长句过多')
  if (parseFloat(r.的字密度) > 0.06) flags.push('的字密度偏高')
  if (r.人味指标.每千字 === 0 || parseFloat(r.人味指标.每千字) < 0.5) flags.push('人味表达不足')
  if (r.结构指标.空洞形容词连用句数 > 0) flags.push('空洞形容词连用')
  if (r.结构指标.超3位小数数字个数 > 0) flags.push('小数位过多')
  if (r.过渡词密度_每千字 > 20) flags.push('过渡词密度偏高')
  r.机械风险提示 = flags.length ? flags : ['未发现明显机械型 AI 痕迹']
  r.合规核查 = complianceCheck(text)
  return r
}

// ---------- 主流程 ----------
const args = process.argv.slice(2)
const asJson = args.includes('--json')
const positional = args.filter((a) => !a.startsWith('--'))
const files = []
if (args[0] === '--dir') {
  const d = resolve(positional[0])
  for (const f of readdirSync(d)) if (['.txt', '.md'].includes(extname(f).toLowerCase())) files.push(join(d, f))
} else {
  for (const p of positional) files.push(resolve(p))
}

const readText = (f) => (extname(f).toLowerCase() === '.docx' ? extractDocx(f) : readFileSync(f, 'utf8'))
const results = files.map((f) => analyze(readText(f), basename(f)))
if (asJson) {
  console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2))
} else {
  for (const r of results) {
    console.log('=== ' + r.label + ' ===')
    console.log('总字数(汉字):', r.总字数_汉字, '| 段落数:', r.段落数)
    console.log('段落长度:', JSON.stringify(r.段落长度))
    console.log('句长:', JSON.stringify(r.句长))
    console.log('的字密度:', r.的字密度)
    console.log('过渡词密度:', r.过渡词密度_每千字, '次/千字')
    console.log('人味指标:', JSON.stringify(r.人味指标))
    console.log('结构指标:', JSON.stringify(r.结构指标))
    console.log('高频词命中(次数):', Object.entries(r.高频词命中).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => `${k}×${v}`).join('、') || '无')
    console.log('可疑段落(同段≥3个AI高频词):', r.可疑段落摘录.length)
    r.可疑段落摘录.forEach((p) => console.log('  - ' + p))
    console.log('机械风险提示:', r.机械风险提示.join('；'))
    const c = r.合规核查
    console.log('--- 国赛 AI 合规机械核查 ---')
    console.log('摘要:', JSON.stringify(c.摘要))
    console.log('模型假设:', JSON.stringify(c.模型假设))
    console.log('三大检验:', JSON.stringify(c.三大检验))
    console.log('结构模块缺失:', c.结构模块.缺失.length ? c.结构模块.缺失.join('、') : '无')
    console.log('匿名合规:', JSON.stringify(c.匿名合规))
    console.log('图表编号:', JSON.stringify(c.图表编号))
    console.log('公式编号:', JSON.stringify(c.公式编号))
    console.log('AI 使用声明:', c.AI声明.存在 ? '存在' : '未检出（国赛需声明，建议人工确认）')
    console.log('需人工核验:', c.人工核验项.join('；'))
    console.log('')
  }
}
