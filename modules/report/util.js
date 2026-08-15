/**
 * 校验并计算当前学生的 1 基学期序号
 * @param {string} semester 当前校历学期，如 2026/2027(1)
 * @param {string} grade 入学年份，如 "2024级"，取前 4 位为年份
 * @returns {number}
 */
export const getCurrentSemesterNumber = (semester, grade) => {
  const matched = /^(\d{4})\/(\d{4})\(([12])\)$/.exec(semester)
  const gradeYear = Number(String(grade).slice(0, 4))

  if (
    !matched ||
    !Number.isInteger(gradeYear) ||
    gradeYear < 1000 ||
    gradeYear > 9999 ||
    Number(matched[2]) !== Number(matched[1]) + 1
  ) {
    throw new AppError(AppErrorCode.INVALID_DATA, '学期信息格式无效')
  }

  const academicYear = Number(matched[1])
  const term = Number(matched[3])

  if (academicYear < gradeYear) {
    throw new AppError(AppErrorCode.INVALID_DATA, '学期信息格式无效')
  }

  return (academicYear - gradeYear) * 2 + term
}

/**
 * 按学期分组并补齐到当前学期，返回 [{ semester, scores }] 模型
 * @param scores 原始成绩数组
 * @param currentSemesterNumber 当前学生学期序号
 * @returns {Array<{semester: number, scores: *[]}>}
 */
export const groupExamScores = (scores, currentSemesterNumber) => {
  const grouped = []

  scores.forEach(score => {
    const semester = parseInt(score.semester, 10)

    if (Number.isNaN(semester) || semester < 1) {
      return
    }

    if (semester > currentSemesterNumber) {
      throw new AppError(AppErrorCode.INVALID_DATA, '成绩数据超出当前学期范围')
    }

    const index = semester - 1
    const semesterScores = grouped[index] || []
    semesterScores.push(score)
    grouped[index] = semesterScores
  })

  return Array.from({ length: currentSemesterNumber }, (_, index) => ({
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
