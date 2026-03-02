/**
 * CALCULADORA DE DATAS PROFISSIONAL - CORE LOGIC
 * Versão Consolidada: Alta Precisão, 100% Offline, Zero Rede.
 */

// --- SEGURANÇA: NETWORK KILL-SWITCH ---
// --- SEGURANÇA: NETWORK KILL-SWITCH & PRIVACY SHIELD ---
(function() {
    const kill = () => { throw new Error("Security Violation: Action Denied (Offline Mode)"); };

    // 1. Bloqueio Total de Rede (Interface nível JS)
    window.fetch = kill;
    window.XMLHttpRequest = kill;
    if (window.WebSocket) window.WebSocket = kill;
    if (window.EventSource) window.EventSource = kill;
    if (navigator.sendBeacon) navigator.sendBeacon = kill;

    // 2. Proteção de Dados: Desativar Persistência (Prevenção de Exfiltração via Cache/Extensões)
    const deadStorage = { 
        getItem: () => null, setItem: kill, removeItem: kill, 
        clear: kill, length: 0, key: () => null 
    };
    
    try {
        Object.defineProperty(window, 'localStorage', { value: deadStorage, writable: false });
        Object.defineProperty(window, 'sessionStorage', { value: deadStorage, writable: false });
        Object.defineProperty(document, 'cookie', { 
            get: () => "", 
            set: kill,
            configurable: false 
        });
    } catch (e) {
        console.warn("Segurança: Alguns bloqueios de storage podem ser limitados pelo navegador.");
    }

    console.log("🔒 Segurança: Funcionamento 100% offline e privado garantido.");
})();

// --- AJUDANTES DE CALENDÁRIO (GREGORIANO) ---

function isLeapYear(y) {
    return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

function daysInMonth(y, m) {
    const days = [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return days[m - 1];
}

function parseDMY(str) {
    if (!str) return null;
    const parts = str.split(/[\/\-\.\s]+/);
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

// --- LÓGICA DE NEGÓCIO (MÓDULOS A e B) ---

function calculateDifference(start, end, audit = false) {
    let logs = [];
    if (compareDates(start, end) > 0) return { error: "Data final deve ser posterior ou igual à inicial." };

    if (audit) logs.push(`[INÍCIO] Calculando diferença de ${formatDMY(start)} até ${formatDMY(end)}`);

    // Passo 1: Anos
    let years = end.y - start.y;
    let candidate = { d: start.d, m: start.m, y: start.y + years };

    // Regra de Clamp Civil: 29/02 -> 28/02 em anos não-bissextos
    if (candidate.d > daysInMonth(candidate.y, candidate.m)) {
        const oldD = candidate.d;
        candidate.d = daysInMonth(candidate.y, candidate.m);
        if (audit) logs.push(`[CLAMP] Ajuste de ano: ${oldD}/${candidate.m}/${candidate.y} passou a ${formatDMY(candidate)} (mês mais curto)`);
    }

    if (compareDates(candidate, end) > 0) {
        years--;
        candidate = { d: start.d, m: start.m, y: start.y + years };
        if (candidate.d > daysInMonth(candidate.y, candidate.m)) {
            candidate.d = daysInMonth(candidate.y, candidate.m);
        }
        if (audit) logs.push(`[AJUSTE] Ano candidato era futuro. Recuando para ${years} anos.`);
    } else {
        if (audit) logs.push(`[OK] Anos aplicados: ${years}`);
    }

    // Passo 2: Meses
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
        } else {
            break;
        }
    }
    if (audit && months > 0) logs.push(`[OK] Meses adicionados: ${months} (chegou a ${formatDMY(candidate)})`);

    // Passo 3: Dias
    let days = 0;
    let temp = { ...candidate };
    while (compareDates(temp, end) < 0) {
        temp.d++;
        if (temp.d > daysInMonth(temp.y, temp.m)) {
            temp.d = 1;
            temp.m++;
            if (temp.m > 12) { temp.m = 1; temp.y++; }
        }
        days++;
    }
    if (audit && days > 0) logs.push(`[OK] Dias restantes contados: ${days}`);

    const totalDays = calculateTotalDaysInclusive(start, end);
    if (audit) logs.push(`[FINAL] Diferença: ${years}y, ${months}m, ${days}d. Total inclusive: ${totalDays} dias.`);
    
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
            if (curr.m > 12) { curr.m = 1; curr.y++; }
        }
        count++;
    }
    return count;
}

