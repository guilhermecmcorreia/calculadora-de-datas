/**
 * PROFISSIONAL DATE CALCULATOR - CORE LOGIC V2
 * 100% Frontend - Zero Network - Gregorian Calendar
 */

// --- NETWORK KILL-SWITCH ---
(function() {
    const disableNetwork = () => { throw new Error("Network disabled by design"); };
    window.fetch = disableNetwork;
    window.XMLHttpRequest = disableNetwork;
    if (window.WebSocket) window.WebSocket = disableNetwork;
    if (window.EventSource) window.EventSource = disableNetwork;
    console.log("Security: Network disabled.");
})();

// --- CORE DATE HELPERS ---

function isLeapYear(y) {
    return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

function daysInMonth(y, m) {
    const days = [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return days[m - 1];
}

function parseDMY(str) {
    if (!str) return null;
    // Allow /, -, ., or space as separators
    const parts = str.split(/[\/\-\.\s]+/);
    if (parts.length !== 3) return null;
    
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const yStr = parts[2].trim();
    const y = parseInt(yStr, 10);
    
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    // Year must be exactly 4 digits to be considered complete
    if (yStr.length !== 4) return null;
    
    return { d, m, y };
}

function formatDMY(dateObj) {
    const d = String(dateObj.d).padStart(2, '0');
    const m = String(dateObj.m).padStart(2, '0');
    const y = String(dateObj.y).padStart(4, '0');
    return `${d}/${m}/${y}`;
}

function compareDates(a, b) {
    if (a.y !== b.y) return a.y - b.y;
    if (a.m !== b.m) return a.m - b.m;
    return a.d - b.d;
}

function isValidDate(d, m, y) {
    if (y < 1 || y > 9999) return false;
    if (m < 1 || m > 12) return false;
    const maxDays = daysInMonth(y, m);
    return d >= 1 && d <= maxDays;
}

// --- CALCULATION LOGIC ---

function calculateDifference(start, end, audit = false) {
    let logs = [];
    if (compareDates(start, end) > 0) return { error: "Data final deve ser posterior ou igual à inicial." };

    let years = end.y - start.y;
    let candidate = { d: start.d, m: start.m, y: start.y + years };

    if (candidate.d > daysInMonth(candidate.y, candidate.m)) {
        candidate.d = daysInMonth(candidate.y, candidate.m);
        if (audit) logs.push(`Ajuste clamp ano: ${candidate.d}/${candidate.m}/${candidate.y}`);
    }

    if (compareDates(candidate, end) > 0) {
        years--;
        candidate = { d: start.d, m: start.m, y: start.y + years };
        if (candidate.d > daysInMonth(candidate.y, candidate.m)) {
            candidate.d = daysInMonth(candidate.y, candidate.m);
        }
    }

    let months = 0;
    while (true) {
        let nextM = candidate.m + 1;
        let nextY = candidate.y;
        if (nextM > 12) {
            nextM = 1;
            nextY++;
        }
        
        let nextCandidate = { d: start.d, m: nextM, y: nextY };
        const maxD = daysInMonth(nextCandidate.y, nextCandidate.m);
        if (nextCandidate.d > maxD) nextCandidate.d = maxD;

        if (compareDates(nextCandidate, end) <= 0) {
            candidate = nextCandidate;
            months++;
        } else {
            break;
        }
    }

    let days = 0;
    let temp = { ...candidate };
    while (compareDates(temp, end) < 0) {
        temp.d++;
        if (temp.d > daysInMonth(temp.y, temp.m)) {
            temp.d = 1;
            temp.m++;
            if (temp.m > 12) {
                temp.m = 1;
                temp.y++;
            }
        }
        days++;
    }

    const totalDays = calculateTotalDaysInclusive(start, end);
    return { years, months, days, totalDays, logs };
}

function calculateTotalDaysInclusive(start, end) {
    if (compareDates(start, end) === 0) return 1;
    let count = 1;
    let curr = { ...start };
    while (compareDates(curr, end) < 0) {
        curr.d++;
        if (curr.d > daysInMonth(curr.y, curr.m)) {
            curr.d = 1;
            curr.m++;
            if (curr.m > 12) {
                curr.m = 1;
                curr.y++;
            }
        }
        count++;
    }
    return count;
}

function addPeriod(base, years, months, days, audit = false) {
    let logs = [];
    let res = { d: base.d, m: base.m, y: base.y + years };
    if (audit) logs.push(`Após anos: ${formatDMY(res)}`);

    res.m += months;
    while (res.m > 12) {
        res.m -= 12;
        res.y++;
    }
    
    const maxD = daysInMonth(res.y, res.m);
    if (res.d > maxD) {
        if (audit) logs.push(`Clamp aplicado: de ${res.d} para ${maxD}`);
        res.d = maxD;
    }
    if (audit) logs.push(`Após meses: ${formatDMY(res)}`);

    for (let i = 0; i < days; i++) {
        res.d++;
        if (res.d > daysInMonth(res.y, res.m)) {
            res.d = 1;
            res.m++;
            if (res.m > 12) {
                res.m = 1;
                res.y++;
            }
        }
    }
    if (audit) logs.push(`Após dias: ${formatDMY(res)}`);

    return { date: res, logs };
}

// --- SELF TESTS ---
function runSelfTests() {
    console.group("Running Self-Tests (Official Civilian Clamp Rule V2)...");
    
    // Test 1: Leap Year
    console.assert(isLeapYear(2000) === true, "2000 is leap");
    console.assert(isLeapYear(2100) === false, "2100 is NOT leap");
    console.assert(isLeapYear(2024) === true, "2024 is leap");

    // Test 2: Official Clamp Rule 29/02/2020 -> 28/02/2021 (1 ano, 0 meses, 0 dias)
    const d1_start = { d: 29, m: 2, y: 2020 };
    const d1_end = { d: 28, m: 2, y: 2021 };
    const diff1 = calculateDifference(d1_start, d1_end);
    console.log("Test 29/02 result:", diff1);
    console.assert(diff1.years === 1 && diff1.months === 0 && diff1.days === 0, 
        "FAIL Official Rule: 29/02/2020 -> 28/02/2021 should be 1 year", diff1);

    // Test 3: 31/01/2021 -> 28/02/2021
    const d2_start = { d: 31, m: 1, y: 2021 };
    const d2_end = { d: 28, m: 2, y: 2021 };
    const diff2 = calculateDifference(d2_start, d2_end);
    console.assert(diff2.years === 0 && diff2.months === 1 && diff2.days === 0, 
        "FAIL: 31/01/2021 -> 28/02/2021 should be 1 month", diff2);

    // Test 4: Same day
    const same_day = { d: 15, m: 5, y: 2023 };
    const diff_same = calculateDifference(same_day, same_day);
    console.assert(diff_same.years === 0 && diff_same.months === 0 && diff_same.days === 0, "Same day diff FAIL");
    console.assert(calculateTotalDaysInclusive(same_day, same_day) === 1, "Same day inclusive FAIL");

    console.groupEnd();
    return "Tests V2 completed.";
}

// Export for window
window.DateCalc = {
    isLeapYear, daysInMonth, parseDMY, formatDMY, compareDates, isValidDate, calculateDifference, addPeriod, runSelfTests
};

// --- UI INTERACTION LOGIC ---

document.addEventListener('DOMContentLoaded', () => {
    const auditToggle = document.getElementById('auditModeToggle');
    const auditSection = document.getElementById('auditSection');
    const auditLogs = document.getElementById('auditLogs');

    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    const btnCalcDiff = document.getElementById('btnCalcDiff');
    const resultBoxA = document.getElementById('resultA');
    const outYears = document.getElementById('outYears');
    const outMonths = document.getElementById('outMonths');
    const outDays = document.getElementById('outDays');
    const outTotalDays = document.getElementById('outTotalDays');
    const btnCopyPeriod = document.getElementById('btnCopyPeriod');

    const baseDateInput = document.getElementById('baseDate');
    const addYearsInput = document.getElementById('addYears');
    const addMonthsInput = document.getElementById('addMonths');
    const addDaysInput = document.getElementById('addDays');
    const btnCalcAdd = document.getElementById('btnCalcAdd');
    const resultBoxB = document.getElementById('resultB');
    const outNewDate = document.getElementById('outNewDate');

    function logToAudit(message) {
        if (!auditToggle.checked) return;
        const div = document.createElement('div');
        div.className = 'audit-log-item';
        div.innerText = message;
        auditLogs.appendChild(div);
    }

    function clearAudit() {
        auditLogs.innerHTML = '';
    }

    function applyMask(input) {
        // Allow digits and separators: /, -, ., space
        let value = input.value.replace(/[^\d\/\-\.\s]/g, '');
        input.value = value;
    }

    function validateDateInput(input, errorId, isBlur = false) {
        const value = input.value.trim();
        const errSpan = document.getElementById(errorId);
        errSpan.innerText = '';
        
        if (value.length === 0) return false;

        // Try to split to check parts
        const parts = value.split(/[\/\-\.\s]+/);
        
        // If not enough parts or year is not 4 digits, it's incomplete
        if (parts.length < 3 || (parts[2] && parts[2].length < 4)) {
            errSpan.innerText = 'Formato incompleto';
            return false;
        }

        const date = parseDMY(value);
        if (!date || !isValidDate(date.d, date.m, date.y)) {
            errSpan.innerText = 'Data inválida';
            return false;
        }

        // If it's a blur event and valid, normalize format
        if (isBlur) {
            input.value = formatDMY(date);
        }

        return true;
    }

    function validateNumericInput(input, errorId, min, max) {
        const valStr = input.value.trim();
        const errSpan = document.getElementById(errorId);
        errSpan.innerText = '';
        if (valStr === '') {
            errSpan.innerText = 'Obrigatório';
            return false;
        }
        const val = Number(valStr);
        if (isNaN(val) || !Number.isInteger(val)) {
            errSpan.innerText = 'Inválido';
            return false;
        }
        if (val < min) {
            errSpan.innerText = 'Mínimo ' + min;
            return false;
        }
        if (val > max) {
            errSpan.innerText = 'Máximo ' + max;
            return false;
        }
        return true;
    }

    function checkModuleA() {
        const v1 = validateDateInput(startInput, 'err-startDate');
        const v2 = validateDateInput(endInput, 'err-endDate');
        if (v1 && v2) {
            const d1 = parseDMY(startInput.value);
            const d2 = parseDMY(endInput.value);
            if (compareDates(d1, d2) > 0) {
                document.getElementById('err-endDate').innerText = 'Data final < inicial';
                btnCalcDiff.disabled = true;
            } else {
                btnCalcDiff.disabled = false;
            }
        } else {
            btnCalcDiff.disabled = true;
        }
    }

    function checkModuleB() {
        const vBase = validateDateInput(baseDateInput, 'err-baseDate');
        const vY = validateNumericInput(addYearsInput, 'err-addYears', 0, 9999);
        const vM = validateNumericInput(addMonthsInput, 'err-addMonths', 0, 11);
        const vD = validateNumericInput(addDaysInput, 'err-addDays', 0, 31);
        btnCalcAdd.disabled = !(vBase && vY && vM && vD);
    }

    [startInput, endInput, baseDateInput].forEach(inp => {
        inp.addEventListener('input', (e) => {
            applyMask(e.target);
            if (inp === baseDateInput) checkModuleB(); else checkModuleA();
        });

        // Normalize on blur
        inp.addEventListener('blur', (e) => {
            const errorId = inp.id === 'startDate' ? 'err-startDate' : 
                          inp.id === 'endDate' ? 'err-endDate' : 'err-baseDate';
            validateDateInput(inp, errorId, true);
            if (inp === baseDateInput) checkModuleB(); else checkModuleA();
        });
    });

    [addYearsInput, addMonthsInput, addDaysInput].forEach(inp => {
        inp.addEventListener('input', () => checkModuleB());
    });

    auditToggle.addEventListener('change', () => {
        auditSection.style.display = auditToggle.checked ? 'block' : 'none';
        if (!auditToggle.checked) clearAudit();
    });

    btnCalcDiff.addEventListener('click', () => {
        clearAudit();
        const start = parseDMY(startInput.value);
        const end = parseDMY(endInput.value);
        const res = calculateDifference(start, end, auditToggle.checked);
        if (res.error) { alert(res.error); return; }
        res.logs.forEach(l => logToAudit(l));
        outYears.innerText = res.years;
        outMonths.innerText = res.months;
        outDays.innerText = res.days;
        outTotalDays.innerText = res.totalDays;
        resultBoxA.style.display = 'block';
    });

    btnCalcAdd.addEventListener('click', () => {
        clearAudit();
        const base = parseDMY(baseDateInput.value);
        const y = parseInt(addYearsInput.value);
        const m = parseInt(addMonthsInput.value);
        const d = parseInt(addDaysInput.value);
        if (m > 11 || d > 31 || y < 0 || m < 0 || d < 0 || isNaN(y) || isNaN(m) || isNaN(d)) {
            alert("Valores inválidos.");
            return;
        }
        const res = addPeriod(base, y, m, d, auditToggle.checked);
        res.logs.forEach(l => logToAudit(l));
        outNewDate.innerText = formatDMY(res.date);
        resultBoxB.style.display = 'block';
    });

    btnCopyPeriod.addEventListener('click', () => {
        addYearsInput.value = outYears.innerText;
        addMonthsInput.value = outMonths.innerText;
        addDaysInput.value = outDays.innerText;
        ['err-addYears', 'err-addMonths', 'err-addDays'].forEach(id => document.getElementById(id).innerText = '');
        checkModuleB();
        document.getElementById('moduleB').scrollIntoView({ behavior: 'smooth' });
    });
});
