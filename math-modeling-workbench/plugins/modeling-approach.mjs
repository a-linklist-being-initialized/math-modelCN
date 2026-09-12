// 建模思路（冲奖模型设计方法论）Skill — 标准宿主插件（agent preset 持久化版）
//
// 零依赖 ESM 模块：把随预设持久化的 skills/建模思路/SKILL.md 注册为
// 可被 skill 工具加载的内置 skill（与 math-modeling 插件同一机制）。
// 只消费宿主 skills 服务，不发布任何服务，无需 isolate realm。
// 路径从插件自身位置推导（插件位于 <预设>/plugins/，skill 位于 <预设>/skills/建模思路），
// 预设目录整体移动/复制到任何机器无需改路径。

const __here = typeof import.meta !== 'undefined' && import.meta.url ? import.meta.url : ''
let __bundleRoot = ''
try {
  if (__here) {
    const sk = new URL('../skills/建模思路', __here)
    let p = sk.pathname
    if (p.startsWith('/') && /^\/[A-Za-z]:/.test(p)) p = p.slice(1)
    __bundleRoot = decodeURIComponent(p)
  }
} catch (e) { __bundleRoot = '' }
const BUNDLED_SKILL_ROOT = __bundleRoot || ''

export const name = 'modeling-approach'

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
        name: '建模思路',
        description: '数学建模冲奖的模型设计方法论：每问一个主创新方向并保留可解释基线、创新落到真实约束、结果由求解状态与敏感性/鲁棒性检验支撑；含创新类型速查（算法改进/跨领域迁移/多模型融合/自适应优化）与总览表+四段式交付要求，随附算电协同四问完整冲奖设计范例（创新型冲奖模型设计.md）。当用户要求设计创新模型方案、冲奖模型思路、建模创新点、模型选型论证或参考获奖级建模设计时使用。',
        whenToUse: '当用户要求设计创新模型方案、冲奖模型思路、建模创新点、模型选型论证或参考获奖级建模设计时使用。',
        content,
      })
      console.error('[modeling-approach] 内置 skill 建模思路 已注册')
    } else {
      console.error('[modeling-approach] SKILL.md 不存在: ' + mainMd)
    }
  } catch (e) {
    console.error('[modeling-approach] 内置 skill 注册失败: ' + String((e && e.message) || e))
  }
}
