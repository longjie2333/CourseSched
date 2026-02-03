/**
 * 按学期分类成绩数组
 * @param arr 原成绩数组
 * @returns {*[]}
 */
export const groupBySemester = (arr) => {
    const result = [];

    arr.forEach(item => {
        const sem = parseInt(item.semester, 10);

        if (isNaN(sem) || sem < 1) {
            console.warn('Invalid semester value:', item.semester, item);
            return;
        }


        const index = sem - 1;

        if (!Array.isArray(result[index])) {
            result[index] = [];
        }

        result[index].push(item);
    });

    return result;
}

/**
 * 对分类好的成绩数组进行排序
 * @param grouped
 * @returns {*}
 */
export const sortGroupedByNum = (grouped) => {
    grouped.forEach((semesterArr, i) => {
        if (Array.isArray(semesterArr)) {
            semesterArr.sort((a, b) => {
                const na = Number(a.num)
                const nb = Number(b.num)

                if (Number.isNaN(na)) return 1;
                if (Number.isNaN(nb)) return -1;

                return na - nb
            })
        }
    })

    return grouped
}