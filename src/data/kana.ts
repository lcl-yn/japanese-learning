export interface KanaCell {
  hiragana: string
  katakana: string
  romaji: string
}

export type KanaColumn = 'a' | 'i' | 'u' | 'e' | 'o'

export type KanaRow = Partial<Record<KanaColumn, KanaCell | null>>

export const kanaColumns: KanaColumn[] = ['a', 'i', 'u', 'e', 'o']

/** 平假名 50 音图，与 legacy kana 数据一致 */
export const hiraganaChart: KanaRow[] = [
  { a: { hiragana: 'あ', katakana: 'ア', romaji: 'a' }, i: { hiragana: 'い', katakana: 'イ', romaji: 'i' }, u: { hiragana: 'う', katakana: 'ウ', romaji: 'u' }, e: { hiragana: 'え', katakana: 'エ', romaji: 'e' }, o: { hiragana: 'お', katakana: 'オ', romaji: 'o' } },
  { a: { hiragana: 'か', katakana: 'カ', romaji: 'ka' }, i: { hiragana: 'き', katakana: 'キ', romaji: 'ki' }, u: { hiragana: 'く', katakana: 'ク', romaji: 'ku' }, e: { hiragana: 'け', katakana: 'ケ', romaji: 'ke' }, o: { hiragana: 'こ', katakana: 'コ', romaji: 'ko' } },
  { a: { hiragana: 'さ', katakana: 'サ', romaji: 'sa' }, i: { hiragana: 'し', katakana: 'シ', romaji: 'shi' }, u: { hiragana: 'す', katakana: 'ス', romaji: 'su' }, e: { hiragana: 'せ', katakana: 'セ', romaji: 'se' }, o: { hiragana: 'そ', katakana: 'ソ', romaji: 'so' } },
  { a: { hiragana: 'た', katakana: 'タ', romaji: 'ta' }, i: { hiragana: 'ち', katakana: 'チ', romaji: 'chi' }, u: { hiragana: 'つ', katakana: 'ツ', romaji: 'tsu' }, e: { hiragana: 'て', katakana: 'テ', romaji: 'te' }, o: { hiragana: 'と', katakana: 'ト', romaji: 'to' } },
  { a: { hiragana: 'な', katakana: 'ナ', romaji: 'na' }, i: { hiragana: 'に', katakana: 'ニ', romaji: 'ni' }, u: { hiragana: 'ぬ', katakana: 'ヌ', romaji: 'nu' }, e: { hiragana: 'ね', katakana: 'ネ', romaji: 'ne' }, o: { hiragana: 'の', katakana: 'ノ', romaji: 'no' } },
  { a: { hiragana: 'は', katakana: 'ハ', romaji: 'ha' }, i: { hiragana: 'ひ', katakana: 'ヒ', romaji: 'hi' }, u: { hiragana: 'ふ', katakana: 'フ', romaji: 'fu' }, e: { hiragana: 'へ', katakana: 'ヘ', romaji: 'he' }, o: { hiragana: 'ほ', katakana: 'ホ', romaji: 'ho' } },
  { a: { hiragana: 'ま', katakana: 'マ', romaji: 'ma' }, i: { hiragana: 'み', katakana: 'ミ', romaji: 'mi' }, u: { hiragana: 'む', katakana: 'ム', romaji: 'mu' }, e: { hiragana: 'め', katakana: 'メ', romaji: 'me' }, o: { hiragana: 'も', katakana: 'モ', romaji: 'mo' } },
  { a: { hiragana: 'や', katakana: 'ヤ', romaji: 'ya' }, i: null, u: { hiragana: 'ゆ', katakana: 'ユ', romaji: 'yu' }, e: null, o: { hiragana: 'よ', katakana: 'ヨ', romaji: 'yo' } },
  { a: { hiragana: 'ら', katakana: 'ラ', romaji: 'ra' }, i: { hiragana: 'り', katakana: 'リ', romaji: 'ri' }, u: { hiragana: 'る', katakana: 'ル', romaji: 'ru' }, e: { hiragana: 'れ', katakana: 'レ', romaji: 're' }, o: { hiragana: 'ろ', katakana: 'ロ', romaji: 'ro' } },
  { a: { hiragana: 'わ', katakana: 'ワ', romaji: 'wa' }, i: null, u: null, e: null, o: { hiragana: 'を', katakana: 'ヲ', romaji: 'wo' } },
  { a: { hiragana: 'ん', katakana: 'ン', romaji: 'n' }, i: null, u: null, e: null, o: null },
]

