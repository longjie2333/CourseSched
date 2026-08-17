/**
 * 按学期分组并返回 [{ semester, scores }] 模型
 * @param scores 原始成绩数组
 * @returns {Array<{semester: number, scores: *[]}>}
 */
export const groupExamScores = (scores) => {
  const grouped = []

  scores.forEach(score => {
    const semester = parseInt(score.semester, 10)

    if (semester < 1) {
      return
    }

    const index = semester - 1
    const semesterScores = grouped[index] || []
    semesterScores.push(score)
    grouped[index] = semesterScores
  })

  return Array.from({ length: grouped.length }, (_, index) => ({
    semester: index + 1,
    scores: [...(grouped[index] || [])].sort((a, b) => {
      const na = Number(a.num)
      const nb = Number(b.num)

      if (Number.isNaN(na)) return 1
      if (Number.isNaN(nb)) return -1

      return na - nb
    })
  }))
}
