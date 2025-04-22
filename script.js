// script.js - Frontend for Psychometrica Pro Plus (v9 - MERGED PLAN.JS)
// Combines script.js and plan.js logic. Uses Worker Auth + Local Save.
// Admin uses original plan generation inputs. showAlert is global.

// ========================================================================
// Utility Functions (Defined Globally)
// ========================================================================
function showAlert(type, message) {
    console.log(`ALERT (${type}): ${message}`);
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) existingAlert.remove();
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} ${type === 'critical-warning' ? 'critical-warning' : ''}`;
    if (type === 'critical-warning') {
         alertDiv.innerHTML = `<h4><i class="fas fa-exclamation-triangle"></i> Critical Warning!</h4><p>${message}</p><div class="warning-actions"><button class="btn" onclick="exportAllToExcel()">Export Results</button> <button class="btn" onclick="exportStudentInfoToCSV()">Export Info</button></div>`;
         alertDiv.onclick = () => { alertDiv.style.opacity = '0'; setTimeout(() => alertDiv.remove(), 500); };
    } else {
        alertDiv.textContent = message;
        setTimeout(() => { if (alertDiv) { alertDiv.style.opacity = '0'; setTimeout(() => alertDiv.remove(), 500); } }, 5000);
    }
    if(document.body) { document.body.insertBefore(alertDiv, document.body.firstChild); }
    else { document.addEventListener('DOMContentLoaded', () => { document.body.insertBefore(alertDiv, document.body.firstChild); }); }
}

// Main application logic waits for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("SCRIPT START: DOMContentLoaded event fired (v9 - Merged).");

    // --- Configuration ---
    const BACKEND_URL = 'https://my-auth-worker.equimedia4.workers.dev';
    const RESULTS_STORAGE_KEY = 'psychometric_results';
    const STUDENT_INFO_STORAGE_KEY = 'student_info';

    // --- State Variables ---
    let selectedStandard = '';
    let selectedLanguage = '';
    let studentData = {};
    let allResults = [];
    let allStudentInfo = [];
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
        { id: 'board', labelEn: 'Board', labelMr: 'बोर्ड', type: 'select', options: [ { value: '', textEn: 'Select Board', textMr: 'बोर्ड निवडा' }, { value: 'SSC', textEn: 'SSC', textMr: 'एसएससी' }, { value: 'CBSE', textEn: 'CBSE', textMr: 'सीबीएसई' }, { value: 'ICSE', textEn: 'ICSE', textMr: 'आयसीएसई' }, { value: 'IB', textEn: 'IB', textMr: 'आयबी' }, { value: 'IGCSE', textEn: 'IGCSE', textMr: 'आयजीसीएसई' } ] }
    ];

    // --- Development Plan Data (Moved from plan.js) ---
    const developmentPlans = {
        '5-8': {
            low: { text: `Plan (Grades 5-8, Low Score)\nStudent: {{studentName}}, Age: {{age}}, Std: {{standard}}\n\nObjective: Build basics.\n\nActivities:\n- Game: Chess (1hr/wk)\n- Book: Panchatantra (1 story/wk)\n- YouTube: Chhota Bheem (1 ep/wk)\n- Outdoor: Plant Tulsi\n- School: Drawing Club\n- Craft: Paper Boat\n- Paint: Flower\n- Exercise: Skip Rope (10min/day)\n\nParent Tips:\n- Study Time: 1.5hr/day\n- Read Together: Panchatantra\n- Help With: Diwali Diya\n- Discuss: Chhota Bheem values\n- Praise: Drawing efforts\n` },
            medium: { text: `Plan (Grades 5-8, Medium Score)\nStudent: {{studentName}}, Age: {{age}}, Std: {{standard}}\n\nObjective: Strengthen skills.\n\nActivities:\n- Game: Kabaddi (1.5hr/wk)\n- Book: Tinkle (5 pages/wk)\n- YouTube: Vigyan Prasar (2 videos/month)\n- Outdoor: Plant Neem\n- School: Science Club\n- Craft: Diwali Diya (2)\n- Paint: Rangoli\n- Exercise: Surya Namaskar (8 rounds/day)\n\nParent Tips:\n- Study Time: 2hr/day\n- Read Together: Tinkle\n- Help With: Diwali Diyas\n- Discuss: Bharat Ek Khoj\n- Praise: Science projects\n` },
            high: { text: `Plan (Grades 5-8, High Score)\nStudent: {{studentName}}, Age: {{age}}, Std: {{standard}}\n\nObjective: Enhance advanced skills.\n\nActivities:\n- Game: Kabaddi (2hr/wk)\n- Book: Art of Problem Solving (5 pages/wk)\n- YouTube: Khan Academy India (2 videos/wk)\n- Outdoor: Plant Fruit Tree\n- School: Robotics Club\n- Craft: Paper Lantern\n- Paint: Mandala (3)\n- Exercise: Badminton (1hr, 3x/wk)\n\nParent Tips:\n- Study Time: 2.5hr/day\n- Read Together: Problem Solving book\n- Help With: Diwali Lantern\n- Discuss: Khan Academy\n- Praise: Leadership (Robotics)\n` }
        },
        '9-10': {
            low: { text: `Plan (Grades 9-10, Low Score)\nStudent: {{studentName}}, Age: {{age}}, Std: {{standard}}\n\nObjective: Build study habits & confidence.\n\nActivities:\n- Game: Carrom (1hr/wk)\n- Book: Ignited Minds (3 pages/day)\n- YouTube: Unacademy (1 video/wk)\n- Outdoor: Plant Neem\n- School: Study Group\n- Craft: Rakhi\n- Paint: Rangoli\n- Exercise: Skip Rope (15min/day)\n\nParent Tips:\n- Study Time: 2hr/day\n- Read Together: Ignited Minds\n- Help With: Rakhi\n- Discuss: Unacademy videos\n- Praise: Study group efforts\n` },
            medium: { text: `Plan (Grades 9-10, Medium Score)\nStudent: {{studentName}}, Age: {{age}}, Std: {{standard}}\n\nObjective: Prepare for boards, explore careers.\n\nActivities:\n- Game: Cricket (2hr/wk)\n- Book: Wings of Fire (5 pages/day)\n- YouTube: Unacademy JEE Prep (2 videos/wk)\n- Outdoor: Tree Plantation Drive\n- School: Debate Team\n- Craft: Ganesh Idol\n- Paint: Freedom Fighter Portrait\n- Exercise: Yoga (15min/day)\n\nParent Tips:\n- Study Time: 3hr/day\n- Read Together: Wings of Fire\n- Help With: Ganesh Idol\n- Discuss: ISRO Lectures\n- Praise: Debate practice\n` },
            high: { text: `Plan (Grades 9-10, High Score)\nStudent: {{studentName}}, Age: {{age}}, Std: {{standard}}\n\nObjective: Excel in boards, plan career.\n\nActivities:\n- Game: Chess (3hr/wk)\n- Book: India After Gandhi (10 pages/wk)\n- YouTube: ISRO Lectures (2 videos/month)\n- Outdoor: Lead Plantation Drive\n- School: Lead Debate Team\n- Craft: Tricolor Flag (2)\n- Paint: India Map (mark historical sites)\n- Exercise: Run (30min/day)\n\nParent Tips:\n- Study Time: 3.5hr/day\n- Read Together: Discovery of India\n- Help With: School Play Direction\n- Discuss: Khan Academy advanced topics\n- Praise: Leadership (Debate)\n` }
        }
    };


    // ========================================================================
    // Utility Functions (Local Scope)
    // ========================================================================
    function loadResults() { try { const d = localStorage.getItem(RESULTS_STORAGE_KEY); allResults = d ? JSON.parse(d) : []; console.log('Loaded results:', allResults.length); } catch (e) { console.error('Load results error:', e); allResults = []; showAlert('error', 'Load results failed.'); } }
    function saveResults() { try { localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(allResults)); console.log('Saved results:', allResults.length); } catch (e) { console.error('Save results error:', e); showAlert('error', 'Save results failed.'); } }
    function loadStudentInfo() { try { const d = localStorage.getItem(STUDENT_INFO_STORAGE_KEY); allStudentInfo = d ? JSON.parse(d) : []; console.log('Loaded student info:', allStudentInfo.length); } catch (e) { console.error('Load student info error:', e); allStudentInfo = []; showAlert('error', 'Load student info failed.'); } }
    function saveStudentInfo() { try { localStorage.setItem(STUDENT_INFO_STORAGE_KEY, JSON.stringify(allStudentInfo)); console.log('Saved student info:', allStudentInfo.length); } catch (e) { console.error('Save student info error:', e); showAlert('error', 'Save student info failed.'); } }
    function resetUI() { console.log('Resetting UI'); sessionStorage.clear(); const sections = ['login-section', 'standard-selection', 'language-selection', 'info-section', 'instructions-section', 'test-section', 'results-section', 'admin-section', 'welcome-section']; sections.forEach(id => document.getElementById(id)?.classList.add('hidden')); document.getElementById('login-section')?.classList.remove('hidden'); ['username', 'password', 'plan-student-name', 'plan-age', 'plan-standard', 'plan-score'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; }); document.getElementById('development-plan-section')?.classList.add('hidden'); currentInfoStep = 0; currentQuestionIndex = 0; userAnswers = {}; studentData = {}; selectedStandard = ''; selectedLanguage = ''; }

    // --- Branding Functions ---
    function getClientBranding() { const b = sessionStorage.getItem('clientBranding'); try { return b ? JSON.parse(b) : null; } catch (e) { return null; } }
    function updateBrandingThroughout() { const b = getClientBranding(); if (!b?.name) return; const sections = [ 'standard-selection', 'language-selection', 'info-section', 'instructions-section', 'test-section', 'results-section', 'admin-section' ]; sections.forEach(id => { const s = document.getElementById(id); if (s && !s.classList.contains('hidden')) { s.querySelector('.branding-footer')?.remove(); const d = document.createElement('div'); d.className = 'branding-footer'; d.innerHTML = `<p>${b.name}, ${b.address || 'N/A'} | <i class="fas fa-phone"></i> ${b.phone || 'N/A'}</p>`; s.appendChild(d); } }); const rS = document.getElementById('results-section'); if (rS && !rS.classList.contains('hidden')) { const cP = rS.querySelector('.contact-message p'); if (cP) cP.innerHTML = `Contact <strong>${b.name || 'Us'}</strong> at <i class="fas fa-phone"></i> <strong>${b.phone || 'N/A'}</strong>...`; } }
    function showWelcomeScreen() { const b = getClientBranding(); const r = sessionStorage.getItem('userRole'); if (!b?.name) { handlePostLoginNavigation(r); return; } const c = document.querySelector('.container'); if (!c) { handlePostLoginNavigation(r); return; } document.getElementById('login-section')?.classList.add('hidden'); document.getElementById('welcome-section')?.remove(); const wS = document.createElement('section'); wS.id = 'welcome-section'; wS.innerHTML = `<h2>Welcome to ${b.name}</h2><p>${b.address || ''}</p><p><i class="fas fa-phone"></i> ${b.phone || ''}</p>`; c.querySelector('header')?.insertAdjacentElement('afterend', wS); setTimeout(() => { wS.classList.add('exiting'); setTimeout(() => { wS.remove(); handlePostLoginNavigation(sessionStorage.getItem('userRole')); }, 400); }, 3000); }
    function handlePostLoginNavigation(role) { document.getElementById('login-section')?.classList.add('hidden'); document.getElementById('welcome-section')?.remove(); if (role === 'admin') showAdminDashboard(); else if (role === 'user') { const sS = document.getElementById('standard-selection'); if (sS) { sS.classList.remove('hidden'); updateBrandingThroughout(); } else { showAlert('error', 'UI Error.'); resetUI(); } } else resetUI(); }

    // --- Authentication ---
    async function login() { const u = document.getElementById('username')?.value.trim(); const p = document.getElementById('password')?.value.trim(); if (!u || !p) { showAlert('error', 'Credentials required.'); return; } const pl = { username: u, password: p }; const ctrl = new AbortController(); const tId = setTimeout(() => ctrl.abort(), 20000); try { const rsp = await fetch(BACKEND_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pl), signal: ctrl.signal }); clearTimeout(tId); if (!rsp.ok) { let eM = `Login failed: ${rsp.status}`; try { eM = (await rsp.json())?.error || eM; } catch(e){} throw new Error(eM); } const res = await rsp.json(); if (res?.success === true && res.role) { showAlert('success', 'Login Successful!'); sessionStorage.setItem('userRole', res.role); if (res.branding) sessionStorage.setItem('clientBranding', JSON.stringify(res.branding)); else sessionStorage.removeItem('clientBranding'); sessionStorage.removeItem('sessionToken'); document.getElementById('login-section')?.classList.add('hidden'); showWelcomeScreen(); } else throw new Error(res?.error || 'Validation failed.'); } catch (err) { clearTimeout(tId); console.error('Login error:', err); showAlert('error', err.name === 'AbortError' ? 'Timeout.' : `Login failed: ${err.message}`); resetUI(); } }
    function confirmLogout() { if (confirm('Logout?')) { resetUI(); showAlert('success', 'Logged out.'); } }

    // --- Test Flow Logic ---
    function showLanguageSelection() { const s = document.getElementById('standard'); selectedStandard = s?.value; if (!selectedStandard) { showAlert('error', 'Select grade.'); return; } const sS = document.getElementById('standard-selection'); const lS = document.getElementById('language-selection'); if (sS && lS) { sS.classList.add('hidden'); lS.classList.remove('hidden'); updateBrandingThroughout(); } }
    function startTest(lang) { selectedLanguage = lang; studentData = { grade: selectedStandard }; const lS = document.getElementById('language-selection'); const iS = document.getElementById('info-section'); if (lS && iS) { lS.classList.add('hidden'); iS.classList.remove('hidden'); currentInfoStep = 0; loadInfoStep(currentInfoStep); updateBrandingThroughout(); } }
    function loadInfoStep(idx) { const d = document.getElementById('info-step'); const bB = document.getElementById('info-back-btn'); const nB = document.getElementById('info-next-btn'); if (!d || !bB || !nB) return; const f = infoFields[idx]; const isM = selectedLanguage === 'marathi'; d.innerHTML = `<div class="form-group"><label for="${f.id}">${isM ? f.labelMr : f.labelEn}:</label>${f.type === 'select' ? `<select id="${f.id}" ${f.id === 'grade' ? 'disabled' : ''}>${f.options.map(o => `<option value="${o.value}" ${o.value === studentData[f.id] ? 'selected' : ''}>${isM ? o.textMr : o.textEn}</option>`).join('')}</select>` : `<input type="${f.type}" id="${f.id}" placeholder="${isM ? f.labelMr : f.labelEn}" value="${studentData[f.id] || ''}" ${f.id === 'grade' ? 'readonly' : ''} ${f.type === 'number' ? 'min="' + (f.id === 'age' ? '10' : '0') + '" max="' + (f.id === 'age' ? '18' : '100') + '"' : ''}>`}</div>`; if (f.id === 'grade') { d.innerHTML = `<div class="form-group"><label>${isM ? f.labelMr : f.labelEn}:</label><p class="readonly-field">${studentData.grade}</p><input type="hidden" id="grade" value="${studentData.grade}"></div>`; } else if (f.id === 'board' && studentData[f.id]) { document.getElementById(f.id).value = studentData[f.id]; } bB.style.display = idx === 0 ? 'none' : 'inline-block'; nB.textContent = idx === infoFields.length - 1 ? (isM ? 'सबमिट' : 'Submit') : (isM ? 'पुढे' : 'Next'); }
    function nextInfoStep() { const f = infoFields[currentInfoStep]; const i = document.getElementById(f.id); let v = i?.value?.trim(); if (f.id === 'grade') v = studentData.grade; else if (!v && f.type !== 'select') { showAlert('error', `Enter ${selectedLanguage === 'marathi' ? f.labelMr : f.labelEn}.`); return; } else if (f.type === 'select' && !v) { showAlert('error', `Select ${selectedLanguage === 'marathi' ? f.labelMr : f.labelEn}.`); return; } if (f.id === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { showAlert('error', 'Invalid email.'); return; } if (f.id === 'mobile' && v && !/^\d{10}$/.test(v)) { showAlert('error', 'Invalid mobile.'); return; } if (f.id === 'age' && v) { const aN = parseInt(v); if (isNaN(aN) || aN < 10 || aN > 18) { showAlert('error', 'Age 10-18.'); return; } } studentData[f.id] = v; currentInfoStep++; if (currentInfoStep < infoFields.length) loadInfoStep(currentInfoStep); else { const iS = document.getElementById('info-section'); const insS = document.getElementById('instructions-section'); if (iS && insS) { iS.classList.add('hidden'); insS.classList.remove('hidden'); document.getElementById('instructions-content').innerHTML = selectedLanguage === 'marathi' ? `<p>प्रिय विद्यार्थी...</p><ul><li>प्रामाणिकपणे उत्तरे द्या...</li></ul>` : `<p>Dear Student...</p><ul><li>Answer honestly...</li></ul>`; updateBrandingThroughout(); } } }
    function previousInfoStep() { if (currentInfoStep > 0) { const f = infoFields[currentInfoStep]; const i = document.getElementById(f.id); if (i && f.id !== 'grade') studentData[f.id] = i.value?.trim(); currentInfoStep--; loadInfoStep(currentInfoStep); } }
    function goBack(cId) { const cS = document.getElementById(cId); let pId; switch (cId) { case 'language-selection': pId = 'standard-selection'; break; case 'info-section': pId = 'language-selection'; break; case 'instructions-section': pId = 'info-section'; currentInfoStep = infoFields.length - 1; loadInfoStep(currentInfoStep); break; default: return; } const pS = document.getElementById(pId); if (cS && pS) { cS.classList.add('hidden'); pS.classList.remove('hidden'); updateBrandingThroughout(); } }
    function showTest() { const iS = document.getElementById('instructions-section'); const tS = document.getElementById('test-section'); if (iS && tS) { iS.classList.add('hidden'); tS.classList.remove('hidden'); currentQuestionIndex = 0; userAnswers = {}; loadQuestion(currentQuestionIndex); updateBrandingThroughout(); } }
    function loadQuestion(idx) { const qs = parseInt(selectedStandard) <= 8 ? window.questions5to8?.[selectedLanguage] : window.questions9to10?.[selectedLanguage]; if (!qs?.length) { resetUI(); return; } const q = qs[idx]; const d = document.getElementById('questions'); if (!q || !d) return; d.innerHTML = `<div class="question"><p>${idx + 1}. ${q.text}</p><div class="options">${q.options.map((o, i) => `<label><input type="radio" name="q${idx}" value="${o.value || o}" ${userAnswers[idx] === (o.value || o) ? 'checked' : ''}><span>${o.text || o}</span></label>`).join('')}</div></div>`; updateProgressAndButtons(idx, qs.length); }
    function updateProgressAndButtons(cIdx, tQs) { const pf = document.getElementById('progress-fill'); const pt = document.getElementById('progress-text'); const bb = document.getElementById('back-btn'); const nb = document.getElementById('next-btn'); const sb = document.getElementById('submit-btn'); if (pf && pt && bb && nb && sb) { const p = ((cIdx + 1) / tQs) * 100; pf.style.width = `${p}%`; pt.textContent = `Q ${cIdx + 1} of ${tQs}`; bb.style.display = cIdx === 0 ? 'none' : 'inline-block'; nb.style.display = cIdx === tQs - 1 ? 'none' : 'inline-block'; sb.style.display = cIdx === tQs - 1 ? 'inline-block' : 'none'; } }
    function nextQuestion() { const qs = parseInt(selectedStandard) <= 8 ? window.questions5to8?.[selectedLanguage] : window.questions9to10?.[selectedLanguage]; if (!qs) return; const sel = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`); if (!sel) { showAlert('error', 'Select option.'); return; } userAnswers[currentQuestionIndex] = sel.value; currentQuestionIndex++; if (currentQuestionIndex < qs.length) loadQuestion(currentQuestionIndex); }
    function previousQuestion() { if (currentQuestionIndex > 0) { const sel = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`); if (sel) userAnswers[currentQuestionIndex] = sel.value; currentQuestionIndex--; loadQuestion(currentQuestionIndex); } }
    async function submitTest() { const qs = parseInt(selectedStandard) <= 8 ? window.questions5to8?.[selectedLanguage] : window.questions9to10?.[selectedLanguage]; if (!qs) return; const sel = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`); if (!sel) { showAlert('error', 'Select last option.'); return; } userAnswers[currentQuestionIndex] = sel.value; try { const res = window.calculateResults(parseInt(selectedStandard), selectedLanguage, userAnswers); if (!res?.detailedResult?.summary) throw new Error("Calculation failed."); const d = { studentData: { ...studentData }, result: res.detailedResult, date: res.date, summary: res.summary, standard: selectedStandard, language: selectedLanguage }; allResults.push(d); saveResults(); const tS = document.getElementById('test-section'); const rS = document.getElementById('results-section'); const rC = document.getElementById('result-content'); const trS = document.getElementById('trophy-sign'); if (tS && rS && rC && trS) { tS.classList.add('hidden'); rS.classList.remove('hidden'); const isH = res.summary?.toLowerCase().includes('high') || (res.detailedResult.scores?.percentage >= 80); trS.classList.toggle('hidden', !isH); let scH = ''; if (res.detailedResult.scores) scH = Object.entries(res.detailedResult.scores).map(([k, v]) => `<p><strong>${k[0].toUpperCase() + k.slice(1)}:</strong> ${v}</p>`).join(''); rC.innerHTML = `<div class="result-details"><p><strong>Name:</strong> ${d.studentData['student-name'] || 'N/A'}</p><p><strong>Grade:</strong> ${d.standard || 'N/A'}</p><p><strong>Date:</strong> ${d.date || 'N/A'}</p>${scH}<p><strong>Summary:</strong> ${d.summary || 'N/A'}</p><p style="grid-column: 1 / -1;"><strong>Analysis:</strong> ${d.result.analysis || 'N/A'}</p></div>${d.result.recommendations?.length > 0 ? `<div class="recommendations-toggle" onclick="toggleRecommendations(this)">Show Recs</div><ul class="recommendations-list">${d.result.recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul>` : ''}`; updateBrandingThroughout(); } } catch (err) { console.error('Submit error:', err); showAlert('error', `Result error: ${err.message}`); } }
    function toggleRecommendations(btn) { const l = btn.nextElementSibling; if (l?.classList.contains('recommendations-list')) { l.classList.toggle('active'); btn.textContent = l.classList.contains('active') ? 'Hide Recs' : 'Show Recs'; } }
    function shareOnWhatsApp() { const lr = allResults[allResults.length - 1]; if (!lr?.studentData?.result) { showAlert('error', 'No data.'); return; } const n = lr.studentData['student-name'] || 'N/A'; const g = lr.standard || 'N/A'; const s = lr.summary || 'N/A'; const a = lr.result.analysis || 'N/A'; const rs = lr.result.recommendations?.map((r, i) => `${i + 1}. ${r}`).join('\n') || 'N/A'; const b = getClientBranding(); const c = b?.phone ? `Contact: ${b.name} at ${b.phone}` : ''; const txt = `*Results*\n\n*Student:* ${n}\n*Grade:* ${g}\n\n*Summary:* ${s}\n*Analysis:* ${a}\n\n*Recs:*\n${rs}\n\n${c}`; window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank'); }
    function copyResultCode() { const lr = allResults[allResults.length - 1]; if (!lr?.studentData?.result) { showAlert('error', 'No data.'); return; } const n = lr.studentData['student-name'] || 'N/A'; const g = lr.standard || 'N/A'; const dt = lr.date || 'N/A'; const sm = lr.summary || 'N/A'; const an = lr.result.analysis || 'N/A'; const rs = lr.result.recommendations?.map((r, i) => `${i + 1}. ${r}`).join('\n') || 'N/A'; const sc = lr.result.scores ? Object.entries(lr.result.scores).map(([k, v]) => `${k[0].toUpperCase() + k.slice(1)}: ${v}`).join(', ') : 'N/A'; const txt = `Results\n---\nStudent: ${n}\nGrade: ${g}\nDate: ${dt}\nScores: ${sc}\nSummary: ${sm}\nAnalysis: ${an}\nRecs:\n${rs}\n---`; navigator.clipboard.writeText(txt).then(() => showAlert('success', 'Copied.'), () => showAlert('error', 'Copy failed.')); }
    function downloadCertificate() { if (typeof window.jspdf?.jsPDF === 'undefined') { showAlert('error', 'PDF lib error.'); return; } const { jsPDF } = window.jspdf; if (allResults.length === 0) { showAlert('error', 'No results.'); return; } const lr = allResults[allResults.length - 1]; if (!lr?.studentData?.result) { showAlert('error', 'Incomplete data.'); return; } const doc = new jsPDF({ o: 'l', u: 'mm', f: 'a4' }); const b = getClientBranding() || { name: 'App Name', address: 'N/A', phone: 'N/A' }; const sN = lr.studentData['student-name'] || 'Student'; const gr = lr.standard || 'N/A'; const dt = lr.date || 'N/A'; const sum = lr.summary || 'Completed'; try { doc.setDrawColor(27, 59, 111); doc.setLineWidth(1); doc.rect(10, 10, 277, 190); doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(27, 59, 111); doc.text(b.name.toUpperCase(), 148.5, 35, { align: 'center' }); doc.setFont('helvetica', 'normal'); doc.setFontSize(14); doc.setTextColor(107, 114, 128); doc.text('Certificate of Achievement', 148.5, 45, { align: 'center' }); doc.setDrawColor(244, 162, 97); doc.setLineWidth(0.5); doc.line(40, 55, 257, 55); doc.setFontSize(16); doc.setTextColor(31, 42, 68); doc.text('Awarded to', 148.5, 75, { align: 'center' }); doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(27, 59, 111); doc.text(sN.toUpperCase(), 148.5, 90, { align: 'center' }); doc.setFont('helvetica', 'normal'); doc.setFontSize(14); doc.setTextColor(31, 42, 68); const dsc = `Completed assessment for Grade ${gr}.`; doc.text(dsc, 148.5, 105, { align: 'center' }); doc.setFontSize(12); doc.setTextColor(107, 114, 128); doc.text(`Summary: ${sum}`, 148.5, 125, { align: 'center' }); doc.text(`Date: ${dt}`, 148.5, 135, { align: 'center' }); doc.setFontSize(10); doc.text(`Issued by: ${b.name}`, 148.5, 165, { align: 'center' }); doc.setTextColor(107, 114, 128); doc.text(`Powered by App Name`, 148.5, 175, { align: 'center' }); doc.save(`Cert_${sN}.pdf`); showAlert('success', 'Cert downloaded.'); } catch (err) { console.error("PDF error:", err); showAlert('error', 'Cert gen failed.'); } }

    // --- Admin Section Logic ---
    function showAdminDashboard() { console.log('Showing admin.'); const aS=document.getElementById('admin-section'); const rT=document.querySelector('#results-table tbody'); const sT=document.querySelector('#student-info-table tbody'); if(!aS||!rT||!sT) {showAlert('error','Admin UI missing.'); return;} if(allResults.length > 0 || allStudentInfo.length > 0) showAlert('critical-warning', 'Local data detected. Export regularly.'); else showAlert('info','No local data.'); aS.classList.remove('hidden'); rT.innerHTML = allResults.map(e => `<tr><td>${e.studentData?.['student-name']||''}</td><td>${e.standard||''}</td><td>${e.date||''}</td><td>${e.summary||''}</td></tr>`).join(''); sT.innerHTML = allStudentInfo.map(i => `<tr><td>${i.studentName||''}</td><td>${i.parentName||''}</td><td>${i.mobile||''}</td><td>${i.email||''}</td><td>${i.school||''}</td><td>${i.age||''}</td><td>${i.board||''}</td><td>${i.standard||''}</td><td>${i.medium||''}</td></tr>`).join(''); updateBrandingThroughout(); }
    function clearReports() { if(!allResults.length){showAlert('info','No results.');return;} if(confirm('Clear results? Export first.')){ if(confirm('CONFIRM: Delete results?')){allResults=[]; saveResults(); showAdminDashboard(); showAlert('success','Results cleared.');}}}
    function exportAllToExcel() { if(!allResults.length){showAlert('error','No results.');return;} let h=['Name','Parent','Mobile','Email','Age','Board','Grade','Lang','Date','Summ','Analysis']; const hasHG=allResults.some(r=>parseInt(r.standard)>=9); if(hasHG) h.push('R','I','A','S','E','C'); const hasLG=allResults.some(r=>parseInt(r.standard)<=8 && r.result?.scores?.percentage!==undefined); if(hasLG) h.push('Pct'); h.push('Recs'); let csv=h.join(',')+'\n'; allResults.forEach(r=>{ const s=r.studentData||{}; const re=r.result||{}; const sc=re.scores||{}; let rd=[s['student-name']||'',s['parent-name']||'',s['mobile']||'',s['email']||'',s['age']||'',s['board']||'',r.standard||'',r.language||'',r.date||'',r.summary||'',(re.analysis||'').replace(/[\r\n,"]/g,' ')]; if(hasHG){ if(parseInt(r.standard)>=9) rd.push(sc.realistic??'',sc.investigative??'',sc.artistic??'',sc.social??'',sc.enterprising??'',sc.conventional??''); else rd.push('','','','','',''); } if(hasLG){ if(parseInt(r.standard)<=8 && sc.percentage!==undefined) rd.push(sc.percentage??''); else rd.push(''); } rd.push((re.recommendations||[]).join('; ').replace(/[,"]/g,' ')); csv+=rd.map(f=>`"${String(f).replace(/"/g,'""')}"`).join(',')+'\n'; }); const b=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const l=document.createElement('a'); const u=URL.createObjectURL(b); l.setAttribute('href',u); const ts=new Date().toISOString().replace(/[:.]/g,'-'); l.setAttribute('download',`Results_${ts}.csv`); l.style.visibility='hidden'; document.body.appendChild(l); l.click(); document.body.removeChild(l); URL.revokeObjectURL(u); showAlert('success','Results exported.'); }
    function submitStudentInfo() { const sN=document.getElementById('info-student-name')?.value.trim(); const pN=document.getElementById('info-parent-name')?.value.trim(); const m=document.getElementById('info-mobile')?.value.trim(); const e=document.getElementById('info-email')?.value.trim(); const sch=document.getElementById('info-school')?.value.trim(); const aI=document.getElementById('info-age'); const b=document.getElementById('info-board')?.value; const st=document.getElementById('info-standard')?.value; const med=document.getElementById('info-medium')?.value; if(!sN||!pN||!m||!e||!sch||!aI?.value||!b||!st||!med) {showAlert('error','Fill fields.'); return;} const age=parseInt(aI.value,10); if(isNaN(age)||age<5||age>25) {showAlert('error','Valid age.'); return;} if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {showAlert('error','Valid email.'); return;} if(!/^\d{10}$/.test(m)) {showAlert('error','Valid mobile.'); return;} const sI={studentName:sN,parentName:pN,mobile:m,email:e,school:sch,age,board:b,standard:st,medium:med,timestamp:new Date().toISOString()}; allStudentInfo.push(sI); saveStudentInfo(); showAdminDashboard(); document.getElementById('info-student-name').value=''; document.getElementById('info-parent-name').value=''; document.getElementById('info-mobile').value=''; document.getElementById('info-email').value=''; document.getElementById('info-school').value=''; document.getElementById('info-age').value=''; document.getElementById('info-board').value=''; document.getElementById('info-standard').value=''; document.getElementById('info-medium').value=''; showAlert('success','Info saved.'); }
    function exportStudentInfoToCSV() { if(!allStudentInfo.length){showAlert('error','No info.');return;} let h=['Name','Parent','Mobile','Email','School','Age','Board','Std','Medium','Timestamp']; let csv=h.join(',')+'\n'; allStudentInfo.forEach(i=>{const r=[i.studentName,i.parentName,i.mobile,i.email,i.school,i.age,i.board,i.standard,i.medium,i.timestamp||'']; csv+=r.map(f=>`"${String(f).replace(/"/g,'""')}"`).join(',')+'\n';}); const b=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const l=document.createElement('a'); const u=URL.createObjectURL(b); l.setAttribute('href',u); const ts=new Date().toISOString().replace(/[:.]/g,'-'); l.setAttribute('download',`StudentInfo_${ts}.csv`); l.style.visibility='hidden'; document.body.appendChild(l); l.click(); document.body.removeChild(l); URL.revokeObjectURL(u); showAlert('success','Info exported.'); }
    function clearStudentInfo() { if(!allStudentInfo.length){showAlert('info','No info.');return;} if(confirm('Clear info? Export first.')){if(confirm('CONFIRM: Delete info?')){allStudentInfo=[]; saveStudentInfo(); showAdminDashboard(); showAlert('success','Info cleared.');}}}

    // plan.js (Corrected - No extra brace at end)

// Development Plan Templates (Bilingual: English | Marathi)
const developmentPlans = {
    '5-8': {
        low: { text: `Plan (Grades 5-8, Low Score)\nStudent: {{studentName}}, Age: {{age}}, Std: {{standard}}\n\nObjective: Build basics.\n\nActivities:\n- Game: Chess (1hr/wk)\n- Book: Panchatantra (1 story/wk)\n- YouTube: Chhota Bheem (1 ep/wk)\n- Outdoor: Plant Tulsi\n- School: Drawing Club\n- Craft: Paper Boat\n- Paint: Flower\n- Exercise: Skip Rope (10min/day)\n\nParent Tips:\n- Study Time: 1.5hr/day\n- Read Together: Panchatantra\n- Help With: Diwali Diya\n- Discuss: Chhota Bheem values\n- Praise: Drawing efforts\n` },
        medium: { text: `Plan (Grades 5-8, Medium Score)\nStudent: {{studentName}}, Age: {{age}}, Std: {{standard}}\n\nObjective: Strengthen skills.\n\nActivities:\n- Game: Kabaddi (1.5hr/wk)\n- Book: Tinkle (5 pages/wk)\n- YouTube: Vigyan Prasar (2 videos/month)\n- Outdoor: Plant Neem\n- School: Science Club\n- Craft: Diwali Diya (2)\n- Paint: Rangoli\n- Exercise: Surya Namaskar (8 rounds/day)\n\nParent Tips:\n- Study Time: 2hr/day\n- Read Together: Tinkle\n- Help With: Diwali Diyas\n- Discuss: Bharat Ek Khoj\n- Praise: Science projects\n` },
        high: { text: `Plan (Grades 5-8, High Score)\nStudent: {{studentName}}, Age: {{age}}, Std: {{standard}}\n\nObjective: Enhance advanced skills.\n\nActivities:\n- Game: Kabaddi (2hr/wk)\n- Book: Art of Problem Solving (5 pages/wk)\n- YouTube: Khan Academy India (2 videos/wk)\n- Outdoor: Plant Fruit Tree\n- School: Robotics Club\n- Craft: Paper Lantern\n- Paint: Mandala (3)\n- Exercise: Badminton (1hr, 3x/wk)\n\nParent Tips:\n- Study Time: 2.5hr/day\n- Read Together: Problem Solving book\n- Help With: Diwali Lantern\n- Discuss: Khan Academy\n- Praise: Leadership (Robotics)\n` }
    },
    '9-10': {
        low: { text: `Plan (Grades 9-10, Low Score)\nStudent: {{studentName}}, Age: {{age}}, Std: {{standard}}\n\nObjective: Build study habits & confidence.\n\nActivities:\n- Game: Carrom (1hr/wk)\n- Book: Ignited Minds (3 pages/day)\n- YouTube: Unacademy (1 video/wk)\n- Outdoor: Plant Neem\n- School: Study Group\n- Craft: Rakhi\n- Paint: Rangoli\n- Exercise: Skip Rope (15min/day)\n\nParent Tips:\n- Study Time: 2hr/day\n- Read Together: Ignited Minds\n- Help With: Rakhi\n- Discuss: Unacademy videos\n- Praise: Study group efforts\n` },
        medium: { text: `Plan (Grades 9-10, Medium Score)\nStudent: {{studentName}}, Age: {{age}}, Std: {{standard}}\n\nObjective: Prepare for boards, explore careers.\n\nActivities:\n- Game: Cricket (2hr/wk)\n- Book: Wings of Fire (5 pages/day)\n- YouTube: Unacademy JEE Prep (2 videos/wk)\n- Outdoor: Tree Plantation Drive\n- School: Debate Team\n- Craft: Ganesh Idol\n- Paint: Freedom Fighter Portrait\n- Exercise: Yoga (15min/day)\n\nParent Tips:\n- Study Time: 3hr/day\n- Read Together: Wings of Fire\n- Help With: Ganesh Idol\n- Discuss: ISRO Lectures\n- Praise: Debate practice\n` },
        high: { text: `Plan (Grades 9-10, High Score)\nStudent: {{studentName}}, Age: {{age}}, Std: {{standard}}\n\nObjective: Excel in boards, plan career.\n\nActivities:\n- Game: Chess (3hr/wk)\n- Book: India After Gandhi (10 pages/wk)\n- YouTube: ISRO Lectures (2 videos/month)\n- Outdoor: Lead Plantation Drive\n- School: Lead Debate Team\n- Craft: Tricolor Flag (2)\n- Paint: India Map (mark historical sites)\n- Exercise: Run (30min/day)\n\nParent Tips:\n- Study Time: 3.5hr/day\n- Read Together: Discovery of India\n- Help With: School Play Direction\n- Discuss: Khan Academy advanced topics\n- Praise: Leadership (Debate)\n` }
    }
};

function generateDevelopmentPlan() {
    // Retrieve inputs
    const studentNameInput = document.getElementById('plan-student-name');
    const ageInput = document.getElementById('plan-age');
    const standardInput = document.getElementById('plan-standard');
    const scoreInput = document.getElementById('plan-score');

    // Check if inputs exist
    if (!studentNameInput || !ageInput || !standardInput || !scoreInput) {
        console.error('One or more input elements not found:', { studentNameInput, ageInput, standardInput, scoreInput });
        // Use showAlert if available, otherwise console.error
        if (typeof showAlert === 'function') showAlert('error', 'Form elements are missing.'); else console.error('Form elements are missing.');
        return;
    }

    const studentName = studentNameInput.value.trim();
    const age = parseInt(ageInput.value, 10);
    const standard = parseInt(standardInput.value, 10);
    const score = parseFloat(scoreInput.value);

    console.log('Inputs:', { studentName, age, standard, score });

    // Validate inputs
    if (!studentName || isNaN(age) || isNaN(standard) || !standardInput.value || isNaN(score)) {
        console.log('Validation failed: Incomplete or invalid inputs');
        if (typeof showAlert === 'function') showAlert('error', 'Please fill in all fields with valid values.'); else console.error('Please fill in all fields with valid values.');
        return;
    }
    if (age < 10 || age > 18) { console.log('Validation failed: Invalid age'); if (typeof showAlert === 'function') showAlert('error', 'Age must be between 10 and 18.'); else console.error('Age must be between 10 and 18.'); return; }
    if (score < 0 || score > 100) { console.log('Validation failed: Invalid score'); if (typeof showAlert === 'function') showAlert('error', 'Score must be between 0 and 100.'); else console.error('Score must be between 0 and 100.'); return; }

    // Get branding (with fallback)
    let branding;
    try { branding = window.getClientBranding() || { name: 'Psychometrica Pro Plus', address: 'N/A', phone: 'N/A' }; console.log('Branding:', branding); }
    catch (e) { console.error('Error getting branding:', e); branding = { name: 'Psychometrica Pro Plus', address: 'N/A', phone: 'N/A' }; }

    // Select template
    const gradeGroup = standard <= 8 ? '5-8' : '9-10';
    const scoreRange = score > 80 ? 'high' : score > 60 ? 'medium' : 'low';
    const planTemplate = developmentPlans[gradeGroup]?.[scoreRange]?.text;

    if (!planTemplate) { console.error('Plan template not found for:', { gradeGroup, scoreRange }); if (typeof showAlert === 'function') showAlert('error', 'Unable to generate plan. Template not found.'); else console.error('Unable to generate plan. Template not found.'); return; }

    // Generate personalized plan
    const personalizedPlan = planTemplate
        .replace(/{{studentName}}/g, studentName)
        .replace(/{{age}}/g, age)
        .replace(/{{standard}}/g, standard)
        .replace(/{{branding\.name}}/g, branding.name)
        .replace(/{{branding\.address}}/g, branding.address)
        .replace(/{{branding\.phone}}/g, branding.phone);

    // Display plan
    const planSection = document.getElementById('development-plan-section');
    const planTextElement = document.getElementById('plan-text');

    if (!planSection || !planTextElement) { console.error('Plan display elements not found:', { planSection, planTextElement }); if (typeof showAlert === 'function') showAlert('error', 'Unable to display plan.'); else console.error('Unable to display plan.'); return; }

    planTextElement.textContent = personalizedPlan;
    planSection.classList.remove('hidden'); // Make the *outer section* visible
    console.log('Plan displayed successfully');

    if (typeof showAlert === 'function') showAlert('success', 'Development plan generated successfully.'); else console.log('Development plan generated successfully.');
}

function copyPlan() {
    const planText = document.getElementById('plan-text')?.textContent;
    if (planText) {
        navigator.clipboard.writeText(planText.trim()).then(() => {
            if (typeof showAlert === 'function') showAlert('success', 'Plan copied.'); else console.log('Plan copied.');
        }).catch(() => {
            if (typeof showAlert === 'function') showAlert('error', 'Copy failed.'); else console.error('Copy failed.');
        });
    } else {
        if (typeof showAlert === 'function') showAlert('error', 'No plan to copy.'); else console.error('No plan to copy.');
    }
}

// Expose functions to window
console.log("plan.js: Assigning functions to window...");
window.generateDevelopmentPlan = generateDevelopmentPlan;
window.copyPlan = copyPlan;
console.log("plan.js: Functions assigned.");
// NO EXTRA BRACE AT THE END OF THIS FILE

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
    window.getClientBranding = getClientBranding;

    // Assign merged plan functions
    window.generateDevelopmentPlan = generateDevelopmentPlan;
    window.copyPlan = copyPlan;

    // NOTE: showAlert is defined globally above.

    console.log('SCRIPT INFO: Initializing application state...');
    loadResults();
    loadStudentInfo();
    resetUI(); // Start at login screen

    console.log("SCRIPT END: Initialization complete.");
}); // End of DOMContentLoaded