/** 拗音，列位与 legacy youonChart 一致（きゅ 等落在 i 列） */
export const youonChart: KanaRow[] = [
  { a: { hiragana: 'きゃ', katakana: 'キャ', romaji: 'kya' }, i: { hiragana: 'きゅ', katakana: 'キュ', romaji: 'kyu' }, u: null, e: null, o: { hiragana: 'きょ', katakana: 'キョ', romaji: 'kyo' } },
  { a: { hiragana: 'しゃ', katakana: 'シャ', romaji: 'sha' }, i: { hiragana: 'しゅ', katakana: 'シュ', romaji: 'shu' }, u: null, e: null, o: { hiragana: 'しょ', katakana: 'ショ', romaji: 'sho' } },
  { a: { hiragana: 'ちゃ', katakana: 'チャ', romaji: 'cha' }, i: { hiragana: 'ちゅ', katakana: 'チュ', romaji: 'chu' }, u: null, e: null, o: { hiragana: 'ちょ', katakana: 'チョ', romaji: 'cho' } },
  { a: { hiragana: 'にゃ', katakana: 'ニャ', romaji: 'nya' }, i: { hiragana: 'にゅ', katakana: 'ニュ', romaji: 'nyu' }, u: null, e: null, o: { hiragana: 'にょ', katakana: 'ニョ', romaji: 'nyo' } },
  { a: { hiragana: 'ひゃ', katakana: 'ヒャ', romaji: 'hya' }, i: { hiragana: 'ひゅ', katakana: 'ヒュ', romaji: 'hyu' }, u: null, e: null, o: { hiragana: 'ひょ', katakana: 'ヒョ', romaji: 'hyo' } },
  { a: { hiragana: 'みゃ', katakana: 'ミャ', romaji: 'mya' }, i: { hiragana: 'みゅ', katakana: 'ミュ', romaji: 'myu' }, u: null, e: null, o: { hiragana: 'みょ', katakana: 'ミョ', romaji: 'myo' } },
  { a: { hiragana: 'りゃ', katakana: 'リャ', romaji: 'rya' }, i: { hiragana: 'りゅ', katakana: 'リュ', romaji: 'ryu' }, u: null, e: null, o: { hiragana: 'りょ', katakana: 'リョ', romaji: 'ryo' } },
]

/** 浊音 / 半浊音 */
export const dakuonChart: KanaRow[] = [
  { a: { hiragana: 'が', katakana: 'ガ', romaji: 'ga' }, i: { hiragana: 'ぎ', katakana: 'ギ', romaji: 'gi' }, u: { hiragana: 'ぐ', katakana: 'グ', romaji: 'gu' }, e: { hiragana: 'げ', katakana: 'ゲ', romaji: 'ge' }, o: { hiragana: 'ご', katakana: 'ゴ', romaji: 'go' } },
  { a: { hiragana: 'ざ', katakana: 'ザ', romaji: 'za' }, i: { hiragana: 'じ', katakana: 'ジ', romaji: 'ji' }, u: { hiragana: 'ず', katakana: 'ズ', romaji: 'zu' }, e: { hiragana: 'ぜ', katakana: 'ゼ', romaji: 'ze' }, o: { hiragana: 'ぞ', katakana: 'ゾ', romaji: 'zo' } },
  { a: { hiragana: 'だ', katakana: 'ダ', romaji: 'da' }, i: { hiragana: 'ぢ', katakana: 'ヂ', romaji: 'ji' }, u: { hiragana: 'づ', katakana: 'ヅ', romaji: 'zu' }, e: { hiragana: 'で', katakana: 'デ', romaji: 'de' }, o: { hiragana: 'ど', katakana: 'ド', romaji: 'do' } },
  { a: { hiragana: 'ば', katakana: 'バ', romaji: 'ba' }, i: { hiragana: 'び', katakana: 'ビ', romaji: 'bi' }, u: { hiragana: 'ぶ', katakana: 'ブ', romaji: 'bu' }, e: { hiragana: 'べ', katakana: 'ベ', romaji: 'be' }, o: { hiragana: 'ぼ', katakana: 'ボ', romaji: 'bo' } },
  { a: { hiragana: 'ぱ', katakana: 'パ', romaji: 'pa' }, i: { hiragana: 'ぴ', katakana: 'ピ', romaji: 'pi' }, u: { hiragana: 'ぷ', katakana: 'プ', romaji: 'pu' }, e: { hiragana: 'ぺ', katakana: 'ペ', romaji: 'pe' }, o: { hiragana: 'ぽ', katakana: 'ポ', romaji: 'po' } },
]
