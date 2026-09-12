// find-skills Skill — 标准宿主插件（agent preset 持久化版）
//
// 零依赖 ESM 模块：把随预设持久化的 skills/find-skills/SKILL.md 注册为
// 可被 skill 工具加载的内置 skill（与 math-modeling 插件同一机制）。
// 只消费宿主 skills 服务，不发布任何服务，无需 isolate realm。
// 路径从插件自身位置推导（插件位于 <预设>/plugins/，skill 位于 <预设>/skills/find-skills），
// 预设目录整体移动/复制到任何机器无需改路径。

const __here = typeof import.meta !== 'undefined' && import.meta.url ? import.meta.url : ''
let __bundleRoot = ''
try {
  if (__here) {
    const sk = new URL('../skills/find-skills', __here)
    let p = sk.pathname
    if (p.startsWith('/') && /^\/[A-Za-z]:/.test(p)) p = p.slice(1)
    __bundleRoot = decodeURIComponent(p)
  }
} catch (e) { __bundleRoot = '' }
const BUNDLED_SKILL_ROOT = __bundleRoot || ''

export const name = 'find-skills'

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
        name: "find-skills",
        description: "场景驱动+关键词双模式技能发现工具。当用户用自然语言描述场景/需求（如\"我想做一个海报\"\"帮我分析股票\"），或明确说\"安装技能/find skills/找个skill\"时，自动从官方内置、本地已安装、SkillHub、虾评、GitHub、ClawHub 六层联合搜索并推荐最合适的技能，支持一键安装。已完全替代官方原 find-skills 插件。",
        content,
      })
      console.error('[find-skills] 内置 skill find-skills 已注册')
    } else {
      console.error('[find-skills] SKILL.md 不存在: ' + mainMd)
    }
  } catch (e) {
    console.error('[find-skills] 内置 skill 注册失败: ' + String((e && e.message) || e))
  }
}
