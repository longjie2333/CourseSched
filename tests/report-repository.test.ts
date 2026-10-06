import { describe, expect, it, vi } from 'vitest'
import { ReportRepository, normalizeScores } from '../src/features/report/report-repository'
import { AppError } from '../src/shared/app-error'

describe('report normalization', () => {
  it('uses explicit semester records instead of sparse arrays', () => {
    const semesters = normalizeScores([
      { semester: '3', num: '2', course_name: 'B' },
      { semester: '1', num: '1', course_name: 'A' },
    ])
    expect(semesters.map((item) => item.semesterNo)).toEqual([1, 3])
    expect(semesters).toHaveLength(2)
  })
})

describe('ReportRepository', () => {
  it('loads independent report sections concurrently', async () => {
    const api = {
      requestData: vi.fn(async (path: string) => {
        if (path.startsWith('info')) return { name: '测试用户', class: '软件 1 班' }
        if (path.startsWith('examscore')) return []
        if (path.startsWith('attendance')) return [{ course_name: '软件工程', late: '1' }]
        return []
      }),
    }
    const repository = new ReportRepository(api as never)
    const report = await repository.load()

    expect(api.requestData).toHaveBeenCalledTimes(4)
    expect(report.profile.status).toBe('ready')
    expect(report.scores.status).toBe('empty')
    expect(report.attendance.status).toBe('ready')
    expect(report.leaves.status).toBe('empty')
  })

  it('does not convert a failed section into an empty success state', async () => {
    const api = {
      requestData: vi.fn(async (path: string) => {
        if (path.startsWith('attendance')) throw new AppError('NETWORK', 'offline')
        return []
      }),
    }
    const report = await new ReportRepository(api as never).load()
    expect(report.attendance.status).toBe('error')
    expect(report.scores.status).toBe('empty')
  })

  it('reloads one section without requesting the others', async () => {
    const api = { requestData: vi.fn().mockResolvedValue([{ semester: 1, course_name: 'A' }]) }
    const repository = new ReportRepository(api as never)

    const scores = await repository.loadScores()

    expect(scores.status).toBe('ready')
    expect(api.requestData).toHaveBeenCalledOnce()
    expect(api.requestData).toHaveBeenCalledWith('examscore?cache', expect.any(Object))
  })
})
