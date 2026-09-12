// skill-creator Skill — 标准宿主插件（agent preset 持久化版）
//
// 零依赖 ESM 模块：把随预设持久化的 skills/skill-creator/SKILL.md 注册为
// 可被 skill 工具加载的内置 skill（与 math-modeling 插件同一机制）。
// 只消费宿主 skills 服务，不发布任何服务，无需 isolate realm。
// 路径从插件自身位置推导（插件位于 <预设>/plugins/，skill 位于 <预设>/skills/skill-creator），
// 预设目录整体移动/复制到任何机器无需改路径。

const __here = typeof import.meta !== 'undefined' && import.meta.url ? import.meta.url : ''
let __bundleRoot = ''
try {
  if (__here) {
    const sk = new URL('../skills/skill-creator', __here)
    let p = sk.pathname
    if (p.startsWith('/') && /^\/[A-Za-z]:/.test(p)) p = p.slice(1)
    __bundleRoot = decodeURIComponent(p)
  }
} catch (e) { __bundleRoot = '' }
const BUNDLED_SKILL_ROOT = __bundleRoot || ''

export const name = 'skill-creator'

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
        name: 'skill-creator',
        description: '创建/更新可复用 skill 的完整指南：设计原则（简洁为要、渐进式披露、按任务脆弱度匹配自由度）、Skill 结构（SKILL.md + scripts/references/assets）、初始化模板脚本（scripts/init_skill.py）、打包与自动校验（scripts/package_skill.py、scripts/quick_validate.py）、基于真实使用的迭代流程。当用户要求创建新 skill、把 DSH 工作中某一可复用模块做成通用 skill、或更新/打包已有 skill 时使用。',
        whenToUse: '当用户要求创建新 skill、将 DSH 工作流中的某一模块通用化为可复用 skill、或更新/打包已有 skill 时使用。',
        content,
      })
      console.error('[skill-creator] 内置 skill skill-creator 已注册')
    } else {
      console.error('[skill-creator] SKILL.md 不存在: ' + mainMd)
    }
  } catch (e) {
    console.error('[skill-creator] 内置 skill 注册失败: ' + String((e && e.message) || e))
  }
}
