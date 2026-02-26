/**
 * PROFISSIONAL DATE CALCULATOR - CORE LOGIC
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
    const parts = String(str).split(/[\/\-\.\s]+/);
    if (parts.length !== 3) return null;
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const yStr = parts[2].trim();
    const y = parseInt(yStr, 10);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
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
        if (nextM > 12) { nextM = 1; nextY++; }
        let nextCandidate = { d: start.d, m: nextM, y: nextY };
        const maxD = daysInMonth(nextCandidate.y, nextCandidate.m);
        if (nextCandidate.d > maxD) nextCandidate.d = maxD;
        if (compareDates(nextCandidate, end) <= 0) {
            candidate = nextCandidate;
            months++;
        } else { break; }
    }
    let days = 0;
    let temp = { ...candidate };
    while (compareDates(temp, end) < 0) {
        temp.d++;
        if (temp.d > daysInMonth(temp.y, temp.m)) {
            temp.d = 1; temp.m++;
            if (temp.m > 12) { temp.m = 1; temp.y++; }
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
            curr.d = 1; curr.m++;
            if (curr.m > 12) { curr.m = 1; curr.y++; }
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
    while (res.m > 12) { res.m -= 12; res.y++; }
    const maxD = daysInMonth(res.y, res.m);
    if (res.d > maxD) {
        if (audit) logs.push(`Clamp aplicado: de ${res.d} para ${maxD}`);
        res.d = maxD;
    }
    if (audit) logs.push(`Após meses: ${formatDMY(res)}`);
    for (let i = 0; i < days; i++) {
        res.d++;
        if (res.d > daysInMonth(res.y, res.m)) {
            res.d = 1; res.m++;
            if (res.m > 12) { res.m = 1; res.y++; }
        }
    }
    if (audit) logs.push(`Após dias: ${formatDMY(res)}`);
    return { date: res, logs };
}

// --- SELF TESTS ---
function runSelfTests() {
    console.group("Running Self-Tests (Official Civilian Clamp Rule - Final)...");
    const d1_start = { d: 29, m: 2, y: 2020 };
    const d1_end = { d: 28, m: 2, y: 2021 };
    const diff1 = calculateDifference(d1_start, d1_end);
    console.assert(diff1.years === 1 && diff1.months === 0 && diff1.days === 0, "FAIL 29/02 Rule", diff1);
    const d2_start = { d: 31, m: 1, y: 2021 };
    const d2_end = { d: 28, m: 2, y: 2021 };
    const diff2 = calculateDifference(d2_start, d2_end);
    console.assert(diff2.years === 0 && diff2.months === 1 && diff2.days === 0, "FAIL Month Transition", diff2);
    console.groupEnd();
    return "Tests completed.";
}

// Export for window
window.DateCalc = { isLeapYear, daysInMonth, parseDMY, formatDMY, compareDates, isValidDate, calculateDifference, addPeriod, runSelfTests };

// --- UI INTERACTION LOGIC ---

function initApp() {
    const el = (id) => document.getElementById(id);
    const auditToggle = el('auditModeToggle');
    const auditSection = el('auditSection');
    const auditLogs = el('auditLogs');
    const startInput = el('startDate');
    const endInput = el('endDate');
    const btnCalcDiff = el('btnCalcDiff');
    const resultBoxA = el('resultA');
    const baseDateInput = el('baseDate');
    const addYearsInput = el('addYears');
    const addMonthsInput = el('addMonths');
    const addDaysInput = el('addDays');
    const btnCalcAdd = el('btnCalcAdd');
    const resultBoxB = el('resultB');
    const btnCopyPeriod = el('btnCopyPeriod');

    if (!startInput || !endInput || !baseDateInput) return;

    function applyMask(input) {
        input.value = input.value.replace(/[^\d\/\-\.\s]/g, '');
    }

    function validateDateInput(input, errorId, isBlur = false) {
        const val = input.value.trim();
        const errSpan = el(errorId);
        if (errSpan) errSpan.innerText = '';
        if (!val) return false;

        // Split and filter out empty strings from trailing separators
        const parts = val.split(/[\/\-\.\s]+/).filter(p => p.length > 0);
        
        // If we don't have 3 full parts, and the last part isn't a 4-digit year, it's incomplete
        if (parts.length < 3 || parts[2].length < 4) {
            if (errSpan) errSpan.innerText = 'Formato incompleto';
            return false;
        }
        const date = parseDMY(val);
        if (!date || !isValidDate(date.d, date.m, date.y)) {
            if (errSpan) errSpan.innerText = 'Data inválida';
            return false;
        }
        if (isBlur) input.value = formatDMY(date);
        return true;
    }

    function validateNumericInput(input, errorId, min, max) {
        const valStr = input.value.trim();
        const errSpan = el(errorId);
        if (errSpan) errSpan.innerText = '';
        if (valStr === '') { if (errSpan) errSpan.innerText = 'Obrigatório'; return false; }
        const val = Number(valStr);
        if (isNaN(val) || !Number.isInteger(val)) { if (errSpan) errSpan.innerText = 'Inválido'; return false; }
        if (val < min) { if (errSpan) errSpan.innerText = 'Mínimo ' + min; return false; }
        if (val > max) { if (errSpan) errSpan.innerText = 'Máximo ' + max; return false; }
        return true;
    }

    function checkModuleA() {
        const v1 = validateDateInput(startInput, 'err-startDate');
        const v2 = validateDateInput(endInput, 'err-endDate');
        if (v1 && v2) {
            const d1 = parseDMY(startInput.value);
            const d2 = parseDMY(endInput.value);
            if (d1 && d2 && compareDates(d1, d2) > 0) {
                const e = el('err-endDate'); if (e) e.innerText = 'Data final < inicial';
                btnCalcDiff.disabled = true;
            } else { btnCalcDiff.disabled = false; }
        } else { btnCalcDiff.disabled = true; }
    }

    function checkModuleB() {
        const vB = validateDateInput(baseDateInput, 'err-baseDate');
        const vY = validateNumericInput(addYearsInput, 'err-addYears', 0, 9999);
        const vM = validateNumericInput(addMonthsInput, 'err-addMonths', 0, 11);
        const vD = validateNumericInput(addDaysInput, 'err-addDays', 0, 31);
        btnCalcAdd.disabled = !(vB && vY && vM && vD);
    }

    [startInput, endInput, baseDateInput].forEach(inp => {
        inp.addEventListener('input', (e) => { applyMask(e.target); if (inp === baseDateInput) checkModuleB(); else checkModuleA(); });
        inp.addEventListener('blur', () => { validateDateInput(inp, 'err-' + inp.id, true); if (inp === baseDateInput) checkModuleB(); else checkModuleA(); });
    });

    [addYearsInput, addMonthsInput, addDaysInput].forEach(inp => { inp.addEventListener('input', checkModuleB); });

    if (auditToggle) {
        auditToggle.addEventListener('change', () => {
            auditSection.style.display = auditToggle.checked ? 'block' : 'none';
            if (!auditToggle.checked && auditLogs) auditLogs.innerHTML = '';
        });
    }

    btnCalcDiff.addEventListener('click', () => {
        if (auditLogs) auditLogs.innerHTML = '';
        const res = calculateDifference(parseDMY(startInput.value), parseDMY(endInput.value), auditToggle.checked);
        if (res.error) { alert(res.error); return; }
        if (auditToggle.checked) res.logs.forEach(l => { const d = document.createElement('div'); d.className = 'audit-log-item'; d.innerText = l; auditLogs.appendChild(d); });
        el('outYears').innerText = res.years; el('outMonths').innerText = res.months; el('outDays').innerText = res.days; el('outTotalDays').innerText = res.totalDays;
        resultBoxA.style.display = 'block';
    });

    btnCalcAdd.addEventListener('click', () => {
        if (auditLogs) auditLogs.innerHTML = '';
        const res = addPeriod(parseDMY(baseDateInput.value), parseInt(addYearsInput.value), parseInt(addMonthsInput.value), parseInt(addDaysInput.value), auditToggle.checked);
        if (auditToggle.checked) res.logs.forEach(l => { const d = document.createElement('div'); d.className = 'audit-log-item'; d.innerText = l; auditLogs.appendChild(d); });
        el('outNewDate').innerText = formatDMY(res.date);
        resultBoxB.style.display = 'block';
    });

    btnCopyPeriod.addEventListener('click', () => {
        addYearsInput.value = el('outYears').innerText; addMonthsInput.value = el('outMonths').innerText; addDaysInput.value = el('outDays').innerText;
        ['err-addYears', 'err-addMonths', 'err-addDays'].forEach(id => { const s = el(id); if (s) s.innerText = ''; });
        checkModuleB(); el('moduleB').scrollIntoView({ behavior: 'smooth' });
    });

    // Optional self-tests
    if (new URLSearchParams(window.location.search).get('selftest') === '1') { console.log(runSelfTests()); }
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initApp); } else { initApp(); }
