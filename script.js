// script.js - Merged and Corrected Version with requestAnimationFrame fix

document.addEventListener('DOMContentLoaded', () => {
    console.log("SCRIPT START: DOMContentLoaded event fired.");

    // --- Configuration ---
    const WORKER_URL = "https://my-auth-worker.equimedia4.workers.dev"; // Example URL
    const RESULTS_STORAGE_KEY = 'psychometric_results';
    const STUDENT_INFO_STORAGE_KEY = 'student_info'; // Key for new student info form

    // --- State Variables ---
    let selectedStandard = '';
    let selectedLanguage = '';
    let studentData = {}; // Holds data for the current test taker
    let allResults = []; // Holds all test results (for admin)
    let allStudentInfo = []; // Holds info from the admin's student info form
    let currentQuestionIndex = 0;
    let userAnswers = {};
    let currentInfoStep = 0; // For multi-step student info during test flow

    // --- Info Fields Configuration (for test flow) ---
    const infoFields = [
        { id: 'student-name', labelEn: "Student's Name", labelMr: 'विद्यार्थ्याचे नाव', type: 'text' },
        { id: 'parent-name', labelEn: "Parent's Name", labelMr: 'पालकांचे नाव', type: 'text' },
        { id: 'mobile', labelEn: 'Mobile', labelMr: 'मोबाइल', type: 'tel' },
        { id: 'email', labelEn: 'Email', labelMr: 'ईमेल', type: 'email' },
        { id: 'age', labelEn: 'Age', labelMr: 'वय', type: 'number' },
        { id: 'grade', labelEn: 'Grade', labelMr: 'इयत्ता', type: 'text', readonly: true }, // Grade from standard selection
        {
            id: 'board', labelEn: 'Board', labelMr: 'बोर्ड', type: 'select', options: [
                { value: '', textEn: 'Select Board', textMr: 'बोर्ड निवडा' },
                { value: 'SSC', textEn: 'SSC (Maharashtra State Board)', textMr: 'एसएससी (महाराष्ट्र राज्य मंडळ)' },
                { value: 'CBSE', textEn: 'CBSE', textMr: 'सीबीएसई' },
                { value: 'ICSE', textEn: 'ICSE', textMr: 'आयसीएसई' },
                { value: 'IB', textEn: 'IB', textMr: 'आयबी' },
                { value: 'IGCSE', textEn: 'IGCSE', textMr: 'आयजीसीएसई' },
                 { value: 'Other', textEn: 'Other', textMr: 'इतर' } // Added Other based on admin form
            ]
        }
        // Removed school and medium from here as they seem to be admin-only fields now
    ];

    // ========================================================================
    // Utility Functions
    // ========================================================================

    function showAlert(type, message) {
        console.log(`ALERT (${type}): ${message}`);
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) existingAlert.remove();

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`; // Base class + specific type
        alertDiv.textContent = message;

        if (type === 'critical-warning') {
            alertDiv.classList.add('critical-warning');
            const container = document.querySelector('.container');
            const firstSection = container ? container.querySelector('section') : null;
            if (firstSection) {
                 container.insertBefore(alertDiv, firstSection);
            } else {
                 document.body.insertBefore(alertDiv, document.body.firstChild);
            }
             alertDiv.style.position = 'relative';
             alertDiv.style.transform = 'none';
             alertDiv.style.left = '0';
             alertDiv.style.maxWidth = '100%';
        } else {
             document.body.insertBefore(alertDiv, document.body.firstChild);
             setTimeout(() => {
                 alertDiv.style.opacity = '0';
                 setTimeout(() => alertDiv.remove(), 500);
             }, 4000);
        }
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
            console.log('Loaded admin-submitted student info count:', allStudentInfo.length);
        } catch (error) {
            console.error('Error loading admin-submitted student info from localStorage:', error);
            allStudentInfo = [];
            showAlert('error', 'Failed to load stored student information.');
        }
    }

    function saveStudentInfo() {
        try {
            localStorage.setItem(STUDENT_INFO_STORAGE_KEY, JSON.stringify(allStudentInfo));
            console.log('Admin-submitted student info saved to localStorage:', allStudentInfo.length);
        } catch (error) {
            console.error('Error saving admin-submitted student info to localStorage:', error);
            showAlert('error', 'Failed to save student information.');
        }
    }

    function resetUI() {
        console.log('Resetting UI to login screen.');
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
        if (loginSection) {
             loginSection.classList.remove('hidden');
             console.log('Login section made visible.');
         } else {
            console.error('Login section not found during UI reset!');
         }

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

        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('clientBranding');
         console.log('Session storage cleared.');
    }


    function getClientBranding() {
        const data = sessionStorage.getItem("clientBranding");
         try {
             if (data) {
                const parsedData = JSON.parse(data);
                return (typeof parsedData === 'object' && parsedData !== null) ? parsedData : null;
             }
             return null;
         } catch (e) {
             console.error("Error parsing branding info from sessionStorage:", e);
             sessionStorage.removeItem('clientBranding');
             return null;
         }
    }


    function updateBrandingThroughout() {
        console.log('Attempting to update branding on visible sections...');
        const branding = getClientBranding();

        if (!branding) {
            console.warn("No valid branding info found in sessionStorage to update UI.");
            document.querySelectorAll("section .branding-footer").forEach(ft => ft.remove());
            return;
        }

        console.log("Using branding:", branding);

        const brandName = branding.name || 'Psychometrica Pro Plus';
        const brandAddress = branding.address || 'Address N/A';
        const brandPhone = branding.phone || 'Phone N/A';

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
                    <p>${brandName}, ${brandAddress} | <i class="fas fa-phone"></i> ${brandPhone}</p>
                `;
                section.appendChild(brandingDiv);
            } else {
                 console.log(`Skipping branding update for hidden or non-existent section: ${sectionId}`);
            }
        });

        const resultsSection = document.getElementById('results-section');
        if (resultsSection && !resultsSection.classList.contains('hidden')) {
            const contactMessageP = resultsSection.querySelector('.contact-message p');
            if (contactMessageP) {
                contactMessageP.innerHTML = `For detailed discussion and counseling regarding your child's progress plan, please contact ${brandName} at <i class="fas fa-phone"></i> <strong>${brandPhone}</strong>. Share your result with admin now for further processing.`;
            }
        }
    }


    function showWelcomeScreen() {
        const branding = getClientBranding();
        const welcomeSection = document.getElementById("welcome-section");

        if (!branding || !welcomeSection) {
            console.warn("Skipping welcome screen (no branding or section missing).");
            postLoginNav(); // Navigate directly if welcome screen can't show
            return;
        }

        const brandName = branding.name || 'Psychometrica Pro Plus';
        const brandAddress = branding.address || 'Address N/A';
        const brandPhone = branding.phone || 'Contact N/A';

        // Add the button to the welcome message HTML
        welcomeSection.innerHTML = `
            <h2>Welcome to ${brandName}</h2>
            <p>${brandAddress}</p>
            <p><i class="fas fa-phone"></i> ${brandPhone}</p>
            <div class="button-group" style="margin-top: 20px;">
                 <button id="proceed-button" class="btn"><i class="fas fa-arrow-right"></i> Proceed to Dashboard</button>
             </div>
        `;
        welcomeSection.classList.remove("hidden");
        console.log('Welcome screen displayed with proceed button.');

        // Add event listener AFTER adding the button to the DOM
         const proceedButton = document.getElementById('proceed-button');
         if (proceedButton) {
             proceedButton.onclick = proceedToDashboard; // Assign the new function
         } else {
             console.error("Proceed button not found after adding it to welcome screen!");
         }
    }

    function proceedToDashboard() {
        console.log('Proceed button clicked.');
        const welcomeSection = document.getElementById("welcome-section");
        if (welcomeSection) {
            welcomeSection.classList.add('hidden'); // Hide the welcome section
        }
        postLoginNav(); // Call the original navigation function
    }

    function postLoginNav() {
        const role = sessionStorage.getItem("userRole");
         console.log(`Post-login navigation for role: ${role}`);
        if (role === "admin") {
             showAdminDashboard();
        } else if (role === 'user') {
             const standardSection = document.getElementById("standard-selection");
             if(standardSection){
                 standardSection.classList.remove("hidden");
                 updateBrandingThroughout();
             } else {
                 console.error("Standard selection section not found!");
                 showAlert('error', 'UI Error: Cannot navigate to standard selection.');
                 resetUI();
             }
        } else {
            console.warn(`Unknown or missing role ('${role}'), resetting UI.`);
            showAlert('error', 'Login error: User role not determined.');
            resetUI();
        }
    }

    // ========================================================================
    // Authentication & Session Management (Using Worker)
    // ========================================================================

    async function login() {
        console.log("Login attempt...");
        const usernameEl = document.getElementById("username");
        const passwordEl = document.getElementById("password");

        if (!usernameEl || !passwordEl) {
             console.error("Login form elements missing!");
             return;
         }

        const username = usernameEl.value.trim();
        const password = passwordEl.value.trim();

        if (!username || !password) {
            return showAlert("error", "Please enter both username and password.");
        }

        const loginButton = document.querySelector('#login-section .btn');
        if(loginButton) loginButton.disabled = true;

        try {
             console.log(`Sending login request to: ${WORKER_URL}`);
            const resp = await fetch(WORKER_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

             console.log(`Login response status: ${resp.status}`);

            let result;
            try {
                result = await resp.json();
                 console.log("Login response body:", result);
            } catch (jsonError) {
                 console.error("Failed to parse login response:", jsonError);
                 result = { success: false, error: `Server returned status ${resp.status} but response was not valid JSON.` };
            }

            if (resp.ok && result && result.success === true) {
                 console.log("Login successful.");
                sessionStorage.setItem("userRole", result.role);
                sessionStorage.setItem("clientBranding", JSON.stringify(result.branding || {}));
                showAlert("success", "Login successful!");

                const loginSection = document.getElementById("login-section");
                if(loginSection) loginSection.classList.add("hidden");
                showWelcomeScreen();

            } else {
                 const errorMessage = result?.error || 'Invalid username or password.';
                 console.warn(`Login failed: ${errorMessage}`);
                 showAlert("error", errorMessage);
                 sessionStorage.removeItem('userRole');
                 sessionStorage.removeItem('clientBranding');
            }

        } catch (err) {
            console.error("Login fetch/network error:", err);
            showAlert("error", `Login failed: ${err.message || 'Network error or server unavailable.'}`);
            sessionStorage.removeItem('userRole');
            sessionStorage.removeItem('clientBranding');
        } finally {
             if(loginButton) loginButton.disabled = false;
         }
    }

    function checkExistingSession() {
        console.log("Checking for existing session...");
        const userRole = sessionStorage.getItem('userRole');
        const clientBranding = getClientBranding();

        if (userRole && clientBranding) {
            console.log(`Found existing session for role: ${userRole}. Resuming...`);
            const loginSection = document.getElementById('login-section');
            if (loginSection) loginSection.classList.add('hidden');
            postLoginNav();
        } else {
            console.log("No valid existing session found. Showing login screen.");
             resetUI();
        }
    }


    function confirmLogout() {
        if (confirm('Are you sure you want to logout?')) {
            console.log('Logging out user.');
            sessionStorage.removeItem('userRole');
            sessionStorage.removeItem('clientBranding');
            resetUI();
            showAlert('success', 'You have been logged out.');
        }
    }

    // ========================================================================
    // Test Flow Logic
    // ========================================================================

    function showLanguageSelection() {
        const standardSelect = document.getElementById('standard');
        selectedStandard = standardSelect?.value;
        if (!selectedStandard) {
            showAlert('error', 'Please select a grade.');
            return;
        }
        console.log('Selected standard:', selectedStandard);
        const standardSection = document.getElementById('standard-selection');
        const languageSection = document.getElementById('language-selection');
        if (standardSection && languageSection) {
            standardSection.classList.add('hidden');
            languageSection.classList.remove('hidden');
            updateBrandingThroughout();
        } else {
            showAlert('error', 'Error navigating to language selection.');
            console.error('Missing elements for language selection navigation.');
        }
    }

    function startTest(language) {
        selectedLanguage = language;
        console.log('Selected language:', selectedLanguage);
        studentData = { grade: selectedStandard };
        const languageSection = document.getElementById('language-selection');
        const infoSection = document.getElementById('info-section');
        if (languageSection && infoSection) {
            languageSection.classList.add('hidden');
            infoSection.classList.remove('hidden');
            currentInfoStep = 0;
            loadInfoStep(currentInfoStep);
            updateBrandingThroughout();
        } else {
            showAlert('error', 'Error navigating to student information.');
             console.error('Missing elements for student info navigation.');
        }
    }

    function loadInfoStep(stepIndex) {
        const infoStepDiv = document.getElementById('info-step');
        const backBtn = document.getElementById('info-back-btn');
        const nextBtn = document.getElementById('info-next-btn');
        const infoTitle = document.getElementById('info-title');

        if (!infoStepDiv || !backBtn || !nextBtn || !infoTitle) {
            showAlert('error', 'Info section elements not found.');
            console.error('Missing elements in info section.');
            return;
        }

        const field = infoFields[stepIndex];
        const isMarathi = selectedLanguage === 'marathi';

        infoTitle.textContent = isMarathi ? 'विद्यार्थ्यांची माहिती' : 'Student Information';

        infoStepDiv.innerHTML = `
            <div class="form-group">
                <label for="${field.id}">${isMarathi ? field.labelMr : field.labelEn}:</label>
                ${field.type === 'select' ? `
                    <select id="${field.id}" aria-label="${isMarathi ? field.labelMr : field.labelEn}" ${field.readonly ? 'disabled' : ''}>
                        ${field.options.map(opt => `
                            <option value="${opt.value}" ${studentData[field.id] === opt.value ? 'selected' : ''}>
                                ${isMarathi ? opt.textMr : opt.textEn}
                            </option>
                        `).join('')}
                    </select>
                ` : `
                    <input type="${field.type}" id="${field.id}" placeholder="${isMarathi ? field.labelMr : field.labelEn}"
                        aria-label="${isMarathi ? field.labelMr : field.labelEn}" value="${studentData[field.id] || ''}" ${field.readonly ? 'readonly' : ''}
                        ${field.type === 'number' ? 'min="' + (field.id === 'age' ? '10' : '0') + '" max="' + (field.id === 'age' ? '18' : '100') + '"' : ''}>
                `}
            </div>
        `;

        if (field.id === 'grade') {
            const gradeInput = document.getElementById('grade');
            if (gradeInput) {
                gradeInput.value = selectedStandard;
                 if (gradeInput.tagName === 'INPUT') {
                    gradeInput.readOnly = true;
                 } else if (gradeInput.tagName === 'SELECT') {
                     gradeInput.disabled = true;
                 }
            }
        }

        backBtn.style.display = stepIndex === 0 ? 'none' : 'inline-block';
        nextBtn.textContent = stepIndex === infoFields.length - 1 ? (isMarathi ? 'सबमिट करा' : 'Submit') : (isMarathi ? 'पुढील' : 'Next');
        nextBtn.innerHTML = `<i class="fas ${stepIndex === infoFields.length - 1 ? 'fa-check' : 'fa-arrow-right'}"></i> ${nextBtn.textContent}`;
    }


    function nextInfoStep() {
        const field = infoFields[currentInfoStep];
        const input = document.getElementById(field.id);
        let value = input?.value?.trim();

        if (field.id === 'grade') {
            value = selectedStandard;
        } else if (!value && !field.readonly) {
             showAlert('error', `Please enter ${selectedLanguage === 'marathi' ? field.labelMr : field.labelEn}.`);
             return;
        }

        if (!field.readonly) {
            if (field.id === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                 showAlert('error', 'Please enter a valid email address.');
                 return;
            }
            if (field.id === 'mobile' && value && !/^\d{10}$/.test(value)) {
                 showAlert('error', 'Please enter a valid 10-digit mobile number.');
                 return;
            }
            if (field.id === 'age' && value && (parseInt(value) < 10 || parseInt(value) > 18)) {
                 showAlert('error', 'Age must be between 10 and 18.');
                 return;
            }
            if (field.type === 'select' && field.id !== 'grade' && !value) {
                 showAlert('error', `Please select a ${selectedLanguage === 'marathi' ? field.labelMr : field.labelEn}.`);
                 return;
            }
        }

        studentData[field.id] = value;
        console.log("Stored info:", field.id, "=", value);

        currentInfoStep++;

        if (currentInfoStep < infoFields.length) {
            loadInfoStep(currentInfoStep);
        } else {
             console.log("All info collected for test:", studentData);
            const infoSection = document.getElementById('info-section');
            const instructionsSection = document.getElementById('instructions-section');
            if (infoSection && instructionsSection) {
                infoSection.classList.add('hidden');
                instructionsSection.classList.remove('hidden');
                const instructionsContent = document.getElementById('instructions-content');
                const instructionsTitle = document.getElementById('instructions-title');
                if (instructionsContent && instructionsTitle) {
                     const isMarathi = selectedLanguage === 'marathi';
                     instructionsTitle.textContent = isMarathi ? 'सूचना' : 'Instructions';
                    instructionsContent.innerHTML = isMarathi ? `
                        <p>प्रिय विद्यार्थी,</p>
                        <p>या मानसशास्त्रीय चाचणीमध्ये तुमच्या निवडलेल्या इयत्तेनुसार प्रश्न असतील. खालील सूचना काळजीपूर्वक वाचा:</p>
                        <ul>
                            <li>सर्व प्रश्नांची उत्तरे प्रामाणिकपणे द्या.</li>
                            <li>प्रत्येक प्रश्नासाठी योग्य पर्याय निवडा.</li>
                            <li>वेळेची मर्यादा नाही, त्यामुळे विचारपूर्वक उत्तरे द्या.</li>
                            <li>चाचणी पूर्ण झाल्यावर तुम्हाला तुमचा निकाल आणि शिफारसी मिळतील.</li>
                        </ul>
                        <p>परीक्षेसाठी खूप खूप शुभेच्छा!</p>
                    ` : `
                        <p>Dear Student,</p>
                        <p>This psychological test contains questions based on your selected grade. Please read the instructions carefully:</p>
                        <ul>
                            <li>Answer all questions honestly.</li>
                            <li>Select the appropriate option for each question.</li>
                            <li>There is no time limit, so take your time to answer thoughtfully.</li>
                            <li>Upon completion, you will receive your results and personalized recommendations.</li>
                        </ul>
                        <p>Best of luck with the test!</p>
                    `;
                    const startBtn = instructionsSection.querySelector('.btn:not(.secondary)');
                    if (startBtn) {
                         startBtn.textContent = isMarathi ? 'चाचणी सुरू करा' : 'Start Test';
                         startBtn.innerHTML = `<i class="fas fa-play"></i> ${startBtn.textContent}`;
                    }
                    const backBtn = instructionsSection.querySelector('.btn.secondary');
                     if (backBtn) {
                         backBtn.textContent = isMarathi ? 'मागे' : 'Back';
                         backBtn.innerHTML = `<i class="fas fa-arrow-left"></i> ${backBtn.textContent}`;
                    }
                }
                updateBrandingThroughout();
            } else {
                showAlert('error', 'Error navigating to instructions.');
                console.error('Missing elements for instructions navigation.');
            }
        }
    }


    function previousInfoStep() {
        if (currentInfoStep > 0) {
            const currentField = infoFields[currentInfoStep];
            const currentInput = document.getElementById(currentField.id);
            if (currentInput && !currentField.readonly) {
                 studentData[currentField.id] = currentInput.value.trim();
                 console.log("Saved before going back:", currentField.id, "=", studentData[currentField.id]);
            } else if (currentInput && currentField.readonly && currentField.id === 'grade') {
                studentData[currentField.id] = currentInput.value;
            }

            currentInfoStep--;
            loadInfoStep(currentInfoStep);
        }
    }


    function goBack(currentSectionId) {
         console.log(`Go back requested from: ${currentSectionId}`);
        const currentSection = document.getElementById(currentSectionId);
        let prevSectionId;

        switch (currentSectionId) {
            case 'language-selection':
                prevSectionId = 'standard-selection';
                break;
            case 'info-section':
                prevSectionId = 'language-selection';
                 if (currentInfoStep === 0) {
                     studentData = { grade: selectedStandard };
                 }
                break;
            case 'instructions-section':
                prevSectionId = 'info-section';
                currentInfoStep = infoFields.length - 1;
                break;
            case 'test-section':
                 prevSectionId = 'instructions-section';
                 break;
             case 'results-section':
                 prevSectionId = 'standard-selection';
                 currentSection?.classList.add('hidden');
                 document.getElementById(prevSectionId)?.classList.remove('hidden');
                 updateBrandingThroughout();
                 return;
            default:
                console.warn("Go back called from unknown section:", currentSectionId);
                return;
        }

        const prevSection = document.getElementById(prevSectionId);
        if (currentSection && prevSection) {
            currentSection.classList.add('hidden');
            prevSection.classList.remove('hidden');
             if (prevSectionId === 'info-section') {
                 loadInfoStep(currentInfoStep);
            }
            updateBrandingThroughout();
        } else {
            showAlert('error', 'Error navigating back.');
            console.error(`Error navigating back: currentSection=${currentSectionId}, prevSection=${prevSectionId}, Elements found:`, {currentSection, prevSection});
        }
    }


    function showTest() {
        const instructionsSection = document.getElementById('instructions-section');
        const testSection = document.getElementById('test-section');
        const testTitle = document.getElementById('test-title');

        if (instructionsSection && testSection && testTitle) {
            instructionsSection.classList.add('hidden');
            testSection.classList.remove('hidden');

            const isMarathi = selectedLanguage === 'marathi';
            testTitle.textContent = isMarathi ? 'मानसशास्त्रीय चाचणी' : 'Psychological Test';

            currentQuestionIndex = 0;
            userAnswers = {};
            loadQuestion(currentQuestionIndex);
            updateBrandingThroughout();
        } else {
            showAlert('error', 'Error navigating to test.');
             console.error('Missing elements for test navigation.');
        }
    }

    function loadQuestion(index) {
        const questionSet = (selectedStandard >= 5 && selectedStandard <= 8) ? window.questions5to8 : window.questions9to10;
        const questions = questionSet?.[selectedLanguage];

        if (!questions) {
             if(questionSet && !questionSet[selectedLanguage]){
                 showAlert('error', `Questions not available for the selected language: ${selectedLanguage}.`);
                 console.error(`Question set found, but language '${selectedLanguage}' is missing.`);
             } else {
                 showAlert('error', `Questions not found for the selected grade range (Standard ${selectedStandard}).`);
                 console.error(`Question set (questions${selectedStandard <= 8 ? '5to8' : '9to10'}) not found on window object.`);
             }
            goBack('test-section');
            return;
        }

         if (index < 0 || index >= questions.length) {
             showAlert('error', 'Invalid question index.');
             console.error(`Attempted to load invalid question index: ${index} for ${questions.length} questions.`);
             goBack('test-section');
             return;
         }

        const question = questions[index];
        const questionsDiv = document.getElementById('questions');
        const progressLabel = document.querySelector('.progress-label');

        if (!question || !questionsDiv || !progressLabel) {
            showAlert('error', 'Error loading question or progress elements.');
             console.error('Missing question display elements', {question, questionsDiv, progressLabel});
            return;
        }

         const isMarathi = selectedLanguage === 'marathi';
         progressLabel.textContent = isMarathi ? 'तुमची प्रगती' : 'Your Progress';

         let optionsHTML = '';
         if (question.options && Array.isArray(question.options)) {
             if (question.type === 'like-neutral-dislike' || question.type === 'personality') {
                 optionsHTML = question.options.map(optionText => `
                     <label>
                         <input type="radio" name="q${index}" value="${optionText}"
                             ${userAnswers[index] === optionText ? 'checked' : ''}>
                         <span>${optionText}</span>
                     </label>
                 `).join('');
             } else { // Default MCQ
                  optionsHTML = question.options.map(optionText => `
                     <label>
                         <input type="radio" name="q${index}" value="${optionText}"
                             ${userAnswers[index] === optionText ? 'checked' : ''}>
                         <span>${optionText}</span>
                     </label>
                 `).join('');
             }
         } else {
             console.error(`Question ${index} has missing or invalid options.`);
             optionsHTML = '<p>Error: Options not available for this question.</p>';
         }

        questionsDiv.innerHTML = `
            <div class="question">
                <p>${question.text}</p>
                <div class="options">
                    ${optionsHTML}
                </div>
            </div>
        `;
        updateProgressAndButtons(index, questions.length);
    }


    function updateProgressAndButtons(currentIndex, totalQuestions) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const backBtn = document.getElementById('back-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');

        if (progressFill && progressText && backBtn && nextBtn && submitBtn) {
            const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
            progressFill.style.width = `${progress}%`;

            const isMarathi = selectedLanguage === 'marathi';
            progressText.textContent = isMarathi ?
                `प्रश्न ${currentIndex + 1} / ${totalQuestions}` :
                `Question ${currentIndex + 1} of ${totalQuestions}`;

            backBtn.style.display = currentIndex === 0 ? 'none' : 'inline-block';
            nextBtn.style.display = currentIndex === totalQuestions - 1 ? 'none' : 'inline-block';
            submitBtn.style.display = currentIndex === totalQuestions - 1 ? 'inline-block' : 'none';

             backBtn.textContent = isMarathi ? 'मागे' : 'Back';
             backBtn.innerHTML = `<i class="fas fa-arrow-left"></i> ${backBtn.textContent}`;
             nextBtn.textContent = isMarathi ? 'पुढील' : 'Next';
             nextBtn.innerHTML = `<i class="fas fa-arrow-right"></i> ${nextBtn.textContent}`;
             submitBtn.textContent = isMarathi ? 'सबमिट करा' : 'Submit';
             submitBtn.innerHTML = `<i class="fas fa-check"></i> ${submitBtn.textContent}`;
        } else {
             console.error("Could not find one or more progress/button elements for update");
        }
    }


    function nextQuestion() {
        const questionSet = (selectedStandard >= 5 && selectedStandard <= 8) ? window.questions5to8 : window.questions9to10;
        const questions = questionSet?.[selectedLanguage];
        if (!questions) {
             showAlert('error', 'Cannot proceed: Questions data is missing.');
             return;
        }

        const selectedOption = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`);
        if (!selectedOption) {
            showAlert('error', 'Please select an option.');
            return;
        }
        userAnswers[currentQuestionIndex] = selectedOption.value;
        console.log(`Answered Q${currentQuestionIndex}: ${selectedOption.value}`);

        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
            loadQuestion(currentQuestionIndex);
        }
    }


    function previousQuestion() {
        if (currentQuestionIndex > 0) {
            const selectedOption = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`);
            if (selectedOption) {
                 userAnswers[currentQuestionIndex] = selectedOption.value;
                 console.log(`Saved answer for Q${currentQuestionIndex} before going back: ${selectedOption.value}`);
            } else {
                 console.log(`No answer selected for Q${currentQuestionIndex} when going back.`);
            }

            currentQuestionIndex--;
            loadQuestion(currentQuestionIndex);
        }
    }


    async function submitTest() {
        const questionSet = (selectedStandard >= 5 && selectedStandard <= 8) ? window.questions5to8 : window.questions9to10;
        const questions = questionSet?.[selectedLanguage];

        if (!questions) {
            showAlert('error', 'Questions not found. Cannot submit.');
             console.error('Question data missing on submit.');
            return;
        }

        const selectedOption = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`);
        if (!selectedOption) {
            showAlert('error', 'Please select an answer for the last question before submitting.');
            return;
        }
        userAnswers[currentQuestionIndex] = selectedOption.value;
        console.log(`Final answer captured for Q${currentQuestionIndex}: ${selectedOption.value}`);

        const totalQuestions = questions.length;
        const answeredCount = Object.keys(userAnswers).length;
        if (answeredCount < totalQuestions) {
             showAlert('warning', `Submitting with ${totalQuestions - answeredCount} unanswered questions.`);
             console.warn(`Submitting with ${totalQuestions - answeredCount} unanswered questions.`);
        }

        console.log("Submitting test with answers:", userAnswers);
        console.log("Student data for this test:", studentData);

        try {
             if (typeof window.calculateResults !== 'function') {
                 console.error("Result calculation logic (calculateResults function) is missing from results.js or not loaded.");
                 throw new Error("Result calculation logic is missing.");
             }

            const result = window.calculateResults(parseInt(selectedStandard), selectedLanguage, userAnswers);
            console.log('Calculated result object:', result);

             if (!result || !result.detailedResult || !result.date || !result.summary) {
                console.error("Result calculation returned invalid object:", result);
                 throw new Error("Result calculation failed to produce a valid result object.");
            }

            const resultData = {
                studentData: { ...studentData, language: selectedLanguage }, // Store language with result
                result: result.detailedResult,
                date: result.date,
                summary: result.summary
            };

            allResults.push(resultData);
            saveResults();

            displayResultsPage(result);

        } catch (error) {
            console.error('Error during test submission or result calculation:', error);
            showAlert('error', `Error submitting test: ${error.message}`);
        }
    }

     function displayResultsPage(result) {
         const testSection = document.getElementById('test-section');
         const resultsSection = document.getElementById('results-section');
         const resultContent = document.getElementById('result-content');
         const trophySign = document.getElementById('trophy-sign');
         const resultsTitle = document.getElementById('results-title');

         if (!testSection || !resultsSection || !resultContent || !trophySign || !resultsTitle) {
             showAlert('error', 'Error displaying results section - elements missing.');
             console.error('Missing elements for results display.');
             return;
         }

         testSection.classList.add('hidden');
         resultsSection.classList.remove('hidden');

         const isMarathi = selectedLanguage === 'marathi';
         resultsTitle.textContent = isMarathi ? 'तुमचा निकाल' : 'Your Results';

         let isHighScore = false;
          const detailedScores = result.detailedResult?.scores;
          if (detailedScores) {
              if (selectedStandard <= 8) {
                  isHighScore = parseFloat(detailedScores.percentage) > 80; // Ensure percentage is number
              } else {
                  isHighScore = Object.values(detailedScores).some(score => score > 30);
              }
          }
          trophySign.classList.toggle('hidden', !isHighScore);

         let detailsHTML = '<div class="result-details">';
          detailsHTML += `<p><strong>${isMarathi ? 'विद्यार्थ्याचे नाव' : 'Student Name'}:</strong> ${studentData['student-name'] || 'N/A'}</p>`;
          detailsHTML += `<p><strong>${isMarathi ? 'इयत्ता' : 'Grade'}:</strong> ${studentData.grade || 'N/A'}</p>`;
          detailsHTML += `<p><strong>${isMarathi ? 'पालकांचे नाव' : "Parent's Name"}:</strong> ${studentData['parent-name'] || 'N/A'}</p>`;
          detailsHTML += `<p><strong>${isMarathi ? 'मोबाइल' : 'Mobile'}:</strong> ${studentData['mobile'] || 'N/A'}</p>`;
          detailsHTML += `<p><strong>${isMarathi ? 'ईमेल' : 'Email'}:</strong> ${studentData['email'] || 'N/A'}</p>`;
          detailsHTML += `<p><strong>${isMarathi ? 'वय' : 'Age'}:</strong> ${studentData['age'] || 'N/A'}</p>`;
          detailsHTML += `<p><strong>${isMarathi ? 'बोर्ड' : 'Board'}:</strong> ${studentData['board'] || 'N/A'}</p>`;
         detailsHTML += `<p><strong>${isMarathi ? 'दिनांक' : 'Date'}:</strong> ${result.date || 'N/A'}</p>`;

          if (detailedScores) {
              if (selectedStandard <= 8) {
                  detailsHTML += `<p><strong>${isMarathi ? 'गुण' : 'Score'}:</strong> ${detailedScores.score ?? 'N/A'} / ${detailedScores.totalQuestions ?? 'N/A'}</p>`;
                  detailsHTML += `<p><strong>${isMarathi ? 'टक्केवारी' : 'Percentage'}:</strong> ${detailedScores.percentage ?? 'N/A'}%</p>`;
              } else {
                  detailsHTML += `<p><strong>${isMarathi ? 'वास्तववादी (R)' : 'Realistic (R)'}:</strong> ${detailedScores.realistic ?? 'N/A'}</p>`;
                  detailsHTML += `<p><strong>${isMarathi ? 'संशोधक (I)' : 'Investigative (I)'}:</strong> ${detailedScores.investigative ?? 'N/A'}</p>`;
                  detailsHTML += `<p><strong>${isMarathi ? 'कलात्मक (A)' : 'Artistic (A)'}:</strong> ${detailedScores.artistic ?? 'N/A'}</p>`;
                  detailsHTML += `<p><strong>${isMarathi ? 'सामाजिक (S)' : 'Social (S)'}:</strong> ${detailedScores.social ?? 'N/A'}</p>`;
                  detailsHTML += `<p><strong>${isMarathi ? 'उद्योजक (E)' : 'Enterprising (E)'}:</strong> ${detailedScores.enterprising ?? 'N/A'}</p>`;
                  detailsHTML += `<p><strong>${isMarathi ? 'पारंपारिक (C)' : 'Conventional (C)'}:</strong> ${detailedScores.conventional ?? 'N/A'}</p>`;
             }
         }

         detailsHTML += `<p><strong>${isMarathi ? 'सारांश' : 'Summary'}:</strong> ${result.summary || 'N/A'}</p>`;
          if (result.detailedResult?.analysis) {
              detailsHTML += `<p><strong>${isMarathi ? 'विश्लेषण' : 'Analysis'}:</strong> ${result.detailedResult.analysis}</p>`;
          }
         detailsHTML += '</div>';

         detailsHTML += `<div class="recommendations-toggle">${isMarathi ? 'शिफारसी दाखवा' : 'Show Recommendations'}</div>`;
         detailsHTML += '<ul class="recommendations-list">';
         const recommendations = result.detailedResult?.recommendations;
         if (recommendations && recommendations.length > 0) {
             detailsHTML += recommendations.map(rec => `<li>${rec}</li>`).join('');
         } else {
             detailsHTML += `<li>${isMarathi ? 'कोणतीही शिफारस उपलब्ध नाही.' : 'No recommendations available.'}</li>`;
         }
         detailsHTML += '</ul>';

         resultContent.innerHTML = detailsHTML;

        const toggleButton = resultContent.querySelector('.recommendations-toggle');
        if (toggleButton) {
            toggleButton.addEventListener('click', () => toggleRecommendations(toggleButton));
        }

         const whatsappBtn = resultsSection.querySelector('.whatsapp-btn');
         const copyBtn = resultsSection.querySelector('.btn:not(.whatsapp-btn):not(.secondary):not([onclick*="download"])');
         const downloadBtn = resultsSection.querySelector('.btn[onclick*="download"]');
         const logoutBtn = resultsSection.querySelector('.btn.secondary');

         if(whatsappBtn) whatsappBtn.innerHTML = `<i class="fab fa-whatsapp"></i> ${isMarathi ? 'WhatsApp वर शेअर करा' : 'Share on WhatsApp'}`;
          if(copyBtn) copyBtn.innerHTML = `<i class="fas fa-copy"></i> ${isMarathi ? 'निकाल कॉपी करा' : 'Copy Result'}`;
          if(downloadBtn) downloadBtn.innerHTML = `<i class="fas fa-download"></i> ${isMarathi ? 'प्रमाणपत्र डाउनलोड करा' : 'Download Certificate'}`;
         if(logoutBtn) logoutBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i> ${isMarathi ? 'लॉगआउट करा' : 'Logout'}`;

        updateBrandingThroughout();
    }


    function toggleRecommendations(toggleButton) {
        const recommendationsList = toggleButton.nextElementSibling;
        if (recommendationsList && recommendationsList.tagName === 'UL') {
            const isActive = recommendationsList.classList.toggle('active');
            const isMarathi = selectedLanguage === 'marathi';
            toggleButton.textContent = isActive ?
                (isMarathi ? 'शिफारसी लपवा' : 'Hide Recommendations') :
                (isMarathi ? 'शिफारसी दाखवा' : 'Show Recommendations');
        } else {
             console.error("Could not find the recommendations list element next to the toggle button.");
        }
    }

    function getLatestResultText() {
         const lastResult = allResults[allResults.length - 1];
         const branding = getClientBranding() || { name: 'Psychometrica Pro Plus', phone: 'N/A' };

         if (!lastResult || !lastResult.studentData || !lastResult.studentData['student-name']) {
             console.error('Cannot generate text: Last result or student data incomplete.');
             return null;
         }

         const sd = lastResult.studentData;
         const res = lastResult.result || {};
         const scores = res.scores || {};

          const isMarathi = sd.language === 'marathi'; // Use language stored with result

         let text = `*Psychometrica Pro Plus Results*\n\n`;
         text += `*${isMarathi ? 'विद्यार्थी' : 'Student'}:* ${sd['student-name']}\n`;
         text += `*${isMarathi ? 'इयत्ता' : 'Grade'}:* ${sd.grade}\n`;
         text += `*${isMarathi ? 'दिनांक' : 'Date'}:* ${lastResult.date}\n\n`;

          const gradeNum = parseInt(sd.grade);
          if (!isNaN(gradeNum)) {
              if (gradeNum <= 8) {
                  text += `*${isMarathi ? 'गुण' : 'Score'}:* ${scores.score ?? 'N/A'} / ${scores.totalQuestions ?? 'N/A'}\n`;
                  text += `*${isMarathi ? 'टक्केवारी' : 'Percentage'}:* ${scores.percentage ?? 'N/A'}%\n`;
              } else {
                   text += `*Scores (R/I/A/S/E/C):* ${scores.realistic ?? 'N/A'}/${scores.investigative ?? 'N/A'}/${scores.artistic ?? 'N/A'}/${scores.social ?? 'N/A'}/${scores.enterprising ?? 'N/A'}/${scores.conventional ?? 'N/A'}\n`;
              }
          }

         text += `*${isMarathi ? 'सारांश' : 'Summary'}:* ${lastResult.summary || 'N/A'}\n`;
         if (res.analysis) {
             text += `*${isMarathi ? 'विश्लेषण' : 'Analysis'}:* ${res.analysis}\n\n`;
         }

         text += `*${isMarathi ? 'शिफारसी' : 'Recommendations'}:*\n`;
         if (res.recommendations && res.recommendations.length > 0) {
             text += res.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n');
         } else {
             text += isMarathi ? 'कोणतीही विशिष्ट शिफारस तयार केलेली नाही.\n' : 'No specific recommendations generated.\n';
         }

         text += `\n*${isMarathi ? 'संपर्क' : 'Contact'}:* ${branding.name} - ${branding.phone}`;

         return text.trim();
    }


    function shareOnWhatsApp() {
        const text = getLatestResultText();
        if (!text) {
            showAlert('error', 'No results available to share or data incomplete.');
            return;
        }
        const encodedText = encodeURIComponent(text);
        const url = `https://wa.me/?text=${encodedText}`;
        window.open(url, '_blank');
    }


    function copyResultCode() {
         const text = getLatestResultText();
         if (!text) {
            showAlert('error', 'No results available to copy or data incomplete.');
            return;
        }

        navigator.clipboard.writeText(text).then(() => {
            showAlert('success', 'Results copied to clipboard.');
        }).catch((err) => {
             console.error("Clipboard copy error:", err);
            showAlert('error', 'Failed to copy results. Check browser permissions or use HTTPS.');
        });
    }

     function downloadCertificate() {
         if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
             showAlert('error', 'Certificate generation library (jsPDF) not loaded. Cannot download.');
             console.error("jsPDF library not found on window object.");
             return;
         }
         const { jsPDF } = window.jspdf;

         const lastResult = allResults[allResults.length - 1];
          const branding = getClientBranding() || { name: 'Psychometrica Pro Plus', address: 'N/A', phone: 'N/A' };
         const currentStudentData = lastResult?.studentData;

         if (!lastResult || !currentStudentData || !currentStudentData['student-name']) {
             showAlert('error', 'Cannot generate certificate: Results or student data missing.');
             console.error('Certificate generation failed: Missing result or student data.', {lastResult, currentStudentData});
             return;
         }

         const studentName = currentStudentData['student-name'];
         const grade = currentStudentData.grade;
         const date = lastResult.date;
         const summary = lastResult.summary;
         const analysis = lastResult.result?.analysis || 'Detailed analysis available upon consultation.';

         try {
             const doc = new jsPDF({
                 orientation: 'landscape',
                 unit: 'mm',
                 format: 'a4'
             });

             const PRIMARY_COLOR = '#1B3B6F';
             const SECONDARY_COLOR = '#F4A261';
             const TEXT_DARK = '#1F2A44';
             const TEXT_MUTED = '#6B7280';
             const PAGE_WIDTH = doc.internal.pageSize.getWidth();
             const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
             const MARGIN = 15;
             let mainFont = 'Helvetica';

             try {
                  doc.setFont('Helvetica', 'normal');
                  mainFont = 'Helvetica';
              } catch (e) {
                  console.warn("Default font setting failed, check jsPDF documentation.", e);
              }

             doc.setDrawColor(SECONDARY_COLOR);
             doc.setLineWidth(1.5);
             doc.rect(MARGIN - 5, MARGIN - 5, PAGE_WIDTH - 2 * (MARGIN - 5), PAGE_HEIGHT - 2 * (MARGIN - 5));
             doc.setDrawColor(PRIMARY_COLOR);
             doc.setLineWidth(0.5);
             doc.rect(MARGIN, MARGIN, PAGE_WIDTH - 2 * MARGIN, PAGE_HEIGHT - 2 * MARGIN);

             doc.setFontSize(24);
             doc.setFont(mainFont, 'bold');
             doc.setTextColor(PRIMARY_COLOR);
             doc.text(branding.name.toUpperCase(), PAGE_WIDTH / 2, MARGIN + 15, { align: 'center' });

             doc.setFontSize(14);
             doc.setFont(mainFont, 'normal');
             doc.setTextColor(TEXT_MUTED);
             doc.text('Certificate of Assessment Completion', PAGE_WIDTH / 2, MARGIN + 25, { align: 'center' });

             doc.setDrawColor(SECONDARY_COLOR);
             doc.setLineWidth(0.5);
             doc.line(MARGIN + 10, MARGIN + 35, PAGE_WIDTH - MARGIN - 10, MARGIN + 35);

             doc.setFontSize(16);
             doc.setFont(mainFont, 'italic');
             doc.setTextColor(TEXT_DARK);
             doc.text('This certifies that', PAGE_WIDTH / 2, MARGIN + 50, { align: 'center' });

             doc.setFontSize(28);
             doc.setFont(mainFont, 'bold');
             doc.setTextColor(PRIMARY_COLOR);
             doc.text(studentName.toUpperCase(), PAGE_WIDTH / 2, MARGIN + 65, { align: 'center' });

             doc.setFontSize(14);
             doc.setFont(mainFont, 'normal');
             doc.setTextColor(TEXT_DARK);
             const completionText = `has successfully completed the Psychometrica Pro Plus Assessment for Grade ${grade}.`;
             const splitText = doc.splitTextToSize(completionText, PAGE_WIDTH - 2 * MARGIN - 20);
             doc.text(splitText, PAGE_WIDTH / 2, MARGIN + 80, { align: 'center' });

             doc.setFontSize(12);
             doc.setFont(mainFont, 'bold');
             doc.text('Assessment Summary:', MARGIN + 10, MARGIN + 100);
             doc.setFont(mainFont, 'normal');
             doc.text(`Date: ${date}`, MARGIN + 10, MARGIN + 108);
             doc.text(`Result: ${summary}`, MARGIN + 10, MARGIN + 116);
             const analysisLines = doc.splitTextToSize(`Analysis: ${analysis}`, PAGE_WIDTH - 2*MARGIN - 20);
             doc.text(analysisLines, MARGIN + 10, MARGIN + 124);

             const footerY = PAGE_HEIGHT - MARGIN - 20;
             doc.setFontSize(10);
             doc.setTextColor(TEXT_MUTED);
             doc.text(`Issued by: ${branding.name}`, MARGIN + 10, footerY);
             doc.text(`Contact: ${branding.phone || 'N/A'}`, MARGIN + 10, footerY + 5);

             doc.setDrawColor(TEXT_DARK);
             doc.setLineWidth(0.3);
             const sigX1 = PAGE_WIDTH - MARGIN - 70;
             const sigX2 = PAGE_WIDTH - MARGIN - 10;
             doc.line(sigX1, footerY, sigX2, footerY);
             doc.setFontSize(10);
             doc.text('Authorized Signature', sigX1 + (sigX2-sigX1)/2 , footerY + 5, { align: 'center' });

              const safeStudentName = studentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
             doc.save(`Psychometrica_Certificate_${safeStudentName}.pdf`);
             showAlert('success', 'Certificate downloaded successfully.');

         } catch (error) {
             console.error("Error generating PDF certificate:", error);
             showAlert('error', `Failed to generate certificate: ${error.message}`);
         }
     }

    // ========================================================================
    // Admin Section Logic
    // ========================================================================

    // --- MODIFIED: showAdminDashboard uses requestAnimationFrame ---
    function showAdminDashboard() {
        console.log('Showing admin dashboard.');
        const adminSection = document.getElementById('admin-section');
        const resultsTableBody = document.querySelector('#results-table tbody');
        const studentInfoTableBody = document.querySelector('#student-info-table tbody');
        const backupAlertTop = document.getElementById('backup-alert-top');

        // Check if elements exist
        if (adminSection && resultsTableBody && studentInfoTableBody && backupAlertTop) {
            // Make the section visible FIRST
            adminSection.classList.remove('hidden');
            backupAlertTop.style.display = 'block'; // Make sure alert is visible

            // --- Defer the content population using requestAnimationFrame ---
            requestAnimationFrame(() => {
                console.log('Populating admin dashboard inside requestAnimationFrame');
                try { // Add try...catch for safety inside the deferred code
                    // Populate Results Table
                    resultsTableBody.innerHTML = ''; // Clear previous entries
                    if (allResults.length === 0) {
                        resultsTableBody.innerHTML = '<tr><td colspan="4">No test results available.</td></tr>';
                    } else {
                        [...allResults].reverse().forEach(result => {
                            const row = resultsTableBody.insertRow();
                            const studentInfoForResult = result.studentData || {};
                            row.insertCell().textContent = studentInfoForResult['student-name'] || 'N/A';
                            row.insertCell().textContent = studentInfoForResult.grade || 'N/A';
                            row.insertCell().textContent = result.date || 'N/A';
                            row.insertCell().textContent = result.summary || 'N/A';
                        });
                    }

                    // Populate Student Info Table
                    studentInfoTableBody.innerHTML = ''; // Clear previous entries
                    if (allStudentInfo.length === 0) {
                        studentInfoTableBody.innerHTML = '<tr><td colspan="9">No student information submitted via admin form.</td></tr>';
                    } else {
                        [...allStudentInfo].reverse().forEach(info => {
                            const row = studentInfoTableBody.insertRow();
                            row.insertCell().textContent = info.studentName || 'N/A';
                            row.insertCell().textContent = info.parentName || 'N/A';
                            row.insertCell().textContent = info.mobile || 'N/A';
                            row.insertCell().textContent = info.email || 'N/A';
                            row.insertCell().textContent = info.school || 'N/A';
                            row.insertCell().textContent = info.age || 'N/A';
                            row.insertCell().textContent = info.board || 'N/A';
                            row.insertCell().textContent = info.standard || 'N/A';
                            row.insertCell().textContent = info.medium || 'N/A';
                        });
                    }

                    const planContent = document.getElementById('plan-content');
                    if (planContent) planContent.classList.add('hidden'); // Hide generated plan initially

                    updateBrandingThroughout(); // Update branding only AFTER ensuring content is ready

                } catch (error) {
                     console.error("Error populating dashboard inside rAF:", error);
                     showAlert('error', 'Failed to populate dashboard content.');
                     resetUI(); // Still reset if population itself fails
                }
            });
             // --- End deferral ---

        } else {
            // This 'else' block should now be much less likely to run
            showAlert('error', 'Error loading admin dashboard elements (Check Failed).');
            console.error("Admin dashboard elements missing (Check Failed):", { adminSection, resultsTableBody, studentInfoTableBody, backupAlertTop });
            resetUI(); // Go back to login if check fails
        }
    }


    function clearReports() {
        if (confirm('WARNING: This will permanently delete all locally stored test results. Export first if needed. Are you sure?')) {
            if (confirm('Second confirmation: Really delete ALL results? This cannot be undone.')) {
                 console.log('Clearing all locally stored results...');
                 allResults = [];
                 localStorage.removeItem(RESULTS_STORAGE_KEY);
                 saveResults();
                 showAdminDashboard();
                 showAlert('success', 'All test reports cleared from local storage.');
            } else {
                 showAlert('warning', 'Report clearing cancelled.');
            }
        } else {
            showAlert('warning', 'Report clearing cancelled.');
        }
    }

    const formatCsvField = (field) => {
        let stringField = (field === null || typeof field === 'undefined') ? '' : String(field);
         stringField = stringField.replace(/"/g, '""');
         if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
             stringField = `"${stringField}"`;
         }
         return stringField;
     };


    function exportAllToExcel() { // Exports results data
        if (!allResults.length) {
            showAlert('warning', 'No test results available to export.');
            return;
        }
        console.log(`Exporting ${allResults.length} test results to CSV...`);

         let csvHeaders = [
             "Student Name", "Parent Name", "Mobile", "Email", "Age", "Grade", "Board", "Language", // Added Language
             "Date", "Summary", "Analysis",
             "R Score", "I Score", "A Score", "S Score", "E Score", "C Score",
             "Aptitude Score", "Aptitude Total", "Aptitude Percent",
             "Recommendations"
         ];
         let csv = csvHeaders.map(formatCsvField).join(',') + '\n';

        allResults.forEach(result => {
             const student = result.studentData || {};
             const res = result.result || {};
             const scores = res.scores || {};
             const recommendations = (res.recommendations || []).join('; ');
             const gradeNum = parseInt(student.grade);
             const isGrade5to8 = !isNaN(gradeNum) && gradeNum >= 5 && gradeNum <= 8;
             const isGrade9to10 = !isNaN(gradeNum) && (gradeNum === 9 || gradeNum === 10);

             let rowData = [
                 student['student-name'], student['parent-name'], student['mobile'], student['email'], student['age'], student['grade'], student['board'], student['language'], // Added language
                 result.date, result.summary, res.analysis,
                 isGrade9to10 ? scores.realistic : '', isGrade9to10 ? scores.investigative : '', isGrade9to10 ? scores.artistic : '', isGrade9to10 ? scores.social : '', isGrade9to10 ? scores.enterprising : '', isGrade9to10 ? scores.conventional : '',
                 isGrade5to8 ? scores.score : '', isGrade5to8 ? scores.totalQuestions : '', isGrade5to8 ? scores.percentage : '',
                 recommendations
            ];
            csv += rowData.map(formatCsvField).join(',') + '\n';
        });

        downloadCSV(csv, 'Psychometrica_Results_Export.csv');
        showAlert('success', 'Results export started.');
        console.log("Test results CSV export initiated.");
    }

    function exportStudentInfoToCSV() { // Exports admin-submitted student info
        if (!allStudentInfo.length) {
            showAlert('warning', 'No student information (from admin form) available to export.');
            return;
        }
         console.log(`Exporting ${allStudentInfo.length} admin-submitted student records to CSV...`);

         const csvHeaders = [
             "Student Name", "Parent Name", "Mobile", "Email", "School", "Age", "Board", "Standard", "Medium"
         ];
         let csv = csvHeaders.map(formatCsvField).join(',') + '\n';

        allStudentInfo.forEach(info => {
             let rowData = [
                 info.studentName, info.parentName, info.mobile, info.email, info.school,
                 info.age, info.board, info.standard, info.medium
            ];
            csv += rowData.map(formatCsvField).join(',') + '\n';
        });

        downloadCSV(csv, 'Admin_Student_Information_Export.csv');
        showAlert('success', 'Student information export started.');
        console.log("Admin student info CSV export initiated.");
    }

    function downloadCSV(csvContent, filename) {
         const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
         const link = document.createElement('a');
         if (link.download !== undefined) {
             const url = URL.createObjectURL(blob);
             link.setAttribute('href', url);
             link.setAttribute('download', filename);
             link.style.visibility = 'hidden';
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
             URL.revokeObjectURL(url);
         } else {
             showAlert('error', 'CSV download not supported by this browser.');
             console.error("File download attribute not supported.");
         }
     }


    function submitStudentInfo() { // Handles admin form submission
         const studentName = document.getElementById('info-student-name')?.value.trim();
         const parentName = document.getElementById('info-parent-name')?.value.trim();
         const mobile = document.getElementById('info-mobile')?.value.trim();
         const email = document.getElementById('info-email')?.value.trim();
         const school = document.getElementById('info-school')?.value.trim();
         const ageInput = document.getElementById('info-age');
         const board = document.getElementById('info-board')?.value;
         const standard = document.getElementById('info-standard')?.value;
         const medium = document.getElementById('info-medium')?.value;

         if (!studentName || !parentName || !mobile || !school || !ageInput?.value || !board || !standard || !medium) {
             showAlert('error', 'Please fill in all required fields in the student information form.');
             return;
         }

         const age = parseInt(ageInput.value, 10);
         if (isNaN(age) || age < 10 || age > 18) {
             showAlert('error', 'Please enter a valid age between 10 and 18.');
             return;
         }
         if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
             showAlert('error', 'Please enter a valid email address or leave it blank.');
             return;
         }
         if (!/^\d{10}$/.test(mobile)) {
             showAlert('error', 'Please enter a valid 10-digit mobile number.');
             return;
         }

        const studentInfo = {
            studentName, parentName, mobile,
            email: email || '', school, age, board, standard, medium
        };

         console.log("Submitting student info from admin form:", studentInfo);
        allStudentInfo.push(studentInfo);
        saveStudentInfo();

         document.getElementById('info-student-name').value = '';
         document.getElementById('info-parent-name').value = '';
         document.getElementById('info-mobile').value = '';
         document.getElementById('info-email').value = '';
         document.getElementById('info-school').value = '';
         document.getElementById('info-age').value = '';
         document.getElementById('info-board').value = '';
         document.getElementById('info-standard').value = '';
         document.getElementById('info-medium').value = '';

        showAdminDashboard();
        showAlert('success', 'Student information submitted successfully.');
    }


    function clearStudentInfo() { // Clears admin-submitted student info
        if (confirm('WARNING: This will permanently delete all student information submitted via the admin form from local storage. Export first if needed. Are you sure?')) {
             if (confirm('Second confirmation: Really delete ALL admin-submitted student info? This cannot be undone.')) {
                console.log('Clearing all locally stored admin-submitted student information...');
                allStudentInfo = [];
                localStorage.removeItem(STUDENT_INFO_STORAGE_KEY);
                saveStudentInfo();
                showAdminDashboard();
                showAlert('success', 'All admin-submitted student information cleared from local storage.');
            } else {
                 showAlert('warning', 'Student info clearing cancelled.');
            }
        } else {
            showAlert('warning', 'Student info clearing cancelled.');
        }
    }

     // ========================================================================
     // Development Plan Generation Call (Admin Section)
     // ========================================================================
     function generateDevelopmentPlan() {
          console.log("generateDevelopmentPlan called - attempting to use Internal function");
         if (typeof window.generateDevelopmentPlanInternal !== 'function') {
             showAlert('error', 'Development plan generation script (plan.js) not loaded correctly or function missing.');
             console.error('window.generateDevelopmentPlanInternal is not a function');
             return;
         }
         window.generateDevelopmentPlanInternal(showAlert, getClientBranding);
     }

     function copyPlan() {
          console.log("copyPlan called - attempting to use Internal function");
         if (typeof window.copyPlanInternal !== 'function') {
              showAlert('error', 'Plan copying script (plan.js) not loaded correctly or function missing.');
              console.error('window.copyPlanInternal is not a function');
             return;
         }
         window.copyPlanInternal(showAlert);
     }


    // ========================================================================
    // Initialization
    // ========================================================================

    console.log('SCRIPT INFO: Assigning essential functions to window object...');
    // Assign functions needed by HTML onclick attributes
    window.login = login;
    window.confirmLogout = confirmLogout;
    window.goBack = goBack;
    window.showLanguageSelection = showLanguageSelection;
    window.startTest = startTest;
    window.showTest = showTest;
    window.nextInfoStep = nextInfoStep;
    window.previousInfoStep = previousInfoStep;
    window.nextQuestion = nextQuestion;
    window.previousQuestion = previousQuestion;
    window.submitTest = submitTest;
    window.shareOnWhatsApp = shareOnWhatsApp;
    window.copyResultCode = copyResultCode;
    window.downloadCertificate = downloadCertificate;
    window.exportAllToExcel = exportAllToExcel;
    window.clearReports = clearReports;
    window.generateDevelopmentPlan = generateDevelopmentPlan;
    window.copyPlan = copyPlan;
    window.submitStudentInfo = submitStudentInfo;
    window.exportStudentInfoToCSV = exportStudentInfoToCSV;
    window.clearStudentInfo = clearStudentInfo;
    // proceedToDashboard is assigned dynamically via element.onclick, not needed on window

    console.log('SCRIPT INFO: Initializing application state...');
    loadResults();
    loadStudentInfo();
    checkExistingSession();

    console.log("SCRIPT END: Initialization complete.");
});
