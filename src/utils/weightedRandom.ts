import type { Word } from '@/types/word'

export function wordKey(word: Pick<Word, 'cn' | 'jp'>): string {
  return `${word.cn}-${word.jp}`
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

export function selectRandomWordsWithWeights(
  count: number,
  wordsList: Word[],
  getWeight: (word: Word) => number,
): Word[] {
  const wordsCopy = [...wordsList]
  let totalWeight = 0
  wordsCopy.forEach((word) => {
    totalWeight += getWeight(word)
  })

  const selectedWords: Word[] = []
  const selectedIndices = new Set<number>()

  while (selectedWords.length < count && selectedWords.length < wordsCopy.length) {
    let randomWeight = Math.random() * totalWeight
    for (let i = 0; i < wordsCopy.length; i++) {
      if (selectedIndices.has(i)) continue
      const weight = getWeight(wordsCopy[i])
      randomWeight -= weight
      if (randomWeight <= 0) {
        selectedWords.push(wordsCopy[i])
        selectedIndices.add(i)
        totalWeight -= weight
        break
      }
    }
  }

  if (selectedWords.length < count) {
    const shuffled = shuffleArray(wordsCopy.map((w, i) => ({ w, i })))
    for (const { w, i } of shuffled) {
      if (selectedWords.length >= count) break
      if (!selectedIndices.has(i)) {
        selectedWords.push(w)
        selectedIndices.add(i)
      }
    }
  }

  return shuffleArray(selectedWords)
}