function addPeriod(base, years, months, days, audit = false) {
    let logs = [];
    if (audit) logs.push(`[INÍCIO] Adicionando ${years}y, ${months}m, ${days}d a ${formatDMY(base)}`);

    let res = { d: base.d, m: base.m, y: base.y + years };
    if (audit && years !== 0) logs.push(`[PASSO 1] Após ${years} anos: ${formatDMY(res)}`);

    res.m += months;
    while (res.m > 12) { res.m -= 12; res.y++; }
    
    const maxD = daysInMonth(res.y, res.m);
    if (res.d > maxD) {
        if (audit) logs.push(`[CLAMP] Mês curto atingido. Ajustando dia ${res.d} para ${maxD}`);
        res.d = maxD;
    }
    if (audit && months !== 0) logs.push(`[PASSO 2] Após meses: ${formatDMY(res)}`);

    for (let i = 0; i < days; i++) {
        res.d++;
        if (res.d > daysInMonth(res.y, res.m)) {
            res.d = 1;
            res.m++;
            if (res.m > 12) { res.m = 1; res.y++; }
        }
    }
    if (audit && days !== 0) logs.push(`[PASSO 3] Após ${days} dias: ${formatDMY(res)}`);

    return { date: res, logs };
}

// --- TESTES AUTOMÁTICOS ---
function runSelfTests() {
    console.log("%c--- INICIANDO AUTO-TESTES ---", "color: #818cf8; font-weight: bold;");
    const tests = [
        { name: "Bissexto 2000", res: isLeapYear(2000) === true },
        { name: "Não-Bissexto 2100", res: isLeapYear(2100) === false },
        { name: "Regra Clamp 29/02/20 -> 28/02/21", res: (function(){
            const d = calculateDifference({d:29,m:2,y:2020}, {d:28,m:2,y:2021});
            return d.years === 1 && d.months === 0 && d.days === 0;
          })()
        },
        { name: "Mesma data (Inclusivo = 1)", res: calculateTotalDaysInclusive({d:1,m:1,y:2024}, {d:1,m:1,y:2024}) === 1 }
    ];

    let passed = 0;
    tests.forEach(t => {
        if (t.res) { passed++; console.log(`✅ [PASS] ${t.name}`); }
        else { console.error(`❌ [FAIL] ${t.name}`); }
    });

    console.log(`%cRESUMO: ${passed}/${tests.length} testes passarem.`, "font-weight: bold; color: " + (passed === tests.length ? "#10b981" : "#f43f5e"));
    return passed === tests.length;
}

