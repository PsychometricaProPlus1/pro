// script.js - Frontend for Psychometrica Pro Plus (v4 - Worker Auth + Local Save)
// Handles UI interactions, test flow. Connects to Cloudflare Worker for Auth + Branding.
// Saves results LOCALLY in the browser only.
// !! IMPORTANT: Still requires worker updates for SESSION PERSISTENCE (Tokens/checkSession) if needed. !!

document.addEventListener('DOMContentLoaded', () => {
    console.log("SCRIPT START: DOMContentLoaded event fired.");

    // --- Configuration ---
    const BACKEND_URL = 'https://my-auth-worker.equimedia4.workers.dev'; // Your Worker URL
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

    // --- Info Fields Configuration (Keep as is) ---
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
    // Utility Functions (Keep showAlert, load/saveResults, load/saveStudentInfo, resetUI as previously defined)
    // ========================================================================
    function showAlert(type, message) {
        console.log(`ALERT (${type}): ${message}`);
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) existingAlert.remove();
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        document.body.insertBefore(alertDiv, document.body.firstChild);
        setTimeout(() => {
            alertDiv.style.opacity = '0';
            setTimeout(() => alertDiv.remove(), 500);
        }, 4000);
    }

    function loadResults() {
        try {
            const storedResults = localStorage.getItem(RESULTS_STORAGE_KEY);
            allResults = storedResults ? JSON.parse(storedResults) : [];
            console.log('Loaded results count:', allResults.length);
        } catch (error) {
            console.error('Error loading results from localStorage:', error);
            allResults = [];
            showAlert('error', 'Failed to load previous results.');
        }
    }

    function saveResults() {
        try {
            localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(allResults));
            console.log('Results saved to localStorage:', allResults.length);
        } catch (error) {
            console.error('Error saving results to localStorage:', error);
            showAlert('error', 'Failed to save results.');
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
            showAlert('error', 'Failed to load student information.');
        }
    }

    function saveStudentInfo() {
        try {
            localStorage.setItem(STUDENT_INFO_STORAGE_KEY, JSON.stringify(allStudentInfo));
            console.log('Student info saved to localStorage:', allStudentInfo.length);
        } catch (error) {
            console.error('Error saving student info to localStorage:', error);
            showAlert('error', 'Failed to save student information.');
        }
    }

    function resetUI() {
        console.log('Resetting UI to login screen.');
        // Clear session storage related to login
        sessionStorage.removeItem('sessionToken'); // Clear token if any exists
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

        currentInfoStep = 0;
        currentQuestionIndex = 0;
        userAnswers = {};
        studentData = {};
        selectedStandard = '';
        selectedLanguage = '';
    }


    // --- Branding Functions (dependent on data from login) ---
    function getClientBranding() {
        const brandingString = sessionStorage.getItem('clientBranding');
        try {
            return brandingString ? JSON.parse(brandingString) : null;
        } catch (e) {
            console.error("Error parsing branding info from sessionStorage:", e);
            sessionStorage.removeItem('clientBranding');
            return null;
        }
    }

    function updateBrandingThroughout() {
        console.log('Attempting to update branding on visible sections...');
        const branding = getClientBranding();
        if (!branding || !branding.name) {
            console.warn("No valid branding info found in sessionStorage to update UI.");
            return;
        }
        console.log("Using branding:", branding);
        const sections = [
            'standard-selection', 'language-selection', 'info-section',
            'instructions-section', 'test-section', 'results-section', 'admin-section'
        ];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section && !section.classList.contains('hidden')) {
                console.log("Updating branding for section:", sectionId);
                let existingBrandingFooter = section.querySelector('.branding-footer');
                if (existingBrandingFooter) existingBrandingFooter.remove();
                const brandingDiv = document.createElement('div');
                brandingDiv.className = 'branding-footer';
                brandingDiv.innerHTML = `
                    <p>${branding.name}, ${branding.address || 'Address N/A'} | <i class="fas fa-phone"></i> ${branding.phone || 'Phone N/A'}</p>
                `;
                section.appendChild(brandingDiv);
            }
        });
        const resultsSection = document.getElementById('results-section');
        if (resultsSection && !resultsSection.classList.contains('hidden')) {
            const contactMessageP = resultsSection.querySelector('.contact-message p');
            if (contactMessageP) {
                contactMessageP.innerHTML = `For detailed discussion and counseling regarding your child's progress plan, please contact ${branding.name} at <i class="fas fa-phone"></i> <strong>${branding.phone || 'N/A'}</strong>. Share your result with admin now for further processing.`;
            }
        }
    }

    function showWelcomeScreen() {
        console.log('showWelcomeScreen: Function called.');
        const branding = getClientBranding();
        const userRole = sessionStorage.getItem('userRole');
        // Skip welcome if no branding, proceed directly to navigation
        if (!branding || !branding.name) {
            console.warn('showWelcomeScreen: Skipping welcome screen: No branding info.');
            handlePostLoginNavigation(userRole);
            return;
        }
        const container = document.querySelector('.container');
        if (!container) {
            console.error("showWelcomeScreen: Container not found.");
            handlePostLoginNavigation(userRole); // Proceed without welcome
            return;
        }
        const existingWelcome = document.getElementById('welcome-section');
        if (existingWelcome) existingWelcome.remove();

        const welcomeSection = document.createElement('section');
        welcomeSection.id = 'welcome-section';
        welcomeSection.innerHTML = `
            <h2>Welcome to ${branding.name}</h2>
            <p>${branding.address || 'Address not available'}</p>
            <p><i class="fas fa-phone"></i> ${branding.phone || 'Contact not available'}</p>
        `;
        const header = container.querySelector('header');
        if (header) header.insertAdjacentElement('afterend', welcomeSection);
        else container.insertBefore(welcomeSection, container.firstChild);
        welcomeSection.classList.remove('hidden');
        console.log('showWelcomeScreen: Welcome section displayed.');

        setTimeout(() => {
            welcomeSection.classList.add('exiting');
            setTimeout(() => {
                welcomeSection.remove();
                const roleForNav = sessionStorage.getItem('userRole');
                handlePostLoginNavigation(roleForNav);
            }, 400);
        }, 3000);
    }

    function handlePostLoginNavigation(role) {
        console.log(`handlePostLoginNavigation: Function called with role: "${role}"`);
        const loginSection = document.getElementById('login-section');
        if (loginSection) loginSection.classList.add('hidden'); // Ensure login is hidden

        if (role === 'admin') {
            console.log("Navigating to Admin Dashboard.");
            showAdminDashboard();
        } else if (role === 'user') {
            console.log("Navigating to Standard Selection.");
            const standardSection = document.getElementById('standard-selection');
            if (standardSection) {
                standardSection.classList.remove('hidden');
                updateBrandingThroughout(); // Update branding now that section is visible
            } else {
                console.error('Standard selection section (#standard-selection) not found!');
                showAlert('error', 'Error navigating to the next step.');
                resetUI();
            }
        } else {
            console.warn(`Unknown or null role ("${role}"), navigating back to login.`);
            resetUI();
        }
    }


    // ========================================================================
    // Authentication & Session Management (Worker Auth, No Session Persistence)
    // ========================================================================

    async function login() {
        console.log("login() function started...");
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        if (!usernameInput || !passwordInput) { showAlert('error', 'Login form elements missing.'); return; }
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        if (!username || !password) { showAlert('error', 'Enter username and password.'); return; }

        const payload = { username, password }; // Worker expects JSON body
        console.log('DEBUG: Payload being sent to Worker:', JSON.stringify(payload));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        try {
            const response = await fetch(BACKEND_URL, {
                method: 'POST', mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload), signal: controller.signal
            });
            clearTimeout(timeoutId);
            console.log('Login response status:', response.status);

            if (response.status === 401) { // Explicit check for unauthorized
                const result = await response.json().catch(() => ({}));
                showAlert('error', result?.error || 'Invalid username or password.');
                resetUI(); // Go back to login on failure
                return;
            }
            if (!response.ok) { // Handle other server errors
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // If response is OK (200), parse role and branding
            const result = await response.json();
            console.log('Login API response parsed:', result);

            if (result && result.success === true && result.role) {
                showAlert('success', 'Login Successful!');
                // Store role and branding from response
                sessionStorage.setItem('userRole', result.role);
                if (result.branding) {
                    sessionStorage.setItem('clientBranding', JSON.stringify(result.branding));
                } else {
                    sessionStorage.removeItem('clientBranding');
                }
                // ** No token is stored or expected **
                sessionStorage.removeItem('sessionToken'); // Ensure no old token persists

                const loginSection = document.getElementById('login-section');
                 if (loginSection) loginSection.classList.add('hidden'); // Hide login section
                showWelcomeScreen(); // Show welcome, which will then navigate

            } else {
                // Handle cases where worker responds 200 OK but success is false or role missing
                showAlert('error', result?.error || 'Login validation failed.');
                resetUI();
            }

        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Login fetch/processing error:', error);
            showAlert('error', error.name === 'AbortError' ? 'Login timed out.' : 'Login failed. Connection/Server error.');
            resetUI();
        }
    }

    // ** checkUserSession is removed because no token = no session to check **

    function confirmLogout() {
        if (confirm('Are you sure you want to logout?')) {
            console.log('Logging out user.');
            resetUI(); // Resets UI and clears session storage
            showAlert('success', 'You have been logged out.');
        }
    }

    // ========================================================================
    // Test Flow Logic (submitTest modified to NOT send results to backend)
    // ========================================================================

    function showLanguageSelection() {
        const standardSelect = document.getElementById('standard');
        selectedStandard = standardSelect?.value;
        if (!selectedStandard) { showAlert('error', 'Please select a grade.'); return; }
        console.log('Selected standard:', selectedStandard);
        const standardSection = document.getElementById('standard-selection');
        const languageSection = document.getElementById('language-selection');
        if (standardSection && languageSection) {
            standardSection.classList.add('hidden');
            languageSection.classList.remove('hidden');
            updateBrandingThroughout();
        } else { showAlert('error', 'Error navigating to language selection.'); }
    }

    function startTest(language) {
        selectedLanguage = language; console.log('Selected language:', selectedLanguage);
        studentData.grade = selectedStandard;
        const languageSection = document.getElementById('language-selection');
        const infoSection = document.getElementById('info-section');
        if (languageSection && infoSection) {
            languageSection.classList.add('hidden');
            infoSection.classList.remove('hidden');
            currentInfoStep = 0; loadInfoStep(currentInfoStep);
            updateBrandingThroughout();
        } else { showAlert('error', 'Error navigating to student information.'); }
    }

    function loadInfoStep(stepIndex) {
        // (Keep existing loadInfoStep logic as is)
         const infoStepDiv = document.getElementById('info-step');
        const backBtn = document.getElementById('info-back-btn');
        const nextBtn = document.getElementById('info-next-btn');
        if (!infoStepDiv || !backBtn || !nextBtn) { showAlert('error', 'Info section elements not found.'); return; }
        const field = infoFields[stepIndex]; const isMarathi = selectedLanguage === 'marathi';
        infoStepDiv.innerHTML = `<div class="form-group"><label for="${field.id}">${isMarathi ? field.labelMr : field.labelEn}:</label>${field.type === 'select' ? `<select id="${field.id}" aria-label="${isMarathi ? field.labelMr : field.labelEn}" ${field.id === 'grade' ? 'readonly' : ''}>${field.options.map(opt => `<option value="${opt.value}" ${opt.value === (field.id === 'grade' ? selectedStandard : '') ? 'selected' : ''}>${isMarathi ? opt.textMr : opt.textEn}</option>`).join('')}</select>` : `<input type="${field.type}" id="${field.id}" placeholder="${isMarathi ? field.labelMr : field.labelEn}" aria-label="${isMarathi ? field.labelMr : field.labelEn}" ${field.id === 'grade' ? 'value="' + selectedStandard + '" readonly' : ''} ${field.type === 'number' ? 'min="' + (field.id === 'age' ? '10' : '0') + '" max="' + (field.id === 'age' ? '18' : '100') + '"' : ''}>`}</div>`;
        if (field.id === 'grade') { const gradeInput = document.getElementById('grade'); if (gradeInput) { infoStepDiv.innerHTML = `<div class="form-group"><label>${isMarathi ? field.labelMr : field.labelEn}:</label><p style="padding: 10px; border: 1px solid #ddd; background-color: #eee; border-radius: 8px;">${selectedStandard}</p><input type="hidden" id="grade" value="${selectedStandard}"></div>`; } }
        backBtn.style.display = stepIndex === 0 ? 'none' : 'inline-block';
        nextBtn.textContent = stepIndex === infoFields.length - 1 ? 'Submit' : 'Next';
    }

    function nextInfoStep() {
         // (Keep existing nextInfoStep logic as is)
         const field = infoFields[currentInfoStep]; const input = document.getElementById(field.id); let value = input?.value?.trim();
         if (field.id === 'grade') { value = selectedStandard; } else if (!value) { showAlert('error', `Please enter ${selectedLanguage === 'marathi' ? field.labelMr : field.labelEn}.`); return; }
         if (field.id === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { showAlert('error', 'Please enter a valid email.'); return; }
         if (field.id === 'mobile' && value && !/^\d{10}$/.test(value)) { showAlert('error', 'Please enter a valid 10-digit mobile number.'); return; }
         if (field.id === 'age' && value) { const ageNum = parseInt(value); if (isNaN(ageNum) || ageNum < 10 || ageNum > 18) { showAlert('error', 'Age must be between 10 and 18.'); return; } }
         studentData[field.id] = value; currentInfoStep++;
         if (currentInfoStep < infoFields.length) { loadInfoStep(currentInfoStep); }
         else { const infoSection = document.getElementById('info-section'); const instructionsSection = document.getElementById('instructions-section');
             if (infoSection && instructionsSection) { infoSection.classList.add('hidden'); instructionsSection.classList.remove('hidden');
                 const instructionsContent = document.getElementById('instructions-content');
                 if (instructionsContent) { instructionsContent.innerHTML = selectedLanguage === 'marathi' ? `<p>प्रिय विद्यार्थी,</p><p>सूचना वाचा:</p><ul><li>प्रामाणिकपणे उत्तरे द्या.</li><li>योग्य पर्याय निवडा.</li><li>वेळेची मर्यादा नाही.</li><li>पूर्ण झाल्यावर निकाल मिळेल.</li></ul><p>शुभेच्छा!</p>` : `<p>Dear Student,</p><p>Instructions:</p><ul><li>Answer honestly.</li><li>Select option.</li><li>No time limit.</li><li>Results upon completion.</li></ul><p>Best of luck!</p>`; }
                 updateBrandingThroughout();
             } else { showAlert('error', 'Error navigating to instructions.'); }
         }
    }

    function previousInfoStep() {
         // (Keep existing previousInfoStep logic as is)
         if (currentInfoStep > 0) { currentInfoStep--; loadInfoStep(currentInfoStep); }
    }

    function goBack(currentSectionId) {
         // (Keep existing goBack logic as is)
         const currentSection = document.getElementById(currentSectionId); let prevSectionId;
         switch (currentSectionId) { case 'language-selection': prevSectionId = 'standard-selection'; break; case 'info-section': prevSectionId = 'language-selection'; break; case 'instructions-section': prevSectionId = 'info-section'; currentInfoStep = infoFields.length - 1; loadInfoStep(currentInfoStep); break; default: return; }
         const prevSection = document.getElementById(prevSectionId); if (currentSection && prevSection) { currentSection.classList.add('hidden'); prevSection.classList.remove('hidden'); updateBrandingThroughout(); } else { showAlert('error', 'Error navigating back.'); }
    }

    function showTest() {
         // (Keep existing showTest logic as is)
         const instructionsSection = document.getElementById('instructions-section'); const testSection = document.getElementById('test-section');
         if (instructionsSection && testSection) { instructionsSection.classList.add('hidden'); testSection.classList.remove('hidden'); currentQuestionIndex = 0; userAnswers = {}; loadQuestion(currentQuestionIndex); updateBrandingThroughout(); } else { showAlert('error', 'Error navigating to test.'); }
    }

    function loadQuestion(index) {
         // (Keep existing loadQuestion logic as is)
         const questions = selectedStandard <= 8 ? window.questions5to8?.[selectedLanguage] : window.questions9to10?.[selectedLanguage]; if (!questions) { showAlert('error', 'Questions not found.'); return; } const question = questions[index]; const questionsDiv = document.getElementById('questions'); if (!question || !questionsDiv) { showAlert('error', 'Error loading question.'); return; } questionsDiv.innerHTML = `<div class="question"><p>${question.text}</p><div class="options">${question.options.map((option, i) => `<label><input type="radio" name="q${index}" value="${option}" ${userAnswers[index] === option ? 'checked' : ''}><span>${option}</span></label>`).join('')}</div></div>`; updateProgressAndButtons(index, questions.length);
    }

    function updateProgressAndButtons(currentIndex, totalQuestions) {
         // (Keep existing updateProgressAndButtons logic as is)
         const progressFill = document.getElementById('progress-fill'); const progressText = document.getElementById('progress-text'); const backBtn = document.getElementById('back-btn'); const nextBtn = document.getElementById('next-btn'); const submitBtn = document.getElementById('submit-btn'); if (progressFill && progressText && backBtn && nextBtn && submitBtn) { const progress = ((currentIndex + 1) / totalQuestions) * 100; progressFill.style.width = `${progress}%`; progressText.textContent = `Question ${currentIndex + 1} of ${totalQuestions}`; backBtn.style.display = currentIndex === 0 ? 'none' : 'inline-block'; nextBtn.style.display = currentIndex === totalQuestions - 1 ? 'none' : 'inline-block'; submitBtn.style.display = currentIndex === totalQuestions - 1 ? 'inline-block' : 'none'; }
    }

    function nextQuestion() {
        // (Keep existing nextQuestion logic as is)
        const questions = selectedStandard <= 8 ? window.questions5to8?.[selectedLanguage] : window.questions9to10?.[selectedLanguage]; if (!questions) return; const selectedOption = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`); if (!selectedOption) { showAlert('error', 'Please select an option.'); return; } userAnswers[currentQuestionIndex] = selectedOption.value; currentQuestionIndex++; if (currentQuestionIndex < questions.length) loadQuestion(currentQuestionIndex);
    }

    function previousQuestion() {
        // (Keep existing previousQuestion logic as is)
         if (currentQuestionIndex > 0) { const selectedOption = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`); if (selectedOption) userAnswers[currentQuestionIndex] = selectedOption.value; currentQuestionIndex--; loadQuestion(currentQuestionIndex); }
    }

    // Modified submitTest: Removed backend saving fetch call
    async function submitTest() {
        const questions = selectedStandard <= 8 ? window.questions5to8?.[selectedLanguage] : window.questions9to10?.[selectedLanguage];
        if (!questions) { showAlert('error', 'Questions not found.'); return; }
        const selectedOption = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`);
        if (selectedOption) {
            userAnswers[currentQuestionIndex] = selectedOption.value;
        } else {
            showAlert('error', 'Please select an option for the last question.'); return;
        }

        try {
            const result = window.calculateResults(parseInt(selectedStandard), selectedLanguage, userAnswers);
            console.log('Calculated result:', result);
            const resultData = { studentData, result: result.detailedResult, date: result.date, summary: result.summary };

            // Save results LOCALLY only
            allResults.push(resultData);
            saveResults();
            console.log("Result saved locally.");

            // ** Backend fetch call REMOVED **

            // Display results locally
            const testSection = document.getElementById('test-section');
            const resultsSection = document.getElementById('results-section');
            const resultContent = document.getElementById('result-content');
            const trophySign = document.getElementById('trophy-sign');
            if (testSection && resultsSection && resultContent && trophySign) {
                testSection.classList.add('hidden');
                resultsSection.classList.remove('hidden');
                const isHighScore = selectedStandard <= 8 ? result.detailedResult.scores.percentage > 80 : (result.detailedResult.scores.realistic > 30 || result.detailedResult.scores.investigative > 30 || result.detailedResult.scores.artistic > 30);
                trophySign.classList.toggle('hidden', !isHighScore);
                resultContent.innerHTML = `
                    <div class="result-details">
                        <p><strong>Student Name:</strong> ${studentData['student-name']}</p>
                        <p><strong>Grade:</strong> ${studentData.grade}</p>
                        <p><strong>Date:</strong> ${result.date}</p>
                        <p><strong>Summary:</strong> ${result.summary}</p>
                        <p><strong>Analysis:</strong> ${result.detailedResult.analysis}</p>
                    </div>
                    <div class="recommendations-toggle">Show Recommendations</div>
                    <ul class="recommendations-list">
                        ${result.detailedResult.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                `;
                const toggleButton = resultContent.querySelector('.recommendations-toggle');
                if (toggleButton) { toggleButton.addEventListener('click', () => toggleRecommendations(toggleButton)); }
                updateBrandingThroughout(); // Update branding on results page
            } else { showAlert('error', 'Error displaying results.'); }
        } catch (error) {
            console.error('Error submitting test:', error);
            showAlert('error', 'Error calculating or displaying results.');
        }
    }

    function toggleRecommendations(toggleButton) {
        // (Keep existing toggleRecommendations logic as is)
        const recommendationsList = toggleButton.nextElementSibling; if (recommendationsList) { recommendationsList.classList.toggle('active'); toggleButton.textContent = recommendationsList.classList.contains('active') ? 'Hide Recommendations' : 'Show Recommendations'; }
    }

    function shareOnWhatsApp() {
        // (Keep existing shareOnWhatsApp logic as is, uses getClientBranding)
        const resultContent = document.getElementById('result-content'); if (!resultContent || allResults.length === 0) { showAlert('error', 'No results to share.'); return; } const lastResult = allResults[allResults.length - 1]; const recommendations = lastResult.result.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n'); const branding = getClientBranding(); const text = `Psychometrica Pro Plus Results\nStudent: ${studentData['student-name']}\nGrade: ${studentData.grade}\nSummary: ${lastResult.summary}\nAnalysis: ${lastResult.result.analysis}\nRecommendations:\n${recommendations}\nContact: ${branding?.phone || 'N/A'}`.trim(); window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }

    function copyResultCode() {
        // (Keep existing copyResultCode logic as is)
        const resultContent = document.getElementById('result-content'); if (!resultContent || allResults.length === 0) { showAlert('error', 'No results to copy.'); return; } const lastResult = allResults[allResults.length - 1]; const recommendations = lastResult.result.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n'); const text = `Psychometrica Pro Plus Results\nStudent: ${studentData['student-name']}\nGrade: ${studentData.grade}\nSummary: ${lastResult.summary}\nAnalysis: ${lastResult.result.analysis}\nRecommendations:\n${recommendations}`.trim(); navigator.clipboard.writeText(text).then(() => showAlert('success', 'Results copied.'), () => showAlert('error', 'Failed to copy.'));
    }

    function downloadCertificate() {
        // (Keep existing downloadCertificate logic as is, uses getClientBranding)
        const { jsPDF } = window.jspdf; if (!jsPDF) { showAlert('error', 'Library not loaded.'); return; } if (allResults.length === 0) { showAlert('error', 'No results for certificate.'); return; } const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); const branding = getClientBranding() || { name: 'Psychometrica Pro Plus', address: 'N/A', phone: 'N/A' }; const lastResult = allResults[allResults.length - 1]; const studentName = studentData?.['student-name'] || 'Student'; const grade = studentData?.grade || 'N/A'; const date = lastResult?.date || 'N/A'; const summary = lastResult?.summary || 'N/A'; try { doc.setFont('Poppins', 'normal'); } catch (e) { doc.setFont('Helvetica', 'normal'); } doc.setFontSize(12); doc.setTextColor(31, 42, 68); doc.setDrawColor(244, 162, 97); doc.setLineWidth(2); doc.rect(10, 10, 277, 190); doc.setDrawColor(27, 59, 111); doc.setLineWidth(1); doc.rect(15, 15, 267, 180); doc.setFontSize(22); try { doc.setFont('Poppins', 'bold'); } catch(e){ doc.setFont('Helvetica', 'bold'); } doc.setTextColor(27, 59, 111); doc.text(branding.name.toUpperCase(), 148.5, 30, { align: 'center' }); doc.setFontSize(14); try { doc.setFont('Poppins', 'normal'); } catch(e){ doc.setFont('Helvetica', 'normal'); } doc.setTextColor(107, 114, 128); doc.text('Certificate of Achievement', 148.5, 40, { align: 'center' }); doc.setFontSize(10); doc.setTextColor(31, 42, 68); const addressLines = doc.splitTextToSize(`Address: ${branding.address || 'N/A'}`, 80); let addressY = 20; addressLines.forEach(line => { doc.text(line, 267, addressY, { align: 'right' }); addressY += 5; }); doc.text(`Contact: ${branding.phone || 'N/A'}`, 267, addressY, { align: 'right' }); doc.setFillColor(42, 157, 143); doc.circle(20, 20, 3, 'F'); doc.circle(277, 20, 3, 'F'); doc.circle(20, 190, 3, 'F'); doc.circle(277, 190, 3, 'F'); doc.setDrawColor(244, 162, 97); doc.setLineWidth(0.5); doc.line(30, 50, 267, 50); doc.line(30, 180, 267, 180); doc.setFontSize(18); try { doc.setFont('Poppins', 'bold'); } catch(e){ doc.setFont('Helvetica', 'bold'); } doc.setTextColor(27, 59, 111); doc.text('Awarded to', 148.5, 70, { align: 'center' }); doc.setFontSize(24); doc.setTextColor(31, 42, 68); doc.text(studentName.toUpperCase(), 148.5, 85, { align: 'center' }); doc.setFontSize(14); try { doc.setFont('Poppins', 'normal'); } catch(e){ doc.setFont('Helvetica', 'normal'); } const description = 'For successfully completing the Psychometric Assessment'; const descLines = doc.splitTextToSize(description, 200); let descY = 100; descLines.forEach(line => { doc.text(line, 148.5, descY, { align: 'center' }); descY += 7; }); doc.setFontSize(12); doc.text(`Grade: ${grade}`, 148.5, descY + 10, { align: 'center' }); doc.text(`Date: ${date}`, 148.5, descY + 20, { align: 'center' }); doc.text(`Summary: ${summary}`, 148.5, descY + 30, { align: 'center' }); doc.setFontSize(12); try { doc.setFont('Poppins', 'bold'); } catch(e){ doc.setFont('Helvetica', 'bold'); } doc.setTextColor(27, 59, 111); doc.text(`Issued by: ${branding.name}`, 148.5, 165, { align: 'center' }); doc.setFontSize(10); doc.setTextColor(107, 114, 128); doc.text(`Powered by Psychometrica Pro Plus`, 148.5, 175, { align: 'center' }); doc.save(`Psychometrica_Certificate_${studentName.replace(/[^a-z0-9]/gi, '_')}.pdf`); showAlert('success', 'Certificate downloaded.');
    }


    // ========================================================================
    // Admin Section Logic (Relies entirely on local storage)
    // ========================================================================
    // (Keep showAdminDashboard, clearReports, exportAllToExcel, submitStudentInfo,
    // exportStudentInfoToCSV, clearStudentInfo logic as is - they use local data)
     function showAdminDashboard() {
         console.log('Showing admin dashboard.');
         const adminSection = document.getElementById('admin-section');
         const adminContent = document.getElementById('admin-content');
         const studentInfoTableBody = document.querySelector('#student-info-table tbody');
         if (!adminSection || !adminContent || !studentInfoTableBody) { showAlert('error', 'Error loading admin dashboard components.'); return; }
         showAlert('warning', 'Critical: Data is stored locally. Export regularly.');
         adminSection.classList.remove('hidden');
         let resultsTable = document.getElementById('results-table');
         if (!resultsTable) { adminContent.innerHTML = `<h3>Student Results</h3><table id="results-table"><thead><tr><th>Name</th><th>Grade</th><th>Date</th><th>Summary</th></tr></thead><tbody></tbody></table>`; resultsTable = document.getElementById('results-table'); }
         const currentResultsTableBody = resultsTable.querySelector('tbody'); if (!currentResultsTableBody) return;
         currentResultsTableBody.innerHTML = allResults.map(result => `<tr><td>${result.studentData?.['student-name'] || 'N/A'}</td><td>${result.studentData?.grade || 'N/A'}</td><td>${result.date || 'N/A'}</td><td>${result.summary || 'N/A'}</td></tr>`).join('');
         studentInfoTableBody.innerHTML = allStudentInfo.map(info => `<tr><td>${info.studentName || 'N/A'}</td><td>${info.parentName || 'N/A'}</td><td>${info.mobile || 'N/A'}</td><td>${info.email || 'N/A'}</td><td>${info.school || 'N/A'}</td><td>${info.age || 'N/A'}</td><td>${info.board || 'N/A'}</td><td>${info.standard || 'N/A'}</td><td>${info.medium || 'N/A'}</td></tr>`).join('');
         updateBrandingThroughout(); // Update branding for admin section too
    }
    function clearReports() { if (confirm('Clear all local reports? Export first.')) { if (confirm('FINAL CONFIRMATION: Clear reports?')) { allResults = []; saveResults(); showAdminDashboard(); showAlert('success', 'Local reports cleared.'); } } }
    function exportAllToExcel() { if (!allResults.length) { showAlert('error', 'No results.'); return; } let csv = 'Student Name,Grade,Date,Summary,Analysis,Realistic,Investigative,Artistic,Social,Enterprising,Conventional,Recommendations\n'; allResults.forEach(result => { const studentName = result.studentData?.['student-name'] || ''; const grade = result.studentData?.grade || ''; const date = result.date || ''; const summary = result.summary || ''; const analysis = result.result?.analysis?.replace(/,|"/g, ';') || ''; const recommendations = result.result?.recommendations?.map(r => `- ${r.replace(/,|"/g, ';')}`).join('\n') || ''; const scores = result.result?.scores; let scoreColumns = 'N/A,N/A,N/A,N/A,N/A,N/A'; if (parseInt(grade) > 8 && scores && typeof scores === 'object') { scoreColumns = [scores.realistic ?? 'N/A', scores.investigative ?? 'N/A', scores.artistic ?? 'N/A', scores.social ?? 'N/A', scores.enterprising ?? 'N/A', scores.conventional ?? 'N/A'].join(','); } const row = [studentName, grade, date, summary, analysis, scoreColumns, recommendations].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','); csv += row + '\n'; }); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); link.download = `Psychometrica_Results_${timestamp}.csv`; link.click(); URL.revokeObjectURL(link.href); showAlert('success', 'Results exported.'); }
    function submitStudentInfo() { const studentName = document.getElementById('info-student-name')?.value?.trim(); const parentName = document.getElementById('info-parent-name')?.value?.trim(); const mobile = document.getElementById('info-mobile')?.value?.trim(); const email = document.getElementById('info-email')?.value?.trim(); const school = document.getElementById('info-school')?.value?.trim(); const ageInput = document.getElementById('info-age'); const board = document.getElementById('info-board')?.value; const standard = document.getElementById('info-standard')?.value; const medium = document.getElementById('info-medium')?.value; if (!studentName || !parentName || !mobile || !email || !school || !ageInput?.value || !board || !standard || !medium) { showAlert('error', 'Fill all fields.'); return; } const age = parseInt(ageInput.value, 10); if (isNaN(age)) { showAlert('error', 'Valid age needed.'); return; } if (age < 5 || age > 25) { showAlert('error', 'Age 5-25 only.'); return; } if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showAlert('error', 'Valid email needed.'); return; } if (!/^\d{10}$/.test(mobile)) { showAlert('error', '10-digit mobile needed.'); return; } const studentInfo = { studentName, parentName, mobile, email, school, age, board, standard, medium, timestamp: new Date().toISOString() }; allStudentInfo.push(studentInfo); saveStudentInfo(); showAdminDashboard(); document.getElementById('info-student-name').value = ''; document.getElementById('info-parent-name').value = ''; document.getElementById('info-mobile').value = ''; document.getElementById('info-email').value = ''; document.getElementById('info-school').value = ''; document.getElementById('info-age').value = ''; document.getElementById('info-board').value = ''; document.getElementById('info-standard').value = ''; document.getElementById('info-medium').value = ''; showAlert('success', 'Student info submitted.'); }
    function exportStudentInfoToCSV() { if (!allStudentInfo.length) { showAlert('error', 'No student info.'); return; } let csv = 'Student Name,Parent Name,Mobile,Email,School,Age,Board,Standard,Medium,Timestamp\n'; allStudentInfo.forEach(info => { const row = [info.studentName, info.parentName, info.mobile, info.email, info.school, info.age, info.board, info.standard, info.medium, info.timestamp || ''].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','); csv += row + '\n'; }); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); link.download = `Student_Information_${timestamp}.csv`; link.click(); URL.revokeObjectURL(link.href); showAlert('success', 'Student info exported.'); }
    function clearStudentInfo() { if (confirm('Clear all local student info? Export first.')) { if (confirm('FINAL CONFIRMATION: Clear student info?')) { allStudentInfo = []; saveStudentInfo(); showAdminDashboard(); showAlert('success', 'Local student info cleared.'); } } }

    // ========================================================================
    // Initialization
    // ========================================================================

    console.log('SCRIPT INFO: Assigning functions to window object...');
    // Assign necessary functions to window scope for HTML onclick handlers
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
    window.exportAllToExcel = exportAllToExcel;
    window.toggleRecommendations = toggleRecommendations;
    window.downloadCertificate = downloadCertificate;
    window.clearReports = clearReports;
     // Assuming plan.js exposes its functions globally or they are called internally
    // window.generateDevelopmentPlan = generateDevelopmentPlan; // Make sure it's available if needed
    // window.copyPlan = copyPlan; // Make sure it's available if needed
    window.submitStudentInfo = submitStudentInfo;
    window.exportStudentInfoToCSV = exportStudentInfoToCSV;
    window.clearStudentInfo = clearStudentInfo;
    window.getClientBranding = getClientBranding;


    console.log('SCRIPT INFO: Initializing application state...');
    loadResults();
    loadStudentInfo();
    resetUI(); // Start at login screen

    console.log("SCRIPT END: Initialization complete.");
});