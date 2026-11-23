/**
 * 手写选假名的干扰项。按拍做细微发音变化，可以不是词库里的词。
 * 评分仍用混淆规范里的发音相似和假名结构，语义和个人记录在这一题型里没有对象，权重按原比例并到这两项。
 */

export type ConfusionRule =
  | 'youon-swap'
  | 'youon-expand'
  | 'youon-contract'
  | 'long-vowel'
  | 'geminate'
  | 'voicing'
  | 'vowel-step'

export interface KanaOption {
  kana: string
  correct: boolean
  rule: ConfusionRule | null
  /** 工程混淆分，0 到 1。不是真实听错概率。 */
  score: number
}

type Vowel = 'a' | 'i' | 'u' | 'e' | 'o'
type Voice = 0 | 1 | 2

interface Mora {
  text: string
  kind: 'cv' | 'youon' | 'sokuon' | 'hatsuon' | 'chouon'
  row: string
  vowel: Vowel | ''
  voice: Voice
}

interface Candidate {
  kana: string
  rule: ConfusionRule
  score: number
}

const VOWELS: Vowel[] = ['a', 'i', 'u', 'e', 'o']
const SMALL: Record<string, 'a' | 'u' | 'o'> = { ゃ: 'a', ゅ: 'u', ょ: 'o' }
const SMALL_OF: Record<'a' | 'u' | 'o', string> = { a: 'ゃ', u: 'ゅ', o: 'ょ' }

