// 数据预处理（R 语言）Skill — 标准宿主插件（agent preset 持久化版）
//
// 零依赖 ESM 模块：把随预设持久化的 skills/数据预处理R语言/SKILL.md 注册为
// 可被 skill 工具加载的内置 skill（与 math-modeling 插件同一机制）。
// 只消费宿主 skills 服务，不发布任何服务，无需 isolate realm。
// 路径从插件自身位置推导（插件位于 <预设>/plugins/，skill 位于 <预设>/skills/数据预处理R语言），
// 预设目录整体移动/复制到任何机器无需改路径。
//
// v2: description 更新——轻量局部模式、降级策略、math-modeling 依赖声明、阈值可覆盖。

const __here = typeof import.meta !== 'undefined' && import.meta.url ? import.meta.url : ''
let __bundleRoot = ''
try {
  if (__here) {
    const sk = new URL('../skills/数据预处理R语言', __here)
    let p = sk.pathname
    if (p.startsWith('/') && /^\/[A-Za-z]:/.test(p)) p = p.slice(1)
    __bundleRoot = decodeURIComponent(p)
  }
} catch (e) { __bundleRoot = '' }
const BUNDLED_SKILL_ROOT = __bundleRoot || ''

export const name = 'data-preprocess-r'

export async function apply(ctx) {
  const fs = ctx.get('fs')
  const skills = ctx.get('skills')
  if (!fs || !skills || !BUNDLED_SKILL_ROOT) return

  const join = (...parts) => parts.filter(Boolean).join('/')
  const targetOf = (p) => fs.resolve(p)
  const exists = async (p) => {
    try { const t = await targetOf(p); const info = await fs.stat(t); return info || null } catch (e) { return null }
  }
  const readFile = async (p) => fs.readText(await targetOf(p))

  try {
    const mainMd = join(BUNDLED_SKILL_ROOT, 'SKILL.md')
    const info = await exists(mainMd)
    if (info) {
      const content = await readFile(mainMd)
      skills.register({
        name: '数据预处理R语言',
        description: '完备严谨的统计学数据预处理流程（默认 R 语言，无 R 时可降级为"生成可本地运行脚本"或 Python 分支）。支持两种模式：完整全流程（10 步）或轻量局部模式（只执行用户指定的若干步骤）。10 步：分布探查→描述统计与交叉表→数据清洗(缺失/异常/一致性)→数据变换(防泄漏)→变量编码与重赋值→衍生变量与分组分层→平稳性检验(非时序跳过)→多重共线性与降维→数据集划分→结果验证。每步输出代码、配图、UTF-8 with BOM CSV；阈值(VIF>10、|偏度|>1)为默认值、可由用户覆盖；关键决策点（异常取舍、缺失填补方案）会暂停与用户确认。本技能是底层业务工具，可由 math-modeling 内部按需加载；仅做局部清洗/编码等单步处理或明确要求 Python 时按轻量模式执行，避免与 math-modeling 同时顶层触发两套流程。',
        whenToUse: '当用户要求数据预处理、数据清洗、数据探索、变量编码/重赋值、异常值/缺失值处理、多重共线性检验、降维、数据集划分，或要求对数据文件做系统性统计预处理时使用；数学建模任务中由 math-modeling 按需内部加载本技能。',
        content,
      })
      console.error('[dppr] 内置 skill 数据预处理R语言 已注册')
    } else {
      console.error('[dppr] SKILL.md 不存在: ' + mainMd)
    }
  } catch (e) {
    console.error('[dppr] 内置 skill 注册失败: ' + String((e && e.message) || e))
  }
}
