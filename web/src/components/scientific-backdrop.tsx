/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { motion, useReducedMotion } from 'motion/react'

const FRAGMENTS = [
  'p(y|x)=softmax(Wh)',
  '∫₀∞e^{−x²}dx=√π/2',
  '道可道，非常道。',
  'POST /v1/messages',
  '∇×B=μ₀J+μ₀ε₀∂E/∂t',
  'await stream()',
  'det(A−λI)=0',
  '落霞与孤鹜齐飞，秋水共长天一色。',
  'O(n log n)',
  'ζ(s)=∑n⁻ˢ',
  '我思故我在。',
  'Authorization: Bearer $KEY',
  'H=−Σpᵢlog pᵢ',
  'SELECT model, SUM(quota) FROM logs',
  '海内存知己，天涯若比邻。',
  '01001000 01101001',
  'ΔG=ΔH−TΔS',
  '上善若水，水善利万物而不争。',
  'P(A|B)=P(B|A)P(A)/P(B)',
  'const tokens = await stream()',
  'ATP→ADP+Pi',
  '千里之行，始于足下。',
  'λx.x+1',
  'POST /v1/chat/completions',
  'E=mc²',
  'To be, or not to be.',
  'git commit -m "make it clear"',
  '∇f=(∂f/∂x,∂f/∂y)',
  '十二平均律 · 傅里叶变换',
  'try { ... } catch',
  'σ²=Σ(x−μ)²/N',
  'POST /v1/responses',
  '∮B·dl=μ₀I',
  '学而不思则罔，思而不学则殆。',
  'rate_limit(60/min)',
  'lim(1+1/n)ⁿ=e',
  'f(x)=∑aₙxⁿ',
  'const res = await fetch(url)',
  '存在即合理。',
  'POST /v1beta/models/{model}:generateContent',
  'i²=−1',
  '面朝大海，春暖花开。',
  'retry(3) · backoff(2s)',
  'φ=(1+√5)/2',
  '天行健，君子以自强不息。',
  'const key = process.env.API_KEY',
  'log p(x)=log p(x|z)+log p(z)−log p(z|x)',
  '明月几时有，把酒问青天。',
] as const

/**
 * Deterministic scatter: a fixed seed keeps positions stable between renders
 * and server/client, while sizes, rotations and drift speeds stay irregular so
 * the field reads as an information wall rather than a table. Every fragment
 * uses `currentColor`, so it follows the page theme.
 */
function seeded(index: number): number {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

const SCATTER = Array.from({ length: 2 }).flatMap((_, pass) =>
  FRAGMENTS.map((text, index) => {
    const seed = index + pass * 1000
    return {
      key: `${text}-${pass}`,
      text,
      x: seeded(seed) * 100,
      y: seeded(seed + 100) * 100,
      size: 10 + Math.round(seeded(seed + 200) * 10),
      rotate: (seeded(seed + 300) - 0.5) * 24,
      opacity: 0.16 + seeded(seed + 400) * 0.3,
      duration: 22 + seeded(seed + 500) * 40,
      driftX: (seeded(seed + 600) - 0.5) * 60,
      driftY: (seeded(seed + 700) - 0.5) * 40,
      serif: seeded(seed + 800) > 0.62,
    }
  })
)

interface ScientificBackdropProps {
  /** `hero` keeps the middle clear for large type; `page` runs edge to edge. */
  variant?: 'hero' | 'page'
}

export function ScientificBackdrop(props: ScientificBackdropProps) {
  const reduceMotion = useReducedMotion()
  const isPage = props.variant === 'page'

  return (
    <div
      aria-hidden='true'
      className='pointer-events-none absolute inset-0 -z-10 overflow-hidden'
    >
      <div
        className={
          isPage
            ? 'text-foreground absolute inset-0 [mask-image:linear-gradient(to_bottom,black_0%,black_88%,transparent)]'
            : 'text-foreground absolute inset-0 [mask-image:radial-gradient(ellipse_at_50%_45%,transparent_0%,transparent_24%,black_66%)]'
        }
      >
        {SCATTER.map((item, index) => (
          <motion.span
            key={item.key}
            className={`absolute whitespace-nowrap ${
              item.serif ? 'font-serif' : 'font-mono'
            }`}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              fontSize: `${item.size}px`,
              opacity: item.opacity,
              rotate: `${item.rotate}deg`,
              filter: index % 7 === 0 ? 'blur(0.4px)' : undefined,
            }}
            animate={
              reduceMotion
                ? undefined
                : {
                    x: [0, item.driftX, 0],
                    y: [0, item.driftY, 0],
                  }
            }
            transition={{
              duration: item.duration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {item.text}
          </motion.span>
        ))}
      </div>
      <div
        className={
          isPage
            ? 'bg-background/72 absolute inset-0'
            : 'bg-background/70 absolute inset-0'
        }
      />
      {isPage ? null : (
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,var(--background)_0%,transparent_72%)]' />
      )}
    </div>
  )
}
