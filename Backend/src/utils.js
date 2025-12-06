const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const expandRange = (s, e) => {
    if (/^\d+$/.test(s) && /^\d+$/.test(e)) {
        const a = Number(s), b = Number(e);
        const out = [];
        for (let x = a; x <= b; x++) out.push(String(x).padStart(s.length, '0'));
        return out;
    }
    if (s.includes(',')) return s.split(',').map((r) => r.trim());
    return [s];
};

function randomDobBetweenYears(startYear = 2004, endYear = 2005) {
    const start = new Date(startYear, 0, 1).getTime();
    const end = new Date(endYear, 11, 31).getTime();
    const rnd = start + Math.floor(Math.random() * (end - start + 1));
    const d = new Date(rnd);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatDob(v) {
    try {
        const d = new Date(v);
        if (isNaN(d.getTime())) return String(v);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    } catch {
        return String(v);
    }
}

function normalizeStudent(roll, sgpaResp, subsResp, detResp, namesMap = {}) {
    const det = detResp ?? {};
    const nameFromDet = det.studentName ?? det.student_name ?? null;
    const sgpa = sgpaResp && (typeof sgpaResp.sgpa !== 'undefined') ? Number(sgpaResp.sgpa) : null;
    const totalGradePoints = typeof sgpaResp?.totalGradePoints !== 'undefined' ? Number(sgpaResp.totalGradePoints) : null;
    const credits = sgpaResp?.cretits ?? null;
    const subjects = Array.isArray(subsResp) ? subsResp : [];
    const name = (namesMap && namesMap[roll]) ? namesMap[roll] : (nameFromDet ?? `Student ${roll}`);
    const dobFromDet = det.dob ?? det.DOB ?? det.dateOfBirth ?? det.date_of_birth ?? det.birthDate ?? det.birthdate ?? null;
    const dob = dobFromDet ? formatDob(dobFromDet) : randomDobBetweenYears(2004, 2005);

    return {
        rollNo: roll,
        name,
        sgpa,
        totalGradePoints,
        credits,
        subjects,
        details: {
            studentName: nameFromDet ?? null,
            batch: det.batch ?? det.maxYear ?? null,
            branchId: det.branchId ?? null,
            branchName: det.branchName ?? null,
            courseName: det.courseName ?? null,
            collegeCode: det.collegeCode ?? null,
            collegeName: det.collegeName ?? null,
            studentPhoto: det.studentPhoto ?? null,
            dob,
            raw: det,
        },
        raw: { sgpaResp, subsResp, detResp },
    };
}

module.exports = {
    sleep,
    expandRange,
    randomDobBetweenYears,
    formatDob,
    normalizeStudent
};