const GRID: { row: string; voice: Voice; byVowel: Partial<Record<Vowel, string>> }[] = [
  { row: '', voice: 0, byVowel: { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' } },
  { row: 'k', voice: 0, byVowel: { a: 'か', i: 'き', u: 'く', e: 'け', o: 'こ' } },
  { row: 'k', voice: 1, byVowel: { a: 'が', i: 'ぎ', u: 'ぐ', e: 'げ', o: 'ご' } },
  { row: 's', voice: 0, byVowel: { a: 'さ', i: 'し', u: 'す', e: 'せ', o: 'そ' } },
  { row: 's', voice: 1, byVowel: { a: 'ざ', i: 'じ', u: 'ず', e: 'ぜ', o: 'ぞ' } },
  { row: 't', voice: 0, byVowel: { a: 'た', i: 'ち', u: 'つ', e: 'て', o: 'と' } },
  { row: 't', voice: 1, byVowel: { a: 'だ', i: 'ぢ', u: 'づ', e: 'で', o: 'ど' } },
  { row: 'n', voice: 0, byVowel: { a: 'な', i: 'に', u: 'ぬ', e: 'ね', o: 'の' } },
  { row: 'h', voice: 0, byVowel: { a: 'は', i: 'ひ', u: 'ふ', e: 'へ', o: 'ほ' } },
  { row: 'h', voice: 1, byVowel: { a: 'ば', i: 'び', u: 'ぶ', e: 'べ', o: 'ぼ' } },
  { row: 'h', voice: 2, byVowel: { a: 'ぱ', i: 'ぴ', u: 'ぷ', e: 'ぺ', o: 'ぽ' } },
  { row: 'm', voice: 0, byVowel: { a: 'ま', i: 'み', u: 'む', e: 'め', o: 'も' } },
  { row: 'y', voice: 0, byVowel: { a: 'や', u: 'ゆ', o: 'よ' } },
  { row: 'r', voice: 0, byVowel: { a: 'ら', i: 'り', u: 'る', e: 'れ', o: 'ろ' } },
  { row: 'w', voice: 0, byVowel: { a: 'わ', o: 'を' } },
]

const CHAR_INFO = new Map<string, { row: string; vowel: Vowel; voice: Voice }>()
for (const row of GRID) {
  for (const vowel of VOWELS) {
    const text = row.byVowel[vowel]
    if (text) CHAR_INFO.set(text, { row: row.row, vowel, voice: row.voice })
  }
}

const YOUON_ROWS = new Set(['k', 's', 't', 'n', 'h', 'm', 'r'])
const LENGTH_VOWEL: Record<Vowel, Vowel> = { a: 'a', i: 'i', u: 'u', e: 'i', o: 'u' }

/** 手写选假名先降到这个混淆分，仍不够再按规范往下降。 */
const SCORE_FLOORS = [0.72, 0.6, 0.45, 0.3]

/** 把片假名收成平假名再切拍。长音符号保留。 */
function toHiragana(input: string): string {
  return [...input]
    .map((char) => {
      const code = char.codePointAt(0) ?? 0
      if (code >= 0x30a1 && code <= 0x30f6) return String.fromCodePoint(code - 0x60)
      return char
    })
    .join('')
}

function toKatakana(input: string): string {
  return [...input]
    .map((char) => {
      const code = char.codePointAt(0) ?? 0
      if (code >= 0x3041 && code <= 0x3096) return String.fromCodePoint(code + 0x60)
      return char
    })
    .join('')
}

function usesKatakana(input: string): boolean {
  return [...input].some((char) => {
    const code = char.codePointAt(0) ?? 0
    return code >= 0x30a1 && code <= 0x30fc
  })
}

function baseChar(row: string, vowel: Vowel, voice: Voice): string | null {
  const found = GRID.find((item) => item.row === row && item.voice === voice)
  return found?.byVowel[vowel] ?? null
}

function cvMora(row: string, vowel: Vowel, voice: Voice): Mora | null {
  const text = baseChar(row, vowel, voice)
  if (!text) return null
  return { text, kind: 'cv', row, vowel, voice }
}

function youonMora(row: string, vowel: 'a' | 'u' | 'o', voice: Voice): Mora | null {
  if (!YOUON_ROWS.has(row)) return null
  const base = baseChar(row, 'i', voice)
  if (!base) return null
  return {
    text: base + SMALL_OF[vowel],
    kind: 'youon',
    row,
    vowel,
    voice,
  }
}

/** 切成拍。きゃ 是一拍，きや 是两拍。无法识别的字符丢掉。 */
export function parseMorae(input: string): Mora[] {
  const text = toHiragana(input).replace(/\s+/g, '')
  const morae: Mora[] = []
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === 'っ') {
      morae.push({ text: 'っ', kind: 'sokuon', row: '', vowel: '', voice: 0 })
      continue
    }
    if (char === 'ー') {
      morae.push({ text: 'ー', kind: 'chouon', row: '', vowel: '', voice: 0 })
      continue
    }
    if (char === 'ん') {
      morae.push({ text: 'ん', kind: 'hatsuon', row: '', vowel: '', voice: 0 })
      continue
    }
    const info = CHAR_INFO.get(char)
    if (!info) continue
    const next = text[index + 1]
    const small = next ? SMALL[next] : undefined
    if (small && info.vowel === 'i' && YOUON_ROWS.has(info.row)) {
      const youon = youonMora(info.row, small, info.voice)
      if (youon) {
        morae.push(youon)
        index += 1
        continue
      }
    }
    morae.push({ text: char, kind: 'cv', row: info.row, vowel: info.vowel, voice: info.voice })
  }
  return morae
}

function joinMorae(morae: Mora[]): string {
  return morae.map((mora) => mora.text).join('')
}

function cloneMorae(morae: Mora[]): Mora[] {
  return morae.map((mora) => ({ ...mora }))
}

function pushUnique(list: Candidate[], seen: Set<string>, kana: string, rule: ConfusionRule, target: string) {
  if (!kana || kana === target || seen.has(kana)) return
  seen.add(kana)
  list.push({ kana, rule, score: confusionScore(target, kana) })
}

