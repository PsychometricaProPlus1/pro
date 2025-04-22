// script.js - Frontend for Psychometrica Pro Plus (v8 - Worker Auth + Local Save + Truly Global showAlert)
// Handles UI interactions, test flow. Connects to Cloudflare Worker for Auth + Branding.
// Saves results LOCALLY in the browser only. Admin uses original plan generation inputs.
// Fix: Defined showAlert globally outside DOMContentLoaded.
// ** IMPORTANT: This script should NOT declare 'developmentPlans'. That variable belongs in plan.js **

// ========================================================================
// Utility Functions (Defined Globally)
// ========================================================================
function showAlert(type, message) { // DEFINED GLOBALLY NOW
    console.log(`ALERT (${type}): ${message}`);
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) existingAlert.remove();

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} ${type === 'critical-warning' ? 'critical-warning' : ''}`;

    if (type === 'critical-warning') {
         alertDiv.innerHTML = `
            <h4><i class="fas fa-exclamation-triangle"></i> Critical Warning!</h4>
            <p>${message}</p>
            <div class="warning-actions">
                <button class="btn" onclick="exportAllToExcel()">Export Results Now</button>
                <button class="btn" onclick="exportStudentInfoToCSV()">Export Student Info Now</button>
            </div>
        `;
         alertDiv.onclick = () => { // Allow dismissing critical alert
             alertDiv.style.opacity = '0';
             setTimeout(() => alertDiv.remove(), 500);
         };
    } else {
        alertDiv.textContent = message;
        setTimeout(() => {
             if (alertDiv) {
                 alertDiv.style.opacity = '0';
                 setTimeout(() => alertDiv.remove(), 500);
             }
         }, 5000); // 5 seconds for non-critical
    }
    // Ensure body exists before inserting
    if(document.body) {
        document.body.insertBefore(alertDiv, document.body.firstChild);
    } else {
        document.addEventListener('DOMContentLoaded', () => { // Fallback
            document.body.insertBefore(alertDiv, document.body.firstChild);
        });
    }
}


// Main application logic waits for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("SCRIPT START: DOMContentLoaded event fired.");

    // --- Configuration ---
    const BACKEND_URL = 'https://my-auth-worker.equimedia4.workers.dev';
    const RESULTS_STORAGE_KEY = 'psychometric_results';
    const STUDENT_INFO_STORAGE_KEY = 'student_info';

    // --- State Variables ---
    let selectedStandard = '';
    let selectedLanguage = '';
    let studentData = {}; // Holds data for the CURRENT test being taken
    let allResults = []; // Holds ALL locally stored results
    let allStudentInfo = []; // Holds ALL locally stored student info
    let currentQuestionIndex = 0;
    let userAnswers = {};
    let currentInfoStep = 0;

    // --- Info Fields Configuration ---
     const infoFields = [
        { id: 'student-name', labelEn: "Student's Name", labelMr: 'विद्यार्थ्याचे नाव', type: 'text' },
        { id: 'parent-name', labelEn: "Parent's Name", labelMr: 'पालकांचे नाव', type: 'text' },
        { id: 'mobile', labelEn: 'Mobile', labelMr: 'मोबाइल', type: 'tel' },
        { id: 'email', labelEn: 'Email', labelMr: 'ईमेल', type: 'email' },
        { id: 'age', labelEn: 'Age', labelMr: 'वय', type: 'number' },
        { id: 'grade', labelEn: 'Grade', labelMr: 'इयत्ता', type: 'text', readonly: true },
        {
            id: 'board', labelEn: 'Board', labelMr: 'बोर्ड', type: 'select', options: [
                { value: '', textEn: 'Select Board', textMr: 'बोर्ड निवडा' },
                { value: 'SSC', textEn: 'SSC (Maharashtra State Board)', textMr: 'एसएससी (महाराष्ट्र राज्य मंडळ)' },
                { value: 'CBSE', textEn: 'CBSE', textMr: 'सीबीएसई' },
                { value: 'ICSE', textEn: 'ICSE', textMr: 'आयसीएसई' },
                { value: 'IB', textEn: 'IB', textMr: 'आयबी' },
                { value: 'IGCSE', textEn: 'IGCSE', textMr: 'आयजीसीएसई' }
            ]
        }
    ];

    // ========================================================================
    // Utility Functions (Local to DOMContentLoaded Scope)
    // ========================================================================
    // NOTE: showAlert is defined GLOBALLY above.

    function loadResults() {
        try {
            const storedResults = localStorage.getItem(RESULTS_STORAGE_KEY);
            allResults = storedResults ? JSON.parse(storedResults) : [];
            console.log('Loaded results count:', allResults.length);
        } catch (error) {
            console.error('Error loading results from localStorage:', error);
            allResults = [];
            showAlert('error', 'Failed to load previous results.'); // Uses global showAlert
        }
    }

    function saveResults() {
        try {
            localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(allResults));
            console.log('Results saved to localStorage:', allResults.length);
        } catch (error) {
            console.error('Error saving results to localStorage:', error);
            showAlert('error', 'Failed to save results.'); // Uses global showAlert
        }
    }

    function loadStudentInfo() {
        try {
            const storedInfo = localStorage.getItem(STUDENT_INFO_STORAGE_KEY);
            allStudentInfo = storedInfo ? JSON.parse(storedInfo) : [];
            console.log('Loaded student info count:', allStudentInfo.length);
        } catch (error) {
            console.error('Error loading student info from localStorage:', error);
            allStudentInfo = [];
            showAlert('error', 'Failed to load student information.'); // Uses global showAlert
        }
    }

    function saveStudentInfo() {
        try {
            localStorage.setItem(STUDENT_INFO_STORAGE_KEY, JSON.stringify(allStudentInfo));
            console.log('Student info saved to localStorage:', allStudentInfo.length);
        } catch (error) {
            console.error('Error saving student info to localStorage:', error);
            showAlert('error', 'Failed to save student information.'); // Uses global showAlert
        }
    }

    function resetUI() {
        console.log('Resetting UI to login screen.');
        sessionStorage.removeItem('sessionToken');
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('clientBranding');

        const sections = [
            'login-section', 'standard-selection', 'language-selection',
            'info-section', 'instructions-section', 'test-section',
            'results-section', 'admin-section', 'welcome-section'
        ];
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) section.classList.add('hidden');
        });
        const loginSection = document.getElementById('login-section');
        if (loginSection) loginSection.classList.remove('hidden');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';

        const planSectionAdmin = document.getElementById('development-plan-section');
        if (planSectionAdmin) planSectionAdmin.classList.add('hidden');
        const planInputs = ['plan-student-name', 'plan-age', 'plan-standard', 'plan-score'];
         planInputs.forEach(id => { const input = document.getElementById(id); if(input) input.value = ''; });

        currentInfoStep = 0;
        currentQuestionIndex = 0;
        userAnswers = {};
        studentData = {};
        selectedStandard = '';
        selectedLanguage = '';
    }

    // --- Branding Functions (Unchanged - defined within DOMContentLoaded) ---
    function getClientBranding() { const b = sessionStorage.getItem('clientBranding'); try { return b ? JSON.parse(b) : null; } catch (e) { return null; } }
    function updateBrandingThroughout() { const b = getClientBranding(); if (!b || !b.name) return; const sections = [ 'standard-selection', 'language-selection', 'info-section', 'instructions-section', 'test-section', 'results-section', 'admin-section' ]; sections.forEach(id => { const s = document.getElementById(id); if (s && !s.classList.contains('hidden')) { let f = s.querySelector('.branding-footer'); if (f) f.remove(); const d = document.createElement('div'); d.className = 'branding-footer'; d.innerHTML = `<p>${b.name}, ${b.address || 'N/A'} | <i class="fas fa-phone"></i> ${b.phone || 'N/A'}</p>`; s.appendChild(d); } }); const rS = document.getElementById('results-section'); if (rS && !rS.classList.contains('hidden')) { const cP = rS.querySelector('.contact-message p'); if (cP) { cP.innerHTML = `For detailed discussion... contact <strong>${b.name || 'Us'}</strong> at <i class="fas fa-phone"></i> <strong>${b.phone || 'N/A'}</strong>...`; } } }
    function showWelcomeScreen() { const b = getClientBranding(); const r = sessionStorage.getItem('userRole'); if (!b || !b.name) { handlePostLoginNavigation(r); return; } const c = document.querySelector('.container'); if (!c) { handlePostLoginNavigation(r); return; } const lS = document.getElementById('login-section'); if (lS) lS.classList.add('hidden'); const eW = document.getElementById('welcome-section'); if (eW) eW.remove(); const wS = document.createElement('section'); wS.id = 'welcome-section'; wS.innerHTML = `<h2>Welcome to ${b.name}</h2><p>${b.address || ''}</p><p><i class="fas fa-phone"></i> ${b.phone || ''}</p>`; const h = c.querySelector('header'); if (h) h.insertAdjacentElement('afterend', wS); else c.insertBefore(wS, c.firstChild); setTimeout(() => { wS.classList.add('exiting'); setTimeout(() => { wS.remove(); handlePostLoginNavigation(sessionStorage.getItem('userRole')); }, 400); }, 3000); }
    function handlePostLoginNavigation(role) { const lS = document.getElementById('login-section'); if (lS) lS.classList.add('hidden'); const wS = document.getElementById('welcome-section'); if (wS) wS.remove(); if (role === 'admin') { showAdminDashboard(); } else if (role === 'user') { const sS = document.getElementById('standard-selection'); if (sS) { sS.classList.remove('hidden'); updateBrandingThroughout(); } else { showAlert('error', 'UI Error.'); resetUI(); } } else { resetUI(); } }

    // --- Authentication & Session Management (Unchanged - defined within DOMContentLoaded) ---
    async function login() { const u = document.getElementById('username')?.value.trim(); const p = document.getElementById('password')?.value.trim(); if (!u || !p) { showAlert('error', 'Credentials required.'); return; } const pl = { username: u, password: p }; const ctrl = new AbortController(); const tId = setTimeout(() => ctrl.abort(), 20000); try { const rsp = await fetch(BACKEND_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pl), signal: ctrl.signal }); clearTimeout(tId); if (!rsp.ok) { let eM = `Login failed: ${rsp.status}`; try { const eD = await rsp.json(); eM = eD?.error || eM; } catch(e){} throw new Error(eM); } const res = await rsp.json(); if (res?.success === true && res.role) { showAlert('success', 'Login Successful!'); sessionStorage.setItem('userRole', res.role); if (res.branding) sessionStorage.setItem('clientBranding', JSON.stringify(res.branding)); else sessionStorage.removeItem('clientBranding'); sessionStorage.removeItem('sessionToken'); document.getElementById('login-section')?.classList.add('hidden'); showWelcomeScreen(); } else { throw new Error(res?.error || 'Validation failed.'); } } catch (err) { clearTimeout(tId); console.error('Login error:', err); showAlert('error', err.name === 'AbortError' ? 'Timeout.' : `Login failed: ${err.message}`); resetUI(); } }
    function confirmLogout() { if (confirm('Logout?')) { resetUI(); showAlert('success', 'Logged out.'); } }

    // --- Test Flow Logic (Unchanged - defined within DOMContentLoaded) ---
    function showLanguageSelection() { const s = document.getElementById('standard'); selectedStandard = s?.value; if (!selectedStandard) { showAlert('error', 'Select grade.'); return; } const sS = document.getElementById('standard-selection'); const lS = document.getElementById('language-selection'); if (sS && lS) { sS.classList.add('hidden'); lS.classList.remove('hidden'); updateBrandingThroughout(); } }
    function startTest(lang) { selectedLanguage = lang; studentData = { grade: selectedStandard }; const lS = document.getElementById('language-selection'); const iS = document.getElementById('info-section'); if (lS && iS) { lS.classList.add('hidden'); iS.classList.remove('hidden'); currentInfoStep = 0; loadInfoStep(currentInfoStep); updateBrandingThroughout(); } }
    function loadInfoStep(idx) { const d = document.getElementById('info-step'); const bB = document.getElementById('info-back-btn'); const nB = document.getElementById('info-next-btn'); if (!d || !bB || !nB) return; const f = infoFields[idx]; const isM = selectedLanguage === 'marathi'; d.innerHTML = `<div class="form-group"><label for="${f.id}">${isM ? f.labelMr : f.labelEn}:</label>${f.type === 'select' ? `<select id="${f.id}" ${f.id === 'grade' ? 'disabled' : ''}>${f.options.map(o => `<option value="${o.value}" ${o.value === studentData[f.id] ? 'selected' : ''}>${isM ? o.textMr : o.textEn}</option>`).join('')}</select>` : `<input type="${f.type}" id="${f.id}" placeholder="${isM ? f.labelMr : f.labelEn}" value="${studentData[f.id] || ''}" ${f.id === 'grade' ? 'readonly' : ''} ${f.type === 'number' ? 'min="' + (f.id === 'age' ? '10' : '0') + '" max="' + (f.id === 'age' ? '18' : '100') + '"' : ''}>`}</div>`; if (f.id === 'grade') { d.innerHTML = `<div class="form-group"><label>${isM ? f.labelMr : f.labelEn}:</label><p style="padding: 10px; border: 1px solid #ddd; background-color: #eee; border-radius: 8px;">${studentData.grade}</p><input type="hidden" id="grade" value="${studentData.grade}"></div>`; } else if (f.id === 'board' && studentData[f.id]) { document.getElementById(f.id).value = studentData[f.id]; } bB.style.display = idx === 0 ? 'none' : 'inline-block'; nB.textContent = idx === infoFields.length - 1 ? (isM ? 'सबमिट' : 'Submit') : (isM ? 'पुढे' : 'Next'); }
    function nextInfoStep() { const f = infoFields[currentInfoStep]; const i = document.getElementById(f.id); let v = i?.value?.trim(); if (f.id === 'grade') { v = studentData.grade; } else if (!v && f.type !== 'select') { showAlert('error', `Enter ${selectedLanguage === 'marathi' ? f.labelMr : f.labelEn}.`); return; } else if (f.type === 'select' && !v) { showAlert('error', `Select ${selectedLanguage === 'marathi' ? f.labelMr : f.labelEn}.`); return; } if (f.id === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { showAlert('error', 'Invalid email.'); return; } if (f.id === 'mobile' && v && !/^\d{10}$/.test(v)) { showAlert('error', 'Invalid mobile.'); return; } if (f.id === 'age' && v) { const aN = parseInt(v); if (isNaN(aN) || aN < 10 || aN > 18) { showAlert('error', 'Age 10-18.'); return; } } studentData[f.id] = v; currentInfoStep++; if (currentInfoStep < infoFields.length) { loadInfoStep(currentInfoStep); } else { const iS = document.getElementById('info-section'); const insS = document.getElementById('instructions-section'); if (iS && insS) { iS.classList.add('hidden'); insS.classList.remove('hidden'); const iC = document.getElementById('instructions-content'); if (iC) { iC.innerHTML = selectedLanguage === 'marathi' ? `<p>प्रिय विद्यार्थी...</p><ul><li>प्रामाणिकपणे उत्तरे द्या...</li></ul>` : `<p>Dear Student...</p><ul><li>Answer honestly...</li></ul>`; } updateBrandingThroughout(); } } }
    function previousInfoStep() { if (currentInfoStep > 0) { const f = infoFields[currentInfoStep]; const i = document.getElementById(f.id); if (i && f.id !== 'grade') { studentData[f.id] = i.value?.trim(); } currentInfoStep--; loadInfoStep(currentInfoStep); } }
    function goBack(cId) { const cS = document.getElementById(cId); let pId; switch (cId) { case 'language-selection': pId = 'standard-selection'; break; case 'info-section': pId = 'language-selection'; break; case 'instructions-section': pId = 'info-section'; currentInfoStep = infoFields.length - 1; loadInfoStep(currentInfoStep); break; default: return; } const pS = document.getElementById(pId); if (cS && pS) { cS.classList.add('hidden'); pS.classList.remove('hidden'); updateBrandingThroughout(); } }
    function showTest() { const iS = document.getElementById('instructions-section'); const tS = document.getElementById('test-section'); if (iS && tS) { iS.classList.add('hidden'); tS.classList.remove('hidden'); currentQuestionIndex = 0; userAnswers = {}; loadQuestion(currentQuestionIndex); updateBrandingThroughout(); } }
    function loadQuestion(idx) { const qs = parseInt(selectedStandard) <= 8 ? window.questions5to8?.[selectedLanguage] : window.questions9to10?.[selectedLanguage]; if (!qs || qs.length === 0) { resetUI(); return; } const q = qs[idx]; const d = document.getElementById('questions'); if (!q || !d) return; d.innerHTML = `<div class="question"><p>${idx + 1}. ${q.text}</p><div class="options">${q.options.map((o, i) => `<label><input type="radio" name="q${idx}" value="${o.value || o}" ${userAnswers[idx] === (o.value || o) ? 'checked' : ''}><span>${o.text || o}</span></label>`).join('')}</div></div>`; updateProgressAndButtons(idx, qs.length); }
    function updateProgressAndButtons(cIdx, tQs) { const pf = document.getElementById('progress-fill'); const pt = document.getElementById('progress-text'); const bb = document.getElementById('back-btn'); const nb = document.getElementById('next-btn'); const sb = document.getElementById('submit-btn'); if (pf && pt && bb && nb && sb) { const p = ((cIdx + 1) / tQs) * 100; pf.style.width = `${p}%`; pt.textContent = `Q ${cIdx + 1} of ${tQs}`; bb.style.display = cIdx === 0 ? 'none' : 'inline-block'; nb.style.display = cIdx === tQs - 1 ? 'none' : 'inline-block'; sb.style.display = cIdx === tQs - 1 ? 'inline-block' : 'none'; } }
    function nextQuestion() { const qs = parseInt(selectedStandard) <= 8 ? window.questions5to8?.[selectedLanguage] : window.questions9to10?.[selectedLanguage]; if (!qs) return; const sel = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`); if (!sel) { showAlert('error', 'Select option.'); return; } userAnswers[currentQuestionIndex] = sel.value; currentQuestionIndex++; if (currentQuestionIndex < qs.length) loadQuestion(currentQuestionIndex); }
    function previousQuestion() { if (currentQuestionIndex > 0) { const sel = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`); if (sel) userAnswers[currentQuestionIndex] = sel.value; currentQuestionIndex--; loadQuestion(currentQuestionIndex); } }
    async function submitTest() { const qs = parseInt(selectedStandard) <= 8 ? window.questions5to8?.[selectedLanguage] : window.questions9to10?.[selectedLanguage]; if (!qs) return; const sel = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`); if (!sel) { showAlert('error', 'Select last option.'); return; } userAnswers[currentQuestionIndex] = sel.value; try { const res = window.calculateResults(parseInt(selectedStandard), selectedLanguage, userAnswers); if (!res?.detailedResult?.summary) throw new Error("Calculation failed."); const d = { studentData: { ...studentData }, result: res.detailedResult, date: res.date, summary: res.summary, standard: selectedStandard, language: selectedLanguage }; allResults.push(d); saveResults(); const tS = document.getElementById('test-section'); const rS = document.getElementById('results-section'); const rC = document.getElementById('result-content'); const trS = document.getElementById('trophy-sign'); if (tS && rS && rC && trS) { tS.classList.add('hidden'); rS.classList.remove('hidden'); const isH = res.summary?.toLowerCase().includes('high') || (res.detailedResult.scores?.percentage >= 80); trS.classList.toggle('hidden', !isH); let scH = ''; if (res.detailedResult.scores) scH = Object.entries(res.detailedResult.scores).map(([k, v]) => `<p><strong>${k[0].toUpperCase() + k.slice(1)}:</strong> ${v}</p>`).join(''); rC.innerHTML = `<div class="result-details"><p><strong>Name:</strong> ${d.studentData['student-name'] || 'N/A'}</p><p><strong>Grade:</strong> ${d.standard || 'N/A'}</p><p><strong>Date:</strong> ${d.date || 'N/A'}</p>${scH}<p><strong>Summary:</strong> ${d.summary || 'N/A'}</p><p style="grid-column: 1 / -1;"><strong>Analysis:</strong> ${d.result.analysis || 'N/A'}</p></div>${d.result.recommendations?.length > 0 ? `<div class="recommendations-toggle" onclick="toggleRecommendations(this)">Show Recs</div><ul class="recommendations-list">${d.result.recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul>` : ''}`; updateBrandingThroughout(); } } catch (err) { console.error('Submit error:', err); showAlert('error', `Result error: ${err.message}`); } }
    function toggleRecommendations(btn) { const l = btn.nextElementSibling; if (l?.classList.contains('recommendations-list')) { l.classList.toggle('active'); btn.textContent = l.classList.contains('active') ? 'Hide Recs' : 'Show Recs'; } }
    function shareOnWhatsApp() { const lr = allResults[allResults.length - 1]; if (!lr?.studentData?.result) { showAlert('error', 'No data.'); return; } const n = lr.studentData['student-name'] || 'N/A'; const g = lr.standard || 'N/A'; const s = lr.summary || 'N/A'; const a = lr.result.analysis || 'N/A'; const rs = lr.result.recommendations?.map((r, i) => `${i + 1}. ${r}`).join('\n') || 'N/A'; const b = getClientBranding(); const c = b?.phone ? `Contact: ${b.name} at ${b.phone}` : ''; const txt = `*Results*\n\n*Student:* ${n}\n*Grade:* ${g}\n\n*Summary:* ${s}\n*Analysis:* ${a}\n\n*Recs:*\n${rs}\n\n${c}`; window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank'); }
    function copyResultCode() { const lr = allResults[allResults.length - 1]; if (!lr?.studentData?.result) { showAlert('error', 'No data.'); return; } const n = lr.studentData['student-name'] || 'N/A'; const g = lr.standard || 'N/A'; const dt = lr.date || 'N/A'; const sm = lr.summary || 'N/A'; const an = lr.result.analysis || 'N/A'; const rs = lr.result.recommendations?.map((r, i) => `${i + 1}. ${r}`).join('\n') || 'N/A'; const sc = lr.result.scores ? Object.entries(lr.result.scores).map(([k, v]) => `${k[0].toUpperCase() + k.slice(1)}: ${v}`).join(', ') : 'N/A'; const txt = `Results\n---\nStudent: ${n}\nGrade: ${g}\nDate: ${dt}\nScores: ${sc}\nSummary: ${sm}\nAnalysis: ${an}\nRecs:\n${rs}\n---`; navigator.clipboard.writeText(txt).then(() => showAlert('success', 'Copied.'), () => showAlert('error', 'Copy failed.')); }
    function downloadCertificate() { if (typeof window.jspdf?.jsPDF === 'undefined') { showAlert('error', 'PDF lib error.'); return; } const { jsPDF } = window.jspdf; if (allResults.length === 0) { showAlert('error', 'No results.'); return; } const lr = allResults[allResults.length - 1]; if (!lr?.studentData?.result) { showAlert('error', 'Incomplete data.'); return; } const doc = new jsPDF({ o: 'l', u: 'mm', f: 'a4' }); const b = getClientBranding() || { name: 'App Name', address: 'N/A', phone: 'N/A' }; const sN = lr.studentData['student-name'] || 'Student'; const gr = lr.standard || 'N/A'; const dt = lr.date || 'N/A'; const sum = lr.summary || 'Completed'; try { doc.setDrawColor(27, 59, 111); doc.setLineWidth(1); doc.rect(10, 10, 277, 190); doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(27, 59, 111); doc.text(b.name.toUpperCase(), 148.5, 35, { align: 'center' }); doc.setFont('helvetica', 'normal'); doc.setFontSize(14); doc.setTextColor(107, 114, 128); doc.text('Certificate of Achievement', 148.5, 45, { align: 'center' }); doc.setDrawColor(244, 162, 97); doc.setLineWidth(0.5); doc.line(40, 55, 257, 55); doc.setFontSize(16); doc.setTextColor(31, 42, 68); doc.text('Awarded to', 148.5, 75, { align: 'center' }); doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(27, 59, 111); doc.text(sN.toUpperCase(), 148.5, 90, { align: 'center' }); doc.setFont('helvetica', 'normal'); doc.setFontSize(14); doc.setTextColor(31, 42, 68); const dsc = `Completed assessment for Grade ${gr}.`; doc.text(dsc, 148.5, 105, { align: 'center' }); doc.setFontSize(12); doc.setTextColor(107, 114, 128); doc.text(`Summary: ${sum}`, 148.5, 125, { align: 'center' }); doc.text(`Date: ${dt}`, 148.5, 135, { align: 'center' }); doc.setFontSize(10); doc.text(`Issued by: ${b.name}`, 148.5, 165, { align: 'center' }); doc.setTextColor(107, 114, 128); doc.text(`Powered by App Name`, 148.5, 175, { align: 'center' }); doc.save(`Cert_${sN}.pdf`); showAlert('success', 'Cert downloaded.'); } catch (err) { console.error("PDF error:", err); showAlert('error', 'Cert gen failed.'); } }

    // --- Admin Section Logic (Unchanged - defined within DOMContentLoaded) ---
    function showAdminDashboard() { console.log('Showing admin.'); const aS = document.getElementById('admin-section'); const rT = document.querySelector('#results-table tbody'); const sT = document.querySelector('#student-info-table tbody'); if (!aS || !rT || !sT) { showAlert('error', 'Admin UI missing.'); return; } if (allResults.length > 0 || allStudentInfo.length > 0) { showAlert( 'critical-warning', 'Local data detected. Export regularly.' ); } else { showAlert('info', 'No local data.'); } aS.classList.remove('hidden'); rT.innerHTML = allResults.map(e => `<tr><td>${e.studentData?.['student-name'] || ''}</td><td>${e.standard || ''}</td><td>${e.date || ''}</td><td>${e.summary || ''}</td></tr>`).join(''); sT.innerHTML = allStudentInfo.map(i => `<tr><td>${i.studentName || ''}</td><td>${i.parentName || ''}</td><td>${i.mobile || ''}</td><td>${i.email || ''}</td><td>${i.school || ''}</td><td>${i.age || ''}</td><td>${i.board || ''}</td><td>${i.standard || ''}</td><td>${i.medium || ''}</td></tr>`).join(''); updateBrandingThroughout(); }
    function clearReports() { if (!allResults.length) {showAlert('info','No results.');return;} if (confirm('Clear results? Export first.')) { if (confirm('CONFIRM: Delete results?')) { allResults = []; saveResults(); showAdminDashboard(); showAlert('success', 'Results cleared.'); } } }
    function exportAllToExcel() { if (!allResults.length) {showAlert('error','No results.');return;} let h = ['Student Name','Parent Name','Mobile','Email','Age','Board','Grade','Language','Date','Summary','Analysis']; const hasHG = allResults.some(r=>parseInt(r.standard)>=9); if(hasHG) h.push('Realistic','Investigative','Artistic','Social','Enterprising','Conventional'); const hasLG = allResults.some(r=>parseInt(r.standard)<=8 && r.result?.scores?.percentage!==undefined); if(hasLG) h.push('Percentage'); h.push('Recommendations'); let csv=h.join(',')+'\n'; allResults.forEach(r=>{ const s=r.studentData||{}; const re=r.result||{}; const sc=re.scores||{}; let rd=[s['student-name']||'',s['parent-name']||'',s['mobile']||'',s['email']||'',s['age']||'',s['board']||'',r.standard||'',r.language||'',r.date||'',r.summary||'',(re.analysis||'').replace(/[\r\n,"]/g,' ')]; if(hasHG){ if(parseInt(r.standard)>=9) rd.push(sc.realistic??'',sc.investigative??'',sc.artistic??'',sc.social??'',sc.enterprising??'',sc.conventional??''); else rd.push('','','','','',''); } if(hasLG){ if(parseInt(r.standard)<=8 && sc.percentage!==undefined) rd.push(sc.percentage??''); else rd.push(''); } rd.push((re.recommendations||[]).join('; ').replace(/[,"]/g,' ')); csv+=rd.map(f=>`"${String(f).replace(/"/g,'""')}"`).join(',')+'\n'; }); const b=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const l=document.createElement('a'); const u=URL.createObjectURL(b); l.setAttribute('href',u); const ts=new Date().toISOString().replace(/[:.]/g,'-'); l.setAttribute('download',`Results_${ts}.csv`); l.style.visibility='hidden'; document.body.appendChild(l); l.click(); document.body.removeChild(l); URL.revokeObjectURL(u); showAlert('success','Results exported.'); }
    function submitStudentInfo() { const sN=document.getElementById('info-student-name')?.value.trim(); const pN=document.getElementById('info-parent-name')?.value.trim(); const m=document.getElementById('info-mobile')?.value.trim(); const e=document.getElementById('info-email')?.value.trim(); const sch=document.getElementById('info-school')?.value.trim(); const aI=document.getElementById('info-age'); const b=document.getElementById('info-board')?.value; const st=document.getElementById('info-standard')?.value; const med=document.getElementById('info-medium')?.value; if (!sN||!pN||!m||!e||!sch||!aI?.value||!b||!st||!med) { showAlert('error','Fill all fields.'); return; } const age=parseInt(aI.value,10); if (isNaN(age)||age<5||age>25) { showAlert('error','Valid age 5-25.'); return; } if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { showAlert('error','Valid email.'); return; } if (!/^\d{10}$/.test(m)) { showAlert('error','10-digit mobile.'); return; } const sI={studentName:sN,parentName:pN,mobile:m,email:e,school:sch,age,board:b,standard:st,medium:med,timestamp:new Date().toISOString()}; allStudentInfo.push(sI); saveStudentInfo(); showAdminDashboard(); document.getElementById('info-student-name').value=''; document.getElementById('info-parent-name').value=''; document.getElementById('info-mobile').value=''; document.getElementById('info-email').value=''; document.getElementById('info-school').value=''; document.getElementById('info-age').value=''; document.getElementById('info-board').value=''; document.getElementById('info-standard').value=''; document.getElementById('info-medium').value=''; showAlert('success','Student info saved.'); }
    function exportStudentInfoToCSV() { if (!allStudentInfo.length) { showAlert('error','No info to export.'); return; } let h=['Name','Parent','Mobile','Email','School','Age','Board','Std','Medium','Timestamp']; let csv=h.join(',')+'\n'; allStudentInfo.forEach(i => { const r=[ i.studentName,i.parentName,i.mobile,i.email,i.school,i.age,i.board,i.standard,i.medium,i.timestamp||'' ]; csv+=r.map(f=>`"${String(f).replace(/"/g,'""')}"`).join(',')+'\n'; }); const b=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const l=document.createElement('a'); const u=URL.createObjectURL(b); l.setAttribute('href',u); const ts=new Date().toISOString().replace(/[:.]/g,'-'); l.setAttribute('download', `StudentInfo_${ts}.csv`); l.style.visibility='hidden'; document.body.appendChild(l); l.click(); document.body.removeChild(l); URL.revokeObjectURL(u); showAlert('success','Student info exported.'); }
    function clearStudentInfo() { if (!allStudentInfo.length) {showAlert('info','No info to clear.');return;} if (confirm('Clear student info? Export first.')) { if (confirm('CONFIRM: Delete student info?')) { allStudentInfo = []; saveStudentInfo(); showAdminDashboard(); showAlert('success', 'Student info cleared.'); } } }


    // ========================================================================
    // Initialization
    // ========================================================================

    console.log('SCRIPT INFO: Assigning functions to window object...');
    // Assign functions needed globally by HTML onclick attributes
    window.login = login;
    window.confirmLogout = confirmLogout;
    window.showLanguageSelection = showLanguageSelection;
    window.startTest = startTest;
    window.nextInfoStep = nextInfoStep;
    window.previousInfoStep = previousInfoStep;
    window.showTest = showTest;
    window.nextQuestion = nextQuestion;
    window.previousQuestion = previousQuestion;
    window.submitTest = submitTest;
    window.shareOnWhatsApp = shareOnWhatsApp;
    window.copyResultCode = copyResultCode;
    window.goBack = goBack;
    window.toggleRecommendations = toggleRecommendations;
    window.downloadCertificate = downloadCertificate;
    window.showAdminDashboard = showAdminDashboard;
    window.exportAllToExcel = exportAllToExcel;
    window.clearReports = clearReports;
    window.submitStudentInfo = submitStudentInfo;
    window.exportStudentInfoToCSV = exportStudentInfoToCSV;
    window.clearStudentInfo = clearStudentInfo;
    window.getClientBranding = getClientBranding; // Potentially used by plan.js

    // NOTE: showAlert is defined globally above.

    // Ensure plan functions (defined in plan.js) are globally accessible.
    // These assignments might be redundant if plan.js does it, but safe to include.
    // Check if they exist BEFORE assigning, to avoid errors if plan.js failed
    if (typeof generateDevelopmentPlan !== 'undefined') {
        window.generateDevelopmentPlan = generateDevelopmentPlan;
    } else {
        // Log warning if plan.js didn't load/assign correctly
        console.warn("generateDevelopmentPlan not found globally after plan.js load!");
    }
    if (typeof copyPlan !== 'undefined') {
        window.copyPlan = copyPlan;
     } else {
        // Log warning if plan.js didn't load/assign correctly
        console.warn("copyPlan not found globally after plan.js load!");
    }


    console.log('SCRIPT INFO: Initializing application state...');
    loadResults();
    loadStudentInfo();
    resetUI(); // Start at login screen

    console.log("SCRIPT END: Initialization complete.");
}); // End of DOMContentLoaded
