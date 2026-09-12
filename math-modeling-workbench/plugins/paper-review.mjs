// paper-review Skill — 标准宿主插件（agent preset 持久化版）
//
// 零依赖 ESM 模块：把随预设持久化的 skills/paper-review/SKILL.md 注册为
// 可被 skill 工具加载的内置 skill（与 math-modeling 插件同一机制）。
// 只消费宿主 skills 服务，不发布任何服务，无需 isolate realm。
// 路径从插件自身位置推导（插件位于 <预设>/plugins/，skill 位于 <预设>/skills/paper-review），
// 预设目录整体移动/复制到任何机器无需改路径。

const __here = typeof import.meta !== 'undefined' && import.meta.url ? import.meta.url : ''
let __bundleRoot = ''
try {
  if (__here) {
    const sk = new URL('../skills/paper-review', __here)
    let p = sk.pathname
    if (p.startsWith('/') && /^\/[A-Za-z]:/.test(p)) p = p.slice(1)
    __bundleRoot = decodeURIComponent(p)
  }
} catch (e) { __bundleRoot = '' }
const BUNDLED_SKILL_ROOT = __bundleRoot || ''

export const name = 'paper-review'

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
        name: "paper-review",
        description: "Review academic papers for correctness, quality, and novelty using OpenJudge's multi-stage pipeline. Supports PDF files and LaTeX source packages (.tar.gz/.zip). Covers 10 disciplines: cs, medicine, physics, chemistry, biology, economics, psychology, environmental_science, mathematics, social_sciences. Use when the user asks to review, evaluate, critique, or assess a research paper, check references, or verify a BibTeX file.\n",
        content,
      })
      console.error('[paper-review] 内置 skill paper-review 已注册')
    } else {
      console.error('[paper-review] SKILL.md 不存在: ' + mainMd)
    }
  } catch (e) {
    console.error('[paper-review] 内置 skill 注册失败: ' + String((e && e.message) || e))
  }
}