/** 从一个词的读音变出细微差别：拗音、长音、促音、清浊、相邻元音。 */
function mutate(target: string): Candidate[] {
  const morae = parseMorae(target)
  const found: Candidate[] = []
  const seen = new Set<string>()

  morae.forEach((mora, index) => {
    if (mora.kind === 'youon' && (mora.vowel === 'a' || mora.vowel === 'u' || mora.vowel === 'o')) {
      for (const vowel of ['a', 'u', 'o'] as const) {
        if (vowel === mora.vowel) continue
        const next = cloneMorae(morae)
        const swapped = youonMora(mora.row, vowel, mora.voice)
        if (!swapped) continue
        next[index] = swapped
        pushUnique(found, seen, joinMorae(next), 'youon-swap', target)
      }
      const expanded = cloneMorae(morae)
      const head = cvMora(mora.row, 'i', mora.voice)
      const tail = cvMora('y', mora.vowel, 0)
      if (head && tail) {
        expanded.splice(index, 1, head, tail)
        pushUnique(found, seen, joinMorae(expanded), 'youon-expand', target)
      }
    }

    if (mora.kind === 'cv' && mora.vowel) {
      const neighbors = VOWELS.filter((vowel) => Math.abs(VOWELS.indexOf(vowel) - VOWELS.indexOf(mora.vowel as Vowel)) === 1)
      for (const vowel of neighbors) {
        const next = cloneMorae(morae)
        const changed = cvMora(mora.row, vowel, mora.voice)
        if (!changed) continue
        next[index] = changed
        pushUnique(found, seen, joinMorae(next), 'vowel-step', target)
      }
      for (const voice of [0, 1, 2] as Voice[]) {
        if (voice === mora.voice) continue
        const voiced = cvMora(mora.row, mora.vowel, voice)
        if (!voiced) continue
        const next = cloneMorae(morae)
        next[index] = voiced
        pushUnique(found, seen, joinMorae(next), 'voicing', target)
      }
    }

    if (mora.kind === 'youon' && (mora.vowel === 'a' || mora.vowel === 'u' || mora.vowel === 'o')) {
      for (const voice of [0, 1, 2] as Voice[]) {
        if (voice === mora.voice) continue
        const voiced = youonMora(mora.row, mora.vowel, voice)
        if (!voiced) continue
        const next = cloneMorae(morae)
        next[index] = voiced
        pushUnique(found, seen, joinMorae(next), 'voicing', target)
      }
    }
  })

  for (let index = 0; index < morae.length - 1; index += 1) {
    const current = morae[index]
    const next = morae[index + 1]
    if (current.kind === 'cv' && current.vowel === 'i' && next.kind === 'cv' && next.row === 'y') {
      if (next.vowel !== 'a' && next.vowel !== 'u' && next.vowel !== 'o') continue
      const contracted = youonMora(current.row, next.vowel, current.voice)
      if (!contracted) continue
      const copy = cloneMorae(morae)
      copy.splice(index, 2, contracted)
      pushUnique(found, seen, joinMorae(copy), 'youon-contract', target)
    }
  }

  const lengthened = addLongVowel(morae)
  if (lengthened) pushUnique(found, seen, joinMorae(lengthened), 'long-vowel', target)
  const shortened = dropLongVowel(morae)
  if (shortened) pushUnique(found, seen, joinMorae(shortened), 'long-vowel', target)

  morae.forEach((mora, index) => {
    if (mora.kind === 'sokuon') {
      const copy = cloneMorae(morae)
      copy.splice(index, 1)
      pushUnique(found, seen, joinMorae(copy), 'geminate', target)
      return
    }
    if (mora.kind !== 'cv' && mora.kind !== 'youon') return
    const copy = cloneMorae(morae)
    copy.splice(index, 0, { text: 'っ', kind: 'sokuon', row: '', vowel: '', voice: 0 })
    pushUnique(found, seen, joinMorae(copy), 'geminate', target)
  })

  return found
}

function addLongVowel(morae: Mora[]): Mora[] | null {
  const last = morae[morae.length - 1]
  if (!last || (last.kind !== 'cv' && last.kind !== 'youon') || !last.vowel) return null
  const lengthVowel = LENGTH_VOWEL[last.vowel]
  const extra = cvMora('', lengthVowel, 0)
  if (!extra) return null
  return [...cloneMorae(morae), extra]
}