// --- LOGICA DE INTERAÇÃO UI ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificação de Self-Test via URL
    if (new URLSearchParams(window.location.search).get('selftest') === '1') {
        runSelfTests();
    }

    const auditToggle = document.getElementById('auditModeToggle');
    const auditSection = document.getElementById('auditSection');
    const auditLogs = document.getElementById('auditLogs');
    const btnClearAudit = document.getElementById('btnClearAudit');

    // Módulo A
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    const btnCalcDiff = document.getElementById('btnCalcDiff');
    const resultBoxA = document.getElementById('resultA');
    const outYears = document.getElementById('outYears');
    const outMonths = document.getElementById('outMonths');
    const outDays = document.getElementById('outDays');
    const outTotalDays = document.getElementById('outTotalDays');
    const btnCopyPeriod = document.getElementById('btnCopyPeriod');

    // Módulo B
    const baseDateInput = document.getElementById('baseDate');
    const addYearsInput = document.getElementById('addYears');
    const addMonthsInput = document.getElementById('addMonths');
    const addDaysInput = document.getElementById('addDays');
    const btnCalcAdd = document.getElementById('btnCalcAdd');
    const resultBoxB = document.getElementById('resultB');
    const outNewDate = document.getElementById('outNewDate');

    // Funções de Utilidade UI
    function logToAudit(message) {
        if (!auditToggle.checked) return;
        const div = document.createElement('div');
        div.className = 'audit-log-item';
        div.innerText = message;
        auditLogs.appendChild(div);
        // Auto-scroll para o fundo
        auditLogs.scrollTop = auditLogs.scrollHeight;
    }

    function clearAudit() { auditLogs.innerHTML = ''; }

    function applyMask(input) {
        // Apenas filtra caracteres, não mostra erro durante a digitação
        input.value = input.value.replace(/[^\d\/\-\.\s]/g, '');
    }

    function validateDateInput(input, errorId, showErrors = false) {
        const value = input.value.trim();
        const errSpan = document.getElementById(errorId);
        if (showErrors) errSpan.innerText = '';
        
        if (value.length === 0) return false;

        const parts = value.split(/[\/\-\.\s]+/);
        // Regra: precisa de d, m, y(4 digitos)
        const isComplete = parts.length === 3 && parts[2]?.length === 4;
        
        if (!isComplete) {
            if (showErrors) errSpan.innerText = 'Formato incompleto';
            return false;
        }

        const date = parseDMY(value);
        if (!date || !isValidDate(date.d, date.m, date.y)) {
            if (showErrors) errSpan.innerText = 'Data inválida';
            return false;
        }

        // Normalização no blur (se solicitado implicitamente pela lógica de blur)
        if (showErrors) input.value = formatDMY(date);
        return true;
    }

    function updateButtonsState() {
        // Verifica se estão válidos sem disparar mensagens de erro (silencioso)
        const aValid = validateDateInput(startInput, 'err-startDate', false) && 
                      validateDateInput(endInput, 'err-endDate', false);
        
        if (aValid) {
            const d1 = parseDMY(startInput.value);
            const d2 = parseDMY(endInput.value);
            btnCalcDiff.disabled = (compareDates(d1, d2) > 0);
        } else {
            btnCalcDiff.disabled = true;
        }

        const bValid = validateDateInput(baseDateInput, 'err-baseDate', false) &&
                      addYearsInput.value !== '' && addMonthsInput.value !== '' && addDaysInput.value !== '';
        btnCalcAdd.disabled = !bValid;
    }

    // Eventos de Input
    [startInput, endInput, baseDateInput].forEach(inp => {
        inp.addEventListener('input', (e) => {
            applyMask(e.target);
            updateButtonsState();
        });

        inp.addEventListener('blur', (e) => {
            const errorId = inp.id === 'startDate' ? 'err-startDate' : 
                          inp.id === 'endDate' ? 'err-endDate' : 'err-baseDate';
            // Agora sim mostra erros
            validateDateInput(inp, errorId, true);
            updateButtonsState();
        });
    });

    [addYearsInput, addMonthsInput, addDaysInput].forEach(inp => {
        inp.addEventListener('input', updateButtonsState);
    });

    // Controles Gerais
    auditToggle.addEventListener('change', () => {
        auditSection.style.display = auditToggle.checked ? 'block' : 'none';
        if (!auditToggle.checked) clearAudit();
    });

    btnClearAudit.addEventListener('click', clearAudit);

    // Cálculos
    btnCalcDiff.addEventListener('click', () => {
        clearAudit();
        const start = parseDMY(startInput.value);
        const end = parseDMY(endInput.value);
        const res = calculateDifference(start, end, auditToggle.checked);
        
        if (res.error) {
            document.getElementById('err-endDate').innerText = res.error;
            return;
        }

        res.logs.forEach(msg => logToAudit(msg));
        
        outYears.innerText = res.years;
        outMonths.innerText = res.months;
        outDays.innerText = res.days;
        outTotalDays.innerText = res.totalDays;
        
        resultBoxA.style.display = 'block';
        resultBoxA.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    btnCalcAdd.addEventListener('click', () => {
        clearAudit();
        const base = parseDMY(baseDateInput.value);
        const y = parseInt(addYearsInput.value) || 0;
        const m = parseInt(addMonthsInput.value) || 0;
        const d = parseInt(addDaysInput.value) || 0;

        const res = addPeriod(base, y, m, d, auditToggle.checked);
        res.logs.forEach(msg => logToAudit(msg));
        
        outNewDate.innerText = formatDMY(res.date);
        resultBoxB.style.display = 'block';
        resultBoxB.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    btnCopyPeriod.addEventListener('click', () => {
        addYearsInput.value = outYears.innerText;
        addMonthsInput.value = outMonths.innerText;
        addDaysInput.value = outDays.innerText;
        updateButtonsState();
        
        document.getElementById('moduleB').scrollIntoView({ behavior: 'smooth' });
        // Pequeno brilho visual no módulo B para feedback
        const modB = document.getElementById('moduleB');
        modB.style.borderColor = 'var(--primary)';
        setTimeout(() => modB.style.borderColor = '', 1000);
    });
});