function dropLongVowel(morae: Mora[]): Mora[] | null {
  if (morae.length < 2) return null
  const last = morae[morae.length - 1]
  const prev = morae[morae.length - 2]
  if (last.kind === 'chouon') return morae.slice(0, -1)
  if (last.kind !== 'cv' || last.row !== '' || !prev.vowel) return null
  if (LENGTH_VOWEL[prev.vowel] !== last.vowel) return null
  if (prev.kind !== 'cv' && prev.kind !== 'youon') return null
  return morae.slice(0, -1)
}

function editDistance<T>(left: T[], right: T[], same: (a: T, b: T) => boolean): number {
  const rows = left.length + 1
  const cols = right.length + 1
  const table = Array.from({ length: rows }, () => Array<number>(cols).fill(0))
  for (let row = 0; row < rows; row += 1) table[row][0] = row
  for (let col = 0; col < cols; col += 1) table[0][col] = col
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = same(left[row - 1], right[col - 1]) ? 0 : 1
      table[row][col] = Math.min(table[row - 1][col] + 1, table[row][col - 1] + 1, table[row - 1][col - 1] + cost)
    }
  }
  return table[left.length][right.length]
}

function unitDistance(distance: number, left: number, right: number): number {
  const scale = Math.max(left, right, 1)
  return Math.min(1, distance / scale)
}

/** 发音相似度。拍编辑距离为主，长音、促音、拗音单独计，不用整串字符距离代替。 */
function phoneticSimilarity(left: Mora[], right: Mora[]): number {
  const moraDistance = unitDistance(
    editDistance(left, right, (a, b) => a.text === b.text),
    left.length,
    right.length,
  )
  const vowelDistance = unitDistance(
    editDistance(
      left.map((mora) => mora.vowel),
      right.map((mora) => mora.vowel),
      (a, b) => a === b,
    ),
    left.length,
    right.length,
  )
  const consonantDistance = unitDistance(
    editDistance(
      left.map((mora) => `${mora.row}:${mora.voice}`),
      right.map((mora) => `${mora.row}:${mora.voice}`),
      (a, b) => a === b,
    ),
    left.length,
    right.length,
  )
  const longDistance = longVowelFlag(left) === longVowelFlag(right) ? 0 : 1
  const geminateDistance = left.some((mora) => mora.kind === 'sokuon') === right.some((mora) => mora.kind === 'sokuon') ? 0 : 1
  const specialDistance = youonShape(left) === youonShape(right) ? 0 : 1
  const distance =
    0.25 * moraDistance +
    0.2 * vowelDistance +
    0.2 * consonantDistance +
    0.15 * longDistance +
    0.1 * geminateDistance +
    0.1 * specialDistance
  return 1 - Math.min(1, distance)
}

function longVowelFlag(morae: Mora[]): boolean {
  return morae.some((mora, index) => {
    if (mora.kind === 'chouon') return true
    if (index === 0 || mora.kind !== 'cv' || mora.row !== '') return false
    const prev = morae[index - 1]
    return Boolean(prev.vowel) && LENGTH_VOWEL[prev.vowel as Vowel] === mora.vowel
  })
}

function youonShape(morae: Mora[]): string {
  return morae.map((mora) => (mora.kind === 'youon' ? mora.vowel : '-')).join('')
}

/** 假名结构相似度。和发音分一起用，避免只看差了几个字。 */
function kanaStructureSimilarity(left: Mora[], right: Mora[]): number {
  const leftText = [...joinMorae(left)]
  const rightText = [...joinMorae(right)]
  const edit = unitDistance(
    editDistance(leftText, rightText, (a, b) => a === b),
    leftText.length,
    rightText.length,
  )
  const limit = Math.max(leftText.length, rightText.length, 1)
  let samePlace = 0
  for (let index = 0; index < Math.min(leftText.length, rightText.length); index += 1) {
    if (leftText[index] === rightText[index]) samePlace += 1
  }
  const position = samePlace / limit
  const length = 1 - Math.min(1, Math.abs(leftText.length - rightText.length) / limit)
  const moraStructure = 1 - unitDistance(editDistance(left, right, (a, b) => a.kind === b.kind && a.vowel === b.vowel), left.length, right.length)
  const special = youonShape(left) === youonShape(right) && longVowelFlag(left) === longVowelFlag(right) ? 1 : 0.4
  return 0.3 * (1 - edit) + 0.25 * position + 0.2 * length + 0.15 * moraStructure + 0.1 * special
}

function confusionScore(target: string, candidate: string): number {
  const left = parseMorae(target)
  const right = parseMorae(candidate)
  const phonetic = phoneticSimilarity(left, right)
  const structure = kanaStructureSimilarity(left, right)
  return 0.615 * phonetic + 0.385 * structure
}

function ruleDiversity(rules: ConfusionRule[]): number {
  return new Set(rules).size / rules.length
}

function bestCombo(pool: Candidate[]): Candidate[] | null {
  if (pool.length < 3) return null
  let best: Candidate[] | null = null
  let bestScore = -1
  const limit = Math.min(pool.length, 12)
  const ranked = [...pool].sort((a, b) => b.score - a.score).slice(0, limit)
  for (let i = 0; i < ranked.length; i += 1) {
    for (let j = i + 1; j < ranked.length; j += 1) {
      for (let k = j + 1; k < ranked.length; k += 1) {
        const group = [ranked[i], ranked[j], ranked[k]]
        if (new Set(group.map((item) => item.rule)).size < 2) continue
        const average = group.reduce((sum, item) => sum + item.score, 0) / 3
        const diversity = ruleDiversity(group.map((item) => item.rule))
        const inBand = group.filter((item) => item.score >= 0.72 && item.score <= 0.9).length / 3
        const score = 0.45 * average + 0.2 * diversity + 0.15 * inBand
        if (score > bestScore) {
          bestScore = score
          best = group
        }
      }
    }
  }
  return best
}

function fillFrom(target: string, have: Candidate[]): Candidate[] {
  const selected = [...have]
  const seen = new Set(selected.map((item) => item.kana))
  const seeds = [target, ...selected.map((item) => item.kana)]
  for (const seed of seeds) {
    for (const candidate of mutate(seed)) {
      if (candidate.kana === target || seen.has(candidate.kana)) continue
      const scored = { ...candidate, score: confusionScore(target, candidate.kana) }
      if (scored.score < 0.3) continue
      selected.push(scored)
      seen.add(scored.kana)
      if (selected.length >= 3) return selected.slice(0, 3)
    }
  }
  return selected
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    const current = copy[index]
    copy[index] = copy[swap]
    copy[swap] = current
  }
  return copy
}

/**
 * 给一个假名配三个读音相近的干扰项，打乱后连同正确答案一起返回。
 * 干扰项可以不是词库里的词。读音切不出拍时返回空数组。
 *
 * @param reading 正确假名
 * @param random 选项顺序用的随机数，测试里传入可复现
 */
export function buildKanaChoices(reading: string, random: () => number = Math.random): KanaOption[] {
  const hiragana = joinMorae(parseMorae(reading))
  if (!hiragana) return []
  const pool = mutate(hiragana)
  let chosen: Candidate[] | null = null
  for (const floor of SCORE_FLOORS) {
    chosen = bestCombo(pool.filter((item) => item.score >= floor))
    if (chosen) break
  }
  if (!chosen) chosen = fillFrom(hiragana, pool.filter((item) => item.score >= 0.3)).slice(0, 3)
  if (chosen.length < 3) return []
  const script = usesKatakana(reading) ? toKatakana : (value: string) => value
  const options: KanaOption[] = [
    { kana: script(hiragana), correct: true, rule: null, score: 1 },
    ...chosen.map((item) => ({
      kana: script(item.kana),
      correct: false,
      rule: item.rule,
      score: item.score,
    })),
  ]
  return shuffle(options, random)
}
