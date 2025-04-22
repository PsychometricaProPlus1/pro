// script.js - Frontend for Psychometrica Pro Plus
// Handles UI interactions, test flow. Connects to Cloudflare Worker for Auth + Branding.
// Saves results LOCALLY in the browser only.

document.addEventListener('DOMContentLoaded', () => {
    console.log("SCRIPT START: DOMContentLoaded event fired.");

    // --- Configuration ---
    const BACKEND_URL = 'https://my-auth-worker.equimedia4.workers.dev'; // Your Worker URL
    const RESULTS_STORAGE_KEY = 'psychometric_results';
    const STUDENT_INFO_STORAGE_KEY = 'student_info';

    // --- State Variables ---
    let selectedStandard = '';
    let selectedLanguage = '';
    let studentData = {}; // Holds data for the *current* student taking the test
    let allResults = []; // Holds all past results saved locally
    let allStudentInfo = []; // Holds all student info saved locally by admin
    let currentQuestionIndex = 0;
    let userAnswers = {};
    let currentInfoStep = 0;

    // --- Info Fields Configuration ---
    // Defines the fields collected during the student information steps
     const infoFields = [
        { id: 'student-name', labelEn: "Student's Name", labelMr: 'विद्यार्थ्याचे नाव', type: 'text' },
        { id: 'parent-name', labelEn: "Parent's Name", labelMr: 'पालकांचे नाव', type: 'text' },
        { id: 'mobile', labelEn: 'Mobile (Parent/Guardian)', labelMr: 'मोबाइल (पालक)', type: 'tel', pattern: "\\d{10}" }, // Added pattern for 10 digits
        { id: 'email', labelEn: 'Email (Parent/Guardian)', labelMr: 'ईमेल (पालक)', type: 'email' },
        { id: 'age', labelEn: 'Age', labelMr: 'वय', type: 'number', min: 10, max: 18 }, // Added min/max validation
        { id: 'grade', labelEn: 'Grade', labelMr: 'इयत्ता', type: 'text', readonly: true }, // Grade is set from selection, display only
        {
            id: 'board', labelEn: 'Board', labelMr: 'बोर्ड', type: 'select', options: [
                { value: '', textEn: 'Select Board', textMr: 'बोर्ड निवडा' },
                { value: 'SSC', textEn: 'SSC (Maharashtra State Board)', textMr: 'एसएससी (महाराष्ट्र राज्य मंडळ)' },
                { value: 'CBSE', textEn: 'CBSE', textMr: 'सीबीएसई' },
                { value: 'ICSE', textEn: 'ICSE', textMr: 'आयसीएसई' },
                { value: 'IB', textEn: 'IB', textMr: 'आयबी' },
                { value: 'IGCSE', textEn: 'IGCSE', textMr: 'आयजीसीएसई' },
                { value: 'Other', textEn: 'Other', textMr: 'इतर' } // Added 'Other' option
            ]
        },
         {
            id: 'medium', labelEn: 'Medium of Instruction', labelMr: 'शिक्षणाचे माध्यम', type: 'select', options: [
                { value: '', textEn: 'Select Medium', textMr: 'माध्यम निवडा' },
                { value: 'English', textEn: 'English', textMr: 'इंग्रजी' },
                { value: 'Marathi', textEn: 'Marathi', textMr: 'मराठी' },
                { value: 'Semi-English', textEn: 'Semi-English', textMr: 'सेमी-इंग्रजी' },
                { value: 'Other', textEn: 'Other', textMr: 'इतर' } // Added 'Other' option
            ]
        }
    ];


    // ========================================================================
    // Utility Functions (Alerts, Local Storage Management, UI Reset)
    // ========================================================================

    /**
     * Displays a temporary alert message dynamically.
     * @param {string} type - 'success', 'error', 'warning', 'info'.
     * @param {string} message - The message content.
     */
    function showAlert(type, message) {
        console.log(`ALERT (${type}): ${message}`);
        // Remove any existing dynamic alert first
        const existingAlert = document.querySelector('.alert-dynamic');
        if (existingAlert) existingAlert.remove();

        const alertDiv = document.createElement('div');
        // Add standard alert classes plus a specific class for dynamic ones
        alertDiv.className = `alert alert-${type} alert-dynamic`;
        alertDiv.setAttribute('role', 'alert'); // Accessibility
        // Add appropriate icon based on type
        let iconClass = 'fa-info-circle';
        if (type === 'success') iconClass = 'fa-check-circle';
        if (type === 'error') iconClass = 'fa-times-circle';
        if (type === 'warning') iconClass = 'fa-exclamation-triangle';
        alertDiv.innerHTML = `<i class="fas ${iconClass}"></i> ${message}`; // Add icon to message

        const container = document.querySelector('.container');
        if (container) {
            // Insert after the header for better visibility
            container.insertBefore(alertDiv, container.children[1] || container.firstChild);
        } else {
            document.body.insertBefore(alertDiv, document.body.firstChild); // Fallback
        }

        // Auto-dismiss after a delay
        setTimeout(() => {
            alertDiv.style.opacity = '0'; // Start fade out
            setTimeout(() => alertDiv.remove(), 500); // Remove after fade out animation
        }, 6000); // Increased duration slightly for copy instructions
    }

    /** Loads test results from local storage into the allResults array. */
    function loadResults() {
        try {
            const storedResults = localStorage.getItem(RESULTS_STORAGE_KEY);
            allResults = storedResults ? JSON.parse(storedResults) : [];
            console.log('Loaded results count:', allResults.length);
        } catch (error) {
            console.error('Error loading results from localStorage:', error);
            allResults = []; // Reset to empty array on error
            showAlert('error', 'Failed to load previous results. Storage might be corrupted.');
        }
    }

    /** Saves the current allResults array to local storage. */
    function saveResults() {
        try {
            localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(allResults));
            console.log('Results saved to localStorage:', allResults.length);
        } catch (error) {
            console.error('Error saving results to localStorage:', error);
            showAlert('error', 'Failed to save results. Storage might be full or restricted.');
        }
    }

    /** Loads student information from local storage into the allStudentInfo array. */
    function loadStudentInfo() {
        try {
            const storedInfo = localStorage.getItem(STUDENT_INFO_STORAGE_KEY);
            allStudentInfo = storedInfo ? JSON.parse(storedInfo) : [];
            console.log('Loaded student info count:', allStudentInfo.length);
        } catch (error) {
            console.error('Error loading student info from localStorage:', error);
            allStudentInfo = []; // Reset on error
            showAlert('error', 'Failed to load saved student information.');
        }
    }

    /** Saves the current allStudentInfo array to local storage. */
    function saveStudentInfo() {
        try {
            localStorage.setItem(STUDENT_INFO_STORAGE_KEY, JSON.stringify(allStudentInfo));
            console.log('Student info saved to localStorage:', allStudentInfo.length);
        } catch (error) {
            console.error('Error saving student info to localStorage:', error);
            showAlert('error', 'Failed to save student information.');
        }
    }

     /**
      * Resets the UI to the initial login screen state.
      * Clears session storage and temporary state variables.
      * Does NOT clear locally stored results or student info.
      */
    function resetUI() {
        console.log('Resetting UI to login screen.');
        // Clear session storage (login state)
        sessionStorage.removeItem('sessionToken');
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('clientBranding');

        // Hide all main content sections
        const sections = [
            'login-section', 'standard-selection', 'language-selection',
            'info-section', 'instructions-section', 'test-section',
            'results-section', 'admin-section', 'welcome-section'
        ];
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) section.classList.add('hidden');
        });

        // Show only the login section
        const loginSection = document.getElementById('login-section');
        if (loginSection) loginSection.classList.remove('hidden');

        // Clear login form
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';

        // Reset current test state variables
        currentInfoStep = 0;
        currentQuestionIndex = 0;
        userAnswers = {};
        studentData = {}; // Clear data for the student currently being processed
        selectedStandard = '';
        selectedLanguage = '';
    }


    // ========================================================================
    // Branding Functions
    // ========================================================================

    /**
     * Retrieves client branding information from session storage.
     * @returns {object|null} Branding object or null if not found/error.
     */
    function getClientBranding() {
        const brandingString = sessionStorage.getItem('clientBranding');
        if (!brandingString) return null; // Return null if no branding info stored
        try {
            return JSON.parse(brandingString);
        } catch (e) {
            console.error("Error parsing branding info from sessionStorage:", e);
            sessionStorage.removeItem('clientBranding'); // Clear potentially corrupted data
            return null; // Return null on parsing error
        }
    }

    /**
     * Updates the branding footer element on all currently visible sections.
     * Uses default branding if none is found in session storage.
     */
    function updateBrandingThroughout() {
        console.log('Attempting to update branding on visible sections...');
        const branding = getClientBranding();
        // Use default branding as a fallback
        const displayBranding = branding || { name: 'Psychometrica Pro Plus', address: 'N/A', phone: 'N/A' };

        // Ensure there's at least a name to display
        if (!displayBranding.name) {
             console.warn("No valid branding name found (retrieved or default) to update UI.");
             return;
        }

        console.log("Using branding for display:", displayBranding);
        const sections = [ // IDs of sections that should have a branding footer
            'standard-selection', 'language-selection', 'info-section',
            'instructions-section', 'test-section', 'results-section', 'admin-section'
        ];

        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            // Only update if the section exists and is NOT hidden
            if (section && !section.classList.contains('hidden')) {
                // Remove any previously added branding footer to prevent duplicates
                let existingBrandingFooter = section.querySelector('.branding-footer');
                if (existingBrandingFooter) existingBrandingFooter.remove();

                // Create and append the new footer
                const brandingDiv = document.createElement('div');
                brandingDiv.className = 'branding-footer';
                // Populate with branding info, using 'N/A' for missing fields
                brandingDiv.innerHTML = `
                    <p><i class="fas fa-building"></i> ${displayBranding.name}, ${displayBranding.address || 'Address N/A'} | <i class="fas fa-phone"></i> ${displayBranding.phone || 'Phone N/A'}</p>
                `;
                section.appendChild(brandingDiv); // Add footer to the end of the section
            }
        });

        // Special update for the contact message paragraph within the results section
        const resultsSection = document.getElementById('results-section');
        if (resultsSection && !resultsSection.classList.contains('hidden')) {
            const contactMessageP = resultsSection.querySelector('.contact-message p');
            if (contactMessageP) {
                // Update the text with current branding info
                contactMessageP.innerHTML = `<i class="fas fa-info-circle"></i> For detailed discussion and counseling regarding the progress plan, please contact ${displayBranding.name} at <i class="fas fa-phone"></i> <strong>${displayBranding.phone || 'N/A'}</strong>. Share the result with admin for further processing.`;
            }
        }
    }

    /** Displays a temporary welcome screen with branding info after successful login. */
    function showWelcomeScreen() {
        console.log('showWelcomeScreen: Function called.');
        const branding = getClientBranding();
        const userRole = sessionStorage.getItem('userRole');

        // Skip welcome screen if no branding name is available
        if (!branding || !branding.name) {
            console.warn('showWelcomeScreen: Skipping welcome screen: No branding name.');
            handlePostLoginNavigation(userRole); // Navigate directly
            return;
        }

        const container = document.querySelector('.container');
        if (!container) {
            console.error("showWelcomeScreen: Container element not found.");
            handlePostLoginNavigation(userRole); // Navigate directly as fallback
            return;
        }

        // Remove any existing welcome section first
        const existingWelcome = document.getElementById('welcome-section');
        if (existingWelcome) existingWelcome.remove();

        // Create the welcome section element
        const welcomeSection = document.createElement('section');
        welcomeSection.id = 'welcome-section'; // Assign ID for potential styling
        welcomeSection.className = 'welcome-fade-in'; // Add class for entry animation
        welcomeSection.classList.add('hidden'); // Start hidden before adding to DOM
        welcomeSection.innerHTML = `
            <h2>Welcome to ${branding.name}</h2>
            <p><i class="fas fa-map-marker-alt"></i> ${branding.address || 'Address not available'}</p>
            <p><i class="fas fa-phone"></i> ${branding.phone || 'Contact not available'}</p>
        `;

        // Insert the welcome section after the header
        const header = container.querySelector('header');
        if (header) {
            header.insertAdjacentElement('afterend', welcomeSection);
        } else {
            container.insertBefore(welcomeSection, container.firstChild); // Fallback insertion
        }
        // Make it visible *after* inserting into DOM to allow animation
        setTimeout(() => welcomeSection.classList.remove('hidden'), 10); // Small delay

        console.log('showWelcomeScreen: Welcome section displayed.');

        // Set timeout for fade out and removal
        setTimeout(() => {
            welcomeSection.classList.add('welcome-fade-out'); // Trigger fade-out animation
            // Wait for animation to finish before removing and navigating
            setTimeout(() => {
                welcomeSection.remove();
                const roleForNav = sessionStorage.getItem('userRole'); // Get role again just in case
                handlePostLoginNavigation(roleForNav); // Navigate to appropriate section
            }, 500); // Duration should match CSS fade-out animation time
        }, 2500); // Display welcome message for 2.5 seconds
    }

    /** Navigates to the appropriate section based on user role after login/welcome. */
    function handlePostLoginNavigation(role) {
        console.log(`handlePostLoginNavigation: Function called with role: "${role}"`);
        const loginSection = document.getElementById('login-section');
        if (loginSection) loginSection.classList.add('hidden'); // Ensure login form is hidden

        if (role === 'admin') {
            console.log("Navigating to Admin Dashboard.");
            showAdminDashboard(); // Function to display admin panel
        } else if (role === 'user') {
            console.log("Navigating to Standard Selection.");
            const standardSection = document.getElementById('standard-selection');
            if (standardSection) {
                standardSection.classList.remove('hidden');
                updateBrandingThroughout(); // Apply branding to the newly visible section
            } else {
                console.error('Standard selection section (#standard-selection) not found!');
                showAlert('error', 'Error navigating to the next step. UI component missing.');
                resetUI(); // Go back to login if navigation target is missing
            }
        } else {
            // Handle unexpected or missing roles
            console.warn(`Unknown or null role ("${role}") received after login, navigating back to login.`);
            showAlert('error', 'Login successful but user role is invalid. Please contact support.');
            resetUI(); // Force back to login for security/safety
        }
    }


    // ========================================================================
    // Authentication & Session Management (Worker Interaction)
    // ========================================================================

    /** Handles the login process by sending credentials to the backend worker. */
    async function login() {
        console.log("login() function started...");
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const loginButton = document.querySelector('#login-section .btn.primary'); // Get the login button

        // Basic input validation
        if (!usernameInput || !passwordInput) {
            showAlert('error', 'Login form elements are missing.');
            return;
        }
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        if (!username || !password) {
            showAlert('error', 'Please enter both username and password.');
            return;
        }

        // --- UI: Show Loading State ---
        if(loginButton) {
            loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            loginButton.disabled = true;
        }

        const payload = { username, password };
        console.log('DEBUG: Payload being sent to Worker:', JSON.stringify(payload));

        // --- Network Request with Timeout ---
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            console.warn('Login request timed out.');
        }, 20000); // 20-second timeout

        try {
            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                mode: 'cors', // Worker must handle CORS headers
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId); // Clear the timeout if fetch succeeded
            console.log('Login response status:', response.status);

            // --- Handle Response ---
            if (response.status === 401) { // Unauthorized
                const result = await response.json().catch(() => ({}));
                showAlert('error', result?.error || 'Invalid username or password.');
                if (passwordInput) passwordInput.value = ''; // Clear password field only
            } else if (!response.ok) { // Other Server Errors (5xx, etc.)
                const errorText = await response.text().catch(()=> `Server error ${response.status}`);
                console.error('Server error response text:', errorText);
                throw new Error(`Login failed. Server responded with status: ${response.status}`);
            } else { // Successful Response (200 OK)
                const result = await response.json();
                console.log('Login API response parsed:', result);

                if (result && result.success === true && result.role) {
                    showAlert('success', 'Login Successful!');
                    // Store session info
                    sessionStorage.setItem('userRole', result.role);
                    if (result.branding) {
                        sessionStorage.setItem('clientBranding', JSON.stringify(result.branding));
                    } else {
                        sessionStorage.removeItem('clientBranding'); // Clear if not provided
                    }
                    sessionStorage.removeItem('sessionToken'); // No token used in this version

                    // Hide login and show welcome screen -> navigation
                    const loginSection = document.getElementById('login-section');
                    if (loginSection) loginSection.classList.add('hidden');
                    showWelcomeScreen();
                } else {
                    // Handle cases where worker responds 200 OK but indicates failure
                    showAlert('error', result?.error || 'Login validation failed on server.');
                    if (passwordInput) passwordInput.value = ''; // Clear password
                }
            }

        } catch (error) {
            console.error('Login fetch/processing error:', error);
            clearTimeout(timeoutId); // Ensure timeout is cleared on error too
            if (error.name === 'AbortError') {
                showAlert('error', 'Login request timed out. Please check your connection and try again.');
            } else {
                // Generic network/fetch error
                showAlert('error', `Login failed: ${error.message}. Please check connection or contact support.`);
            }
        } finally {
            // --- UI: Restore Button State ---
            if(loginButton) {
                loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
                loginButton.disabled = false;
            }
        }
    }

    /** Confirms and performs logout by resetting the UI. */
    function confirmLogout() {
        // Consider using a custom modal for better UX if available
        if (confirm('Are you sure you want to logout?')) {
            console.log('Logging out user.');
            resetUI(); // Resets UI and clears session storage
            showAlert('success', 'You have been logged out.');
        }
    }

    // ========================================================================
    // Test Flow Logic (Standard -> Language -> Info -> Instructions -> Test -> Results)
    // ========================================================================

    /** Shows the language selection screen after a standard is chosen. */
    function showLanguageSelection() {
        const standardSelect = document.getElementById('standard');
        selectedStandard = standardSelect?.value;
        if (!selectedStandard) {
            showAlert('warning', 'Please select a grade first.'); // Use warning level
            return;
        }
        console.log('Selected standard:', selectedStandard);
        const standardSection = document.getElementById('standard-selection');
        const languageSection = document.getElementById('language-selection');
        if (standardSection && languageSection) {
            standardSection.classList.add('hidden');
            languageSection.classList.remove('hidden');
            updateBrandingThroughout(); // Update branding for the new section
        } else {
            showAlert('error', 'UI Error: Could not navigate to language selection.');
            console.error("Missing sections for language selection:", {standardSection, languageSection});
        }
    }

    /** Starts the test process after language selection, moving to info collection. */
    function startTest(language) {
        selectedLanguage = language;
        console.log('Selected language:', selectedLanguage);

        // Pre-populate grade in studentData object
        studentData = { grade: selectedStandard }; // Reset student data except for grade

        const languageSection = document.getElementById('language-selection');
        const infoSection = document.getElementById('info-section');
        if (languageSection && infoSection) {
            languageSection.classList.add('hidden');
            infoSection.classList.remove('hidden');
            currentInfoStep = 0; // Start info collection from the beginning
            loadInfoStep(currentInfoStep); // Load the first info field
            updateBrandingThroughout();
        } else {
            showAlert('error', 'UI Error: Could not navigate to student information.');
             console.error("Missing sections for info start:", {languageSection, infoSection});
        }
    }

    /** Loads the appropriate student information field based on the current step index. */
    function loadInfoStep(stepIndex) {
        const infoStepDiv = document.getElementById('info-step');
        const backBtn = document.getElementById('info-back-btn');
        const nextBtn = document.getElementById('info-next-btn');

        if (!infoStepDiv || !backBtn || !nextBtn) {
            showAlert('error', 'Info section UI elements are missing.');
            return;
        }
        if (stepIndex < 0 || stepIndex >= infoFields.length) {
            console.error("Invalid info step index requested:", stepIndex);
            return; // Prevent errors with invalid index
        }

        const field = infoFields[stepIndex];
        const isMarathi = selectedLanguage === 'marathi';
        const labelText = isMarathi ? field.labelMr : field.labelEn;
        let inputHtml = '';
        const previousValue = studentData[field.id] || ''; // Get previously entered value if navigating back

        // Generate HTML based on field type
        if (field.type === 'select') {
            inputHtml = `<select id="${field.id}" aria-label="${labelText}" ${field.readonly ? 'disabled' : ''}>`;
            inputHtml += field.options.map(opt =>
                `<option value="${opt.value}" ${previousValue === opt.value ? 'selected' : ''}>${isMarathi ? opt.textMr : opt.textEn}</option>`
            ).join('');
            inputHtml += `</select>`;
        } else if (field.id === 'grade') {
            // Display grade as non-editable text, store value in hidden input
            inputHtml = `<p class="readonly-field">${selectedStandard}</p><input type="hidden" id="grade" value="${selectedStandard}">`;
        } else {
            // Standard input types (text, tel, email, number)
            inputHtml = `<input
                type="${field.type}"
                id="${field.id}"
                placeholder="${labelText}"
                aria-label="${labelText}"
                value="${previousValue}"
                ${field.readonly ? 'readonly' : ''}
                ${field.min ? `min="${field.min}"` : ''}
                ${field.max ? `max="${field.max}"` : ''}
                ${field.pattern ? `pattern="${field.pattern}" title="Please enter a valid 10-digit number"` : ''}
                required>`; // Add required attribute for browser validation hints
        }

        // Update the info step container
        infoStepDiv.innerHTML = `<div class="form-group">
                                    <label for="${field.id}">${labelText}:</label>
                                    ${inputHtml}
                                 </div>`;

        // Update navigation buttons
        backBtn.style.display = stepIndex === 0 ? 'none' : 'inline-block'; // Hide back on first step
        const nextButtonText = stepIndex === infoFields.length - 1 ? (isMarathi ? 'पुष्टी करा' : 'Confirm & Proceed') : (isMarathi ? 'पुढे' : 'Next');
        nextBtn.innerHTML = `<i class="fas ${stepIndex === infoFields.length - 1 ? 'fa-check' : 'fa-arrow-right'}"></i> ${nextButtonText}`;
    }

    /** Validates the current info step and moves to the next step or instructions. */
    function nextInfoStep() {
        if (currentInfoStep >= infoFields.length) return; // Prevent proceeding beyond last step

        const field = infoFields[currentInfoStep];
        const inputElement = document.getElementById(field.id);
        let value = '';

        // Get value, handling the special case for 'grade'
        if (field.id === 'grade') {
            value = selectedStandard; // Grade is pre-set
        } else if (inputElement) {
            value = inputElement.value.trim();
        } else {
             console.error(`Input element not found for id: ${field.id} in nextInfoStep`);
             showAlert('error', 'An error occurred finding the input field.');
             return;
        }

        // --- Input Validation ---
        const isMarathi = selectedLanguage === 'marathi';
        const labelText = isMarathi ? field.labelMr : field.labelEn;

        // Required field check (skip for pre-filled grade)
        if (!value && field.id !== 'grade') {
            showAlert('warning', `${isMarathi ? 'कृपया' : 'Please enter'} ${labelText}.`);
            inputElement?.focus(); // Focus the problematic field
            return;
        }
        // Specific type validations
        if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            showAlert('warning', isMarathi ? 'कृपया वैध ईमेल प्रविष्ट करा.' : 'Please enter a valid email address.');
             inputElement?.focus();
            return;
        }
        if (field.type === 'tel' && value && !/^\d{10}$/.test(value)) {
            showAlert('warning', isMarathi ? 'कृपया वैध १०-अंकी मोबाइल नंबर प्रविष्ट करा.' : 'Please enter a valid 10-digit mobile number.');
             inputElement?.focus();
            return;
        }
        if (field.type === 'number' && field.id === 'age' && value) {
            const ageNum = parseInt(value, 10);
            if (isNaN(ageNum) || ageNum < (field.min || 10) || ageNum > (field.max || 18)) {
                 showAlert('warning', isMarathi ? `वय ${field.min || 10} आणि ${field.max || 18} दरम्यान असणे आवश्यक आहे.` : `Age must be between ${field.min || 10} and ${field.max || 18}.`);
                 inputElement?.focus();
                return;
            }
        }

        // Store the validated data
        studentData[field.id] = value;
        console.log("Updated studentData:", studentData);

        // --- Navigation ---
        currentInfoStep++;
        if (currentInfoStep < infoFields.length) {
            // Load the next information step
            loadInfoStep(currentInfoStep);
        } else {
            // All info collected, navigate to Instructions
            const infoSection = document.getElementById('info-section');
            const instructionsSection = document.getElementById('instructions-section');
            if (infoSection && instructionsSection) {
                infoSection.classList.add('hidden');
                instructionsSection.classList.remove('hidden');
                const instructionsContent = document.getElementById('instructions-content');
                if (instructionsContent) {
                    // Populate instructions dynamically
                    instructionsContent.innerHTML = selectedLanguage === 'marathi'
                        ? `<h4>मार्गदर्शन सूचना</h4><p>प्रिय विद्यार्थी,</p><p>ही चाचणी तुम्हाला तुमच्या आवडी आणि क्षमता समजून घेण्यास मदत करेल. कृपया खालील सूचना काळजीपूर्वक वाचा:</p><ul><li><i class="fas fa-check-circle"></i> सर्व प्रश्नांची उत्तरे प्रामाणिकपणे द्या. काही प्रश्नांसाठी कोणतेही बरोबर किंवा चूक उत्तर नाही.</li><li><i class="fas fa-check-circle"></i> प्रत्येक प्रश्नासाठी तुम्हाला सर्वात योग्य वाटणारा पर्याय निवडा.</li><li><i class="fas fa-check-circle"></i> कोणतीही वेळ मर्यादा नाही, त्यामुळे विचारपूर्वक उत्तरे द्या.</li><li><i class="fas fa-check-circle"></i> चाचणी पूर्ण झाल्यावर तुम्हाला तुमचा निकाल आणि मार्गदर्शन मिळेल.</li></ul><p>तुम्हाला परीक्षेसाठी शुभेच्छा!</p>`
                        : `<h4>Instructions</h4><p>Dear Student,</p><p>This test will help you understand your interests and abilities. Please read the instructions carefully:</p><ul><li><i class="fas fa-check-circle"></i> Answer all questions honestly. For some sections, there are no right or wrong answers.</li><li><i class="fas fa-check-circle"></i> Choose the option that best describes you for each question.</li><li><i class="fas fa-check-circle"></i> There is no time limit, so take your time to think.</li><li><i class="fas fa-check-circle"></i> You will receive your results and recommendations upon completion.</li></ul><p>Best of luck!</p>`;
                }
                updateBrandingThroughout(); // Apply branding to instructions section
            } else {
                showAlert('error', 'UI Error: Could not navigate to instructions.');
                console.error("Missing sections for instruction navigation:", {infoSection, instructionsSection});
            }
        }
    }

    /** Navigates back to the previous information step. */
    function previousInfoStep() {
        if (currentInfoStep > 0) {
            currentInfoStep--;
            loadInfoStep(currentInfoStep); // Load the previous step's field
        }
    }

    /**
     * Navigates back from the current section to the previous logical section in the flow.
     * @param {string} currentSectionId - The ID of the section to navigate back FROM.
     */
    function goBack(currentSectionId) {
        const currentSection = document.getElementById(currentSectionId);
        if (!currentSection) {
             console.error(`goBack: Current section with ID "${currentSectionId}" not found.`);
             return;
        }

        let prevSectionId;

        // Determine the previous section based on the current one
        switch (currentSectionId) {
            case 'language-selection':
                prevSectionId = 'standard-selection';
                break;
            case 'info-section':
                prevSectionId = 'language-selection';
                // No need to reset info step, allow editing previous fields
                break;
            case 'instructions-section':
                prevSectionId = 'info-section';
                // Go back to the *last* info step for review/edit before instructions
                currentInfoStep = infoFields.length - 1;
                loadInfoStep(currentInfoStep); // Reload last info step
                break;
            case 'test-section':
                // Confirm before leaving the test
                 if (confirm(selectedLanguage === 'marathi' ? 'तुम्ही चाचणीमधून बाहेर पडून सूचनांवर परत जाऊ इच्छिता? तुमची प्रगती जतन केली जाणार नाही.' : 'Are you sure you want to exit the test and go back to instructions? Your progress will not be saved.')) {
                     prevSectionId = 'instructions-section';
                     // Reset test state as progress is lost
                     currentQuestionIndex = 0;
                     userAnswers = {};
                 } else {
                     return; // User cancelled, stay on test page
                 }
                break;
            default:
                console.warn("goBack called from an unhandled section:", currentSectionId);
                return; // No defined back action for this section
        }

        const prevSection = document.getElementById(prevSectionId);
        if (prevSection) {
            currentSection.classList.add('hidden');
            prevSection.classList.remove('hidden');
            updateBrandingThroughout(); // Update branding on the newly visible section
        } else {
            showAlert('error', 'Navigation Error: Could not find the previous section to go back to.');
            console.error("Error finding previous section for goBack:", { currentSectionId, prevSectionId });
        }
    }

    /** Hides instructions and shows the test section, loading the first question. */
    function showTest() {
        const instructionsSection = document.getElementById('instructions-section');
        const testSection = document.getElementById('test-section');
        if (instructionsSection && testSection) {
            instructionsSection.classList.add('hidden');
            testSection.classList.remove('hidden');
            currentQuestionIndex = 0; // Reset to first question
            userAnswers = {}; // Clear answers for a fresh test start
            loadQuestion(currentQuestionIndex); // Load the first question
            updateBrandingThroughout(); // Apply branding
        } else {
            showAlert('error', 'UI Error: Could not navigate to the test section.');
            console.error("Missing sections for test start:", {instructionsSection, testSection});
        }
    }

    /** Loads and displays the question at the given index. */
    function loadQuestion(index) {
        // Determine the correct set of questions based on selected standard
        const questionsSet = (selectedStandard >= 5 && selectedStandard <= 8) ? window.questions5to8 :
                             (selectedStandard >= 9 && selectedStandard <= 10) ? window.questions9to10 : null;

        if (!questionsSet || !questionsSet[selectedLanguage]) {
            showAlert('error', 'Questions data could not be loaded. Please check configuration.');
            console.error("Questions set not found for:", { selectedStandard, selectedLanguage });
            return;
        }

        const questions = questionsSet[selectedLanguage];
        // Validate index
        if (index < 0 || index >= questions.length) {
             console.error("Invalid question index:", index);
             return;
        }
        const question = questions[index];
        const questionsDiv = document.getElementById('questions'); // Container for the question

        if (!question || !questionsDiv) {
            showAlert('error', 'Error loading question data or UI element.');
            console.error("Error loading question content:", { index, question, questionsDiv });
            return;
        }

        // Generate HTML for the radio button options
        const optionsHtml = question.options.map((option, i) => `
            <label class="option-label">
                <input type="radio" name="q${index}" value="${option}" ${userAnswers[index] === option ? 'checked' : ''}>
                <span>${option}</span>
            </label>
        `).join('');

        // --- FIX for Double Question Number ---
        let questionText = question.text;
        // Remove existing number and dot (like "1. ") if present at the start
        questionText = questionText.replace(/^\d+\.\s*/, '');
        // Prepend the correct number
        questionText = `${index + 1}. ${questionText}`;
        // --- End Fix ---


        // Update the questions container with the current question and options
        questionsDiv.innerHTML = `
            <div class="question" data-question-index="${index}">
                <p class="question-text">${questionText}</p>
                <div class="options">${optionsHtml}</div>
            </div>`;

        // Update the progress bar and navigation buttons
        updateProgressAndButtons(index, questions.length);
    }

    /** Updates the progress bar display and visibility of test navigation buttons. */
    function updateProgressAndButtons(currentIndex, totalQuestions) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const backBtn = document.getElementById('back-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');

        if (progressFill && progressText && backBtn && nextBtn && submitBtn) {
            // Calculate and display progress percentage
            const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Question ${currentIndex + 1} of ${totalQuestions}`;

            // Show/hide navigation buttons based on current question index
            backBtn.style.display = currentIndex === 0 ? 'none' : 'inline-block'; // Hide back on first question
            nextBtn.style.display = currentIndex === totalQuestions - 1 ? 'none' : 'inline-block'; // Hide next on last question
            submitBtn.style.display = currentIndex === totalQuestions - 1 ? 'inline-block' : 'none'; // Show submit only on last question
        } else {
            console.error("UI Error: Progress bar or test navigation buttons not found.");
        }
    }

    /** Stores the selected answer and loads the next question. */
    function nextQuestion() {
        const questionsSet = (selectedStandard >= 5 && selectedStandard <= 8) ? window.questions5to8 :
                             (selectedStandard >= 9 && selectedStandard <= 10) ? window.questions9to10 : null;
        if (!questionsSet || !questionsSet[selectedLanguage]) return; // Guard clause

        const questions = questionsSet[selectedLanguage];

        // Find the selected radio button for the current question
        const selectedOption = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`);
        if (!selectedOption) {
            // Prompt user to select an option before proceeding
            showAlert('warning', selectedLanguage === 'marathi' ? 'पुढे जाण्यापूर्वी कृपया एक पर्याय निवडा.' : 'Please select an option before proceeding.');
            return;
        }

        // Store the selected answer value
        userAnswers[currentQuestionIndex] = selectedOption.value;

        // Navigate to the next question if not already at the end
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            loadQuestion(currentQuestionIndex); // Load the next question
        } else {
            // Should not typically reach here as 'Next' button is hidden on last question
            console.log("Reached the end of questions. Submit button should be used.");
        }
    }

    /** Loads the previous question. */
    function previousQuestion() {
        // Optional: Store the answer of the current question before going back
        const currentSelectedOption = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`);
        if (currentSelectedOption) {
            userAnswers[currentQuestionIndex] = currentSelectedOption.value;
        }

        // Go back if not on the first question
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            loadQuestion(currentQuestionIndex); // Load the previous question
        }
    }

    /** Submits the test, calculates results, saves them, and displays the results section. */
    async function submitTest() {
        const questionsSet = (selectedStandard >= 5 && selectedStandard <= 8) ? window.questions5to8 :
                             (selectedStandard >= 9 && selectedStandard <= 10) ? window.questions9to10 : null;
        if (!questionsSet || !questionsSet[selectedLanguage]) {
            showAlert('error', 'Questions data not found. Cannot submit.');
            return;
        }
        const questions = questionsSet[selectedLanguage];

        // Ensure an option is selected for the last question before submitting
        const selectedOption = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`);
        if (currentQuestionIndex === questions.length - 1 && !selectedOption) {
             showAlert('warning', selectedLanguage === 'marathi' ? 'सबमिट करण्यापूर्वी कृपया शेवटच्या प्रश्नासाठी एक पर्याय निवडा.' : 'Please select an option for the last question before submitting.');
            return;
        }
        // Store the last answer if one was selected
        if (selectedOption) {
            userAnswers[currentQuestionIndex] = selectedOption.value;
        }

        // --- UI: Show Loading State on Button ---
        const submitButton = document.getElementById('submit-btn');
        if (submitButton) {
            submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Submitting...`;
            submitButton.disabled = true;
        }

        try {
             // Optional delay allows UI to update with loading state
             await new Promise(resolve => setTimeout(resolve, 150));

            // --- Calculate Results ---
            if (typeof window.calculateResults !== 'function') {
                 console.error("calculateResults function is not defined on window object.");
                 throw new Error("Calculation function is missing or not loaded correctly.");
            }
            // Call the calculation function (defined in results.js)
            const result = window.calculateResults(parseInt(selectedStandard), selectedLanguage, userAnswers);
            console.log('Calculated result object:', result);

            // Validate the structure of the returned result
            if (!result || !result.detailedResult || !result.detailedResult.scores) {
                 console.error("Invalid result structure returned from calculateResults:", result);
                throw new Error('Calculation function returned an invalid result structure.');
            }

            // --- Save Result Locally ---
            const resultData = {
                studentData: studentData || {}, // Use data collected in info steps
                result: result.detailedResult, // Store the detailed part
                date: result.date,             // Store the date
                summary: result.summary        // Store the summary string
            };
            allResults.push(resultData); // Add the new result to the array
            saveResults();               // Save the updated array to local storage
            console.log("Result saved locally.");

            // --- Display Results Section ---
            const testSection = document.getElementById('test-section');
            const resultsSection = document.getElementById('results-section');
            const resultContent = document.getElementById('result-content');
            const trophySign = document.getElementById('trophy-sign');

            if (testSection && resultsSection && resultContent && trophySign) {
                testSection.classList.add('hidden'); // Hide test section
                resultsSection.classList.remove('hidden'); // Show results section

                // --- Trophy Display Logic ---
                const aptitudePercentage = result.detailedResult.scores?.percentage ?? 0;
                const isAptitudeHighScore = selectedStandard <= 8 && aptitudePercentage > 80;
                const scores910 = result.detailedResult.scores;
                 const riasecScores = [scores910?.realistic, scores910?.investigative, scores910?.artistic, scores910?.social, scores910?.enterprising, scores910?.conventional].map(s => s ?? 0);
                 const isInterestHighScore = selectedStandard > 8 && Math.max(...riasecScores) > 30; // Example threshold

                trophySign.style.display = (isAptitudeHighScore || isInterestHighScore) ? 'block' : 'none';

                // --- Build Personality Profile HTML (Grades 5-8 Only) ---
                let personalityHtml = '';
                if (selectedStandard <= 8 && result.detailedResult.personalityProfile) {
                    const profile = result.detailedResult.personalityProfile;
                     const lang = selectedLanguage;
                    // Helper to create list items for the profile
                    const formatTrait = (traitKey, labelEn, labelMr) => {
                        const value = profile[traitKey];
                        if (!value) return ''; // Don't display if no value
                        const label = (lang === 'marathi') ? labelMr : labelEn;
                        // Assign icons based on trait key
                        let iconClass = 'fa-question-circle';
                        if (traitKey === 'sociability') iconClass = 'fa-users';
                        if (traitKey === 'openness') iconClass = 'fa-lightbulb';
                        if (traitKey === 'agreeableness') iconClass = 'fa-handshake';
                        if (traitKey === 'persistence') iconClass = 'fa-forward'; // Corrected icon
                        if (traitKey === 'anxiety') iconClass = 'fa-heartbeat';
                        if (traitKey === 'artistic') iconClass = 'fa-paint-brush';
                        if (traitKey === 'investigative') iconClass = 'fa-search';
                        return `<p><strong><i class="fas ${iconClass}"></i> ${label}:</strong> ${value}</p>`;
                    };
                    // Construct the HTML block
                    personalityHtml = `
                        <div class="result-details personality-section">
                            <h4>Basic Personality Insights</h4>
                            ${formatTrait('sociability', 'Sociability', 'सामाजिकता')}
                            ${formatTrait('openness', 'Openness/Curiosity', 'मोकळेपणा/जिज्ञासा')}
                            ${formatTrait('agreeableness', 'Agreeableness', 'सहमतता')}
                            ${formatTrait('persistence', 'Persistence', 'चिकाटी')}
                            ${formatTrait('anxiety', 'Anxiety Level', 'चिंता पातळी')}
                            ${formatTrait('artistic', 'Artistic Interest', 'कलात्मक आवड')}
                            ${formatTrait('investigative', 'Investigative Interest', 'शोधक आवड')}
                        </div>`;
                }

                // --- Build Score Details HTML ---
                let scoreDetailsHtml = '';
                if (result.detailedResult.scores) {
                    if (selectedStandard <= 8) { // Aptitude for 5-8
                        scoreDetailsHtml = `
                            <p><strong><i class="fas fa-bullseye"></i> Aptitude Score:</strong> ${result.detailedResult.scores.percentage?.toFixed(1) ?? 'N/A'}%</p>
                            <p class="score-breakdown"><em>(Scored ${result.detailedResult.scores.score ?? 'N/A'} / ${result.detailedResult.scores.scoredQuestions ?? 'N/A'} Aptitude Questions)</em></p>
                        `;
                    } else { // RIASEC for 9-10
                        const scores910 = result.detailedResult.scores;
                        scoreDetailsHtml = `
                            <div class="riasec-scores">
                                <p><strong>Realistic:</strong> ${scores910.realistic ?? 'N/A'}</p>
                                <p><strong>Investigative:</strong> ${scores910.investigative ?? 'N/A'}</p>
                                <p><strong>Artistic:</strong> ${scores910.artistic ?? 'N/A'}</p>
                                <p><strong>Social:</strong> ${scores910.social ?? 'N/A'}</p>
                                <p><strong>Enterprising:</strong> ${scores910.enterprising ?? 'N/A'}</p>
                                <p><strong>Conventional:</strong> ${scores910.conventional ?? 'N/A'}</p>
                            </div>`;
                    }
                }

                // --- Assemble Final Result Content ---
                // REMOVED the comment strings like {/* Insert score details */}
                resultContent.innerHTML = `
                    <div class="result-details main-results">
                        <p><strong><i class="fas fa-user"></i> Student Name:</strong> ${studentData['student-name'] || 'N/A'}</p>
                        <p><strong><i class="fas fa-graduation-cap"></i> Grade:</strong> ${studentData.grade || 'N/A'}</p>
                        <p><strong><i class="fas fa-calendar-alt"></i> Date:</strong> ${result.date || 'N/A'}</p>
                        <p style="grid-column: 1 / -1;"><strong><i class="fas fa-clipboard-list"></i> Summary:</strong> ${result.summary || 'N/A'}</p>
                         ${scoreDetailsHtml}
                        <p style="grid-column: 1 / -1;"><strong><i class="fas fa-chart-bar"></i> Analysis:</strong> ${result.detailedResult.analysis || 'N/A'}</p>
                    </div>

                    ${personalityHtml}

                    <div class="recommendations-container">
                        <div class="recommendations-toggle"><i class="fas fa-chevron-down"></i> Show Recommendations <i class="fas fa-chevron-down"></i></div>
                        <ul class="recommendations-list">
                            ${(result.detailedResult.recommendations || []).map(rec => `<li><i class="fas fa-star"></i> ${rec}</li>`).join('')}
                        </ul>
                    </div>`;

                // Re-attach event listener for the recommendations toggle button
                const toggleButton = resultContent.querySelector('.recommendations-toggle');
                if (toggleButton) {
                    toggleButton.addEventListener('click', () => toggleRecommendations(toggleButton));
                } else {
                    console.warn("Recommendations toggle button not found after rendering results.");
                }
                updateBrandingThroughout(); // Apply branding to the results section

            } else {
                // Handle case where results section elements are missing
                console.error('Error displaying results - one or more container elements not found:',
                    { testSection, resultsSection, resultContent, trophySign });
                showAlert('error', 'Error displaying results area. UI components missing.');
            }
        } catch (error) {
            // Catch errors during calculation or display
            console.error('Error during submitTest process:', error);
            showAlert('error', `Error calculating or displaying results. Details: ${error.message}`);
        } finally {
            // --- UI: Restore Submit Button State ---
            if (submitButton) {
                submitButton.innerHTML = `<i class="fas fa-check"></i> Submit`;
                submitButton.disabled = false;
            }
        }
    }

    /** Toggles the visibility of the recommendations list and updates the toggle button text/icon. */
    function toggleRecommendations(toggleButton) {
        // Find the list relative to the button (assuming it's the next sibling)
        const recommendationsList = toggleButton.nextElementSibling;
        if (recommendationsList && recommendationsList.classList.contains('recommendations-list')) {
            const isOpening = !recommendationsList.classList.contains('active');
            recommendationsList.classList.toggle('active'); // Toggle the class that controls visibility (e.g., max-height)
            // Update button text and icons based on state
            toggleButton.innerHTML = isOpening
                ? '<i class="fas fa-chevron-up"></i> Hide Recommendations <i class="fas fa-chevron-up"></i>'
                : '<i class="fas fa-chevron-down"></i> Show Recommendations <i class="fas fa-chevron-down"></i>';
        } else {
            console.warn("Could not find recommendations list element immediately after the toggle button.");
        }
    }

    // ========================================================================
    // Sharing and Exporting Functions
    // ========================================================================

    /**
     * Generates a formatted text string of the result for sharing.
     * @param {boolean} [isAdminContext=false] - If true, uses the last result from storage. Otherwise, uses current student data and last result.
     * @returns {string|null} Formatted text or null on error.
     */
    function formatResultText(isAdminContext = false) {
         let resultToShare = null;
         let studentInfo = null;

         if (isAdminContext) {
             // Admin context: Use the very last result saved in the entire history
             if (allResults.length === 0) {
                 showAlert('warning', 'No results available in local storage to share.');
                 return null;
             }
             resultToShare = allResults[allResults.length - 1];
             studentInfo = resultToShare.studentData || {}; // Use data stored *with* that result
         } else {
             // User context: Use the data for the student who just took the test
             if (!studentData || Object.keys(studentData).length === 0) {
                  showAlert('warning', 'Current student data is missing.');
                  return null;
             }
              if (allResults.length === 0) {
                   showAlert('warning', 'No result found for the current session.');
                   return null;
              }
             // Assume the last result added corresponds to the current test taker
             resultToShare = allResults[allResults.length - 1];
             studentInfo = studentData; // Use the currently active studentData
         }

         // Validate the structure of the result to be shared
         if (!resultToShare || !resultToShare.result) {
              showAlert('error', 'Selected result data is incomplete or invalid.');
              console.error("Incomplete result data for sharing:", resultToShare);
              return null;
         }

         const resultDetails = resultToShare.result;
         const recommendations = (resultDetails.recommendations || []).map((rec, i) => `${i + 1}. ${rec}`).join('\n');
         const branding = getClientBranding() || { name: 'Psychometrica Pro Plus', phone: 'N/A' };

         // --- Construct the text message ---
         let text = `*Psychometrica Pro Plus Results*\n------------------------------------\n`;
         text += `*Student:* ${studentInfo['student-name'] || 'N/A'}\n`;
         text += `*Grade:* ${studentInfo.grade || 'N/A'}\n`;
         text += `*Date:* ${resultToShare.date || 'N/A'}\n\n`; // Add space after date

         text += `*Summary:* ${resultToShare.summary || 'N/A'}\n`;
         text += `*Analysis:* ${resultDetails.analysis || 'N/A'}\n\n`;

         // Add Score Details
         if (resultDetails.scores) {
             text += `*Score Details:*\n`;
             if (parseInt(studentInfo.grade) <= 8) {
                 text += ` - Aptitude Score: ${resultDetails.scores.percentage?.toFixed(1) ?? 'N/A'}%\n`;
                 text += ` - (Scored ${resultDetails.scores.score ?? 'N/A'} / ${resultDetails.scores.scoredQuestions ?? 'N/A'} Aptitude Questions)\n`;
             } else { // RIASEC
                 text += ` - Realistic: ${resultDetails.scores.realistic ?? 'N/A'}\n`;
                 text += ` - Investigative: ${resultDetails.scores.investigative ?? 'N/A'}\n`;
                 text += ` - Artistic: ${resultDetails.scores.artistic ?? 'N/A'}\n`;
                 text += ` - Social: ${resultDetails.scores.social ?? 'N/A'}\n`;
                 text += ` - Enterprising: ${resultDetails.scores.enterprising ?? 'N/A'}\n`;
                 text += ` - Conventional: ${resultDetails.scores.conventional ?? 'N/A'}\n`;
             }
             text += `\n`;
         }


         // Add Personality Profile if available (Grades 5-8)
         if (resultDetails.personalityProfile && parseInt(studentInfo.grade) <= 8) {
             text += `*Basic Personality Insights:*\n`;
             // Use consistent labels (English for simplicity in text sharing)
             text += ` - Sociability: ${resultDetails.personalityProfile.sociability || 'N/A'}\n`;
             text += ` - Openness/Curiosity: ${resultDetails.personalityProfile.openness || 'N/A'}\n`;
             text += ` - Agreeableness: ${resultDetails.personalityProfile.agreeableness || 'N/A'}\n`;
             text += ` - Persistence: ${resultDetails.personalityProfile.persistence || 'N/A'}\n`;
             text += ` - Anxiety Level: ${resultDetails.personalityProfile.anxiety || 'N/A'}\n`;
             text += ` - Artistic Interest: ${resultDetails.personalityProfile.artistic || 'N/A'}\n`;
             text += ` - Investigative Interest: ${resultDetails.personalityProfile.investigative || 'N/A'}\n`;
             text += `\n`;
         }

         // Add Recommendations
         if (recommendations) {
            text += `*Recommendations:*\n${recommendations}\n\n`;
         }

         // Footer
         text += `------------------------------------\n`;
         text += `Shared via ${branding.name} (${branding.phone})`;

         return text.trim(); // Return the fully formatted text
    }

    /**
     * Opens WhatsApp with the pre-filled result text.
     * @param {boolean} [isAdminContext=false] - Determines which result to format.
     */
    function shareOnWhatsApp(isAdminContext = false) {
        const text = formatResultText(isAdminContext);
        if (!text) return; // Stop if text formatting failed

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank'); // Open WhatsApp in a new tab
        if (isAdminContext) {
             showAlert('info', 'Please select the recipient in WhatsApp.');
        }
    }

    /** Copies the formatted result text for the current user to the clipboard. */
    function copyResultCode() {
        const text = formatResultText(false); // Format current user's result
        if (!text) return; // Stop if formatting failed

        navigator.clipboard.writeText(text).then(() => {
            showAlert('success', 'Results copied to clipboard.');
        }).catch(err => {
            console.error('Failed to copy results to clipboard:', err);
            showAlert('error', 'Could not copy results. Your browser might block this action.');
        });
    }

     /**
      * NEW BEHAVIOR: Copies result text to clipboard and instructs user to paste into email.
      * @param {boolean} [isAdminContext=false] - If true, prepares text for the last result. If false, uses current student's result.
      */
     function emailResult(isAdminContext = false) {
         console.log(`emailResult (Copy Mode) called. isAdminContext: ${isAdminContext}`);
         const resultText = formatResultText(isAdminContext); // Get the formatted text
         if (!resultText) {
             console.error("formatResultText returned null, cannot proceed with email copy.");
             // Alert was already shown in formatResultText if data was missing
             return;
         }

         // Get student name for the alert message
         let studentName = 'Student';
         if (isAdminContext && allResults.length > 0) {
             studentName = allResults[allResults.length - 1]?.studentData?.['student-name'] || 'Student';
         } else if (!isAdminContext && studentData) {
             studentName = studentData['student-name'] || 'Student';
         }

         // Copy the text to the clipboard
         navigator.clipboard.writeText(resultText).then(() => {
             console.log("Result text copied to clipboard successfully.");
             // Show success alert with instructions
             showAlert('success', `Results for ${studentName} copied! Please open your email client (Gmail, Outlook, etc.) and paste this into a new email.`);
         }).catch(err => {
             console.error('Failed to copy result text to clipboard:', err);
             showAlert('error', 'Could not copy results to clipboard. Please try copying manually.');
             // As a fallback, maybe display the text in a modal or textarea for manual copying?
             // For now, just show error.
         });
     }


    /** Generates and triggers the download of a PDF certificate. */
    function downloadCertificate() {
        // Check if jsPDF library is loaded
        if (typeof window.jspdf?.jsPDF !== 'function') {
            showAlert('error', 'Certificate generation library (jsPDF) is not loaded.');
            console.error("jsPDF library not found on window.jspdf");
            return;
        }
        const { jsPDF } = window.jspdf; // Destructure after check

        // Ensure data for the current student/result is available
        if (!studentData || Object.keys(studentData).length === 0 || allResults.length === 0) {
            showAlert('warning', 'Cannot generate certificate. Student data or result is missing for the current session.');
            return;
        }

        // Assume the last result in the array corresponds to the current user
        const lastResult = allResults[allResults.length - 1];
        const currentStudentInfo = studentData; // Use data collected in the current flow

        if (!lastResult || !lastResult.result || !currentStudentInfo) {
             showAlert('error', 'Incomplete data for certificate generation.');
             console.error("Missing data for certificate:", {lastResult, currentStudentInfo});
             return;
        }

        try {
            // --- PDF Generation ---
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const branding = getClientBranding() || { name: 'Psychometrica Pro Plus', address: 'N/A', phone: 'N/A' }; // Use fallback

            // Extract data with fallbacks
            const studentName = currentStudentInfo['student-name'] || 'Student';
            const grade = currentStudentInfo.grade || 'N/A';
            const date = lastResult.date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
            const summary = lastResult.summary || 'Assessment Completed';

            // --- PDF Styling ---
            const font = 'Helvetica'; // Use standard Helvetica for broader compatibility
            const primaryColor = '#1B3B6F'; const secondaryColor = '#F4A261'; const accentColor = '#2A9D8F';
            const textColor = '#1F2A44'; const grayColor = '#6B7280';

            // Borders
            doc.setLineWidth(1.5); doc.setDrawColor(primaryColor); doc.rect(10, 10, 277, 190);
            doc.setLineWidth(0.5); doc.setDrawColor(secondaryColor); doc.rect(15, 15, 267, 180);

            // Header
            doc.setFont(font, 'bold'); doc.setFontSize(26); doc.setTextColor(primaryColor);
            doc.text(branding.name.toUpperCase(), 148.5, 35, { align: 'center' });
            doc.setFont(font, 'normal'); doc.setFontSize(16); doc.setTextColor(accentColor);
            doc.text('Certificate of Completion', 148.5, 45, { align: 'center' });

            // Body
            doc.setFontSize(14); doc.setTextColor(grayColor);
            doc.text('This certificate is proudly presented to', 148.5, 70, { align: 'center' });
            doc.setFontSize(28); doc.setFont(font, 'bold'); doc.setTextColor(textColor);
            doc.text(studentName.toUpperCase(), 148.5, 85, { align: 'center' });
            doc.setFont(font, 'normal'); doc.setFontSize(14); doc.setTextColor(grayColor);
            doc.text('For successfully completing the Psychometric Assessment', 148.5, 100, { align: 'center' });

            // Details
            doc.setFontSize(12); doc.setTextColor(textColor);
            doc.text(`Grade: ${grade}`, 148.5, 115, { align: 'center' });
            doc.text(`Date: ${date}`, 148.5, 125, { align: 'center' });
            if (summary.length < 80) { // Only add summary if reasonably short
                doc.text(`Result Summary: ${summary}`, 148.5, 135, { align: 'center' });
            }

            // Footer
            doc.setLineWidth(0.3); doc.setDrawColor(secondaryColor); doc.line(40, 155, 257, 155);
            doc.setFontSize(12); doc.setFont(font, 'bold'); doc.setTextColor(primaryColor);
            doc.text(`Issued by: ${branding.name}`, 148.5, 165, { align: 'center' });
            doc.setFont(font, 'normal'); doc.setFontSize(10); doc.setTextColor(grayColor);
            doc.text(`Contact: ${branding.phone || 'N/A'} | Address: ${branding.address || 'N/A'}`, 148.5, 172, { align: 'center' });
            doc.text(`Powered by Psychometrica Pro Plus`, 148.5, 180, { align: 'center' });

            // --- Save PDF ---
            // Sanitize filename
            const safeStudentName = studentName.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
            doc.save(`Psychometrica_Certificate_${safeStudentName}.pdf`);
            showAlert('success', 'Certificate downloaded successfully.');

        } catch (error) {
            console.error("Error generating PDF certificate:", error);
            showAlert('error', `Failed to generate certificate: ${error.message}`);
        }
    }


    // ========================================================================
    // Admin Section Logic (Display, Export, Clear, Plan Generation)
    // ========================================================================

    /** Displays the admin dashboard, populating tables with stored data. */
    function showAdminDashboard() {
        console.log('Showing admin dashboard.');
        const adminSection = document.getElementById('admin-section');
        const resultsTableBody = document.querySelector('#results-table tbody');
        const studentInfoTableBody = document.querySelector('#student-info-table tbody');

        // Ensure critical elements exist
        if (!adminSection || !resultsTableBody || !studentInfoTableBody) {
            showAlert('error', 'Admin dashboard UI components are missing. Cannot display.');
            resetUI(); // Go back to login if admin panel is broken
            return;
        }

        // Load the latest data from storage
        loadResults();
        loadStudentInfo();

        // Make admin section visible
        adminSection.classList.remove('hidden');

        // Ensure backup warnings are visible
        const backupAlerts = adminSection.querySelectorAll('.critical-warning');
        backupAlerts.forEach(alert => alert.style.display = 'block'); // Or remove 'hidden' class if used

        // --- Populate Results Table ---
        if (allResults.length === 0) {
            resultsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">No test results have been saved yet.</td></tr>';
        } else {
            resultsTableBody.innerHTML = allResults.map(result => `
                <tr>
                    <td>${result.studentData?.['student-name'] || 'N/A'}</td>
                    <td>${result.studentData?.grade || 'N/A'}</td>
                    <td>${result.date || 'N/A'}</td>
                    <td>${result.summary || 'N/A'}</td>
                </tr>`).join('');
        }

        // --- Populate Student Info Table ---
        if (allStudentInfo.length === 0) {
            studentInfoTableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 20px;">No student information has been saved yet.</td></tr>';
        } else {
            studentInfoTableBody.innerHTML = allStudentInfo.map(info => `
                <tr>
                    <td>${info.studentName || 'N/A'}</td>
                    <td>${info.parentName || 'N/A'}</td>
                    <td>${info.mobile || 'N/A'}</td>
                    <td>${info.email || 'N/A'}</td>
                    <td>${info.school || 'N/A'}</td>
                    <td>${info.age || 'N/A'}</td>
                    <td>${info.board || 'N/A'}</td>
                    <td>${info.standard || 'N/A'}</td>
                    <td>${info.medium || 'N/A'}</td>
                </tr>`).join('');
        }

        updateBrandingThroughout(); // Apply branding footer
    }

    /** Confirms and clears all locally stored test results. */
    function clearReports() {
        if (confirm('DANGER: Are you sure you want to permanently clear ALL locally stored test reports? This action cannot be undone. Export data first!')) {
            if (confirm('FINAL CONFIRMATION: Delete all test reports?')) {
                allResults = []; // Clear the array
                saveResults(); // Overwrite local storage with empty array
                showAdminDashboard(); // Refresh the admin view
                showAlert('success', 'All local test reports have been cleared.');
            }
        }
    }

    /** Exports all stored test results to a CSV file. */
    function exportAllToExcel() { // Renaming to exportAllResultsToCSV would be clearer
        if (!allResults.length) {
            showAlert('warning', 'No test results available to export.');
            return;
        }

        // Define CSV Headers (ensure these match the order you want)
        const headers = [
            "Student Name", "Grade", "Date", "Summary", "Analysis",
            "Realistic", "Investigative", "Artistic", "Social", "Enterprising", "Conventional", // RIASEC
            "Aptitude Score", "Aptitude Scored Questions", "Aptitude Percentage", // Aptitude
            "Sociability", "Openness/Curiosity", "Agreeableness", "Persistence", "Anxiety Level", "Artistic Interest", "Investigative Interest", // Personality
            "Recommendations", "Total Items in Test"
        ];
        let csvContent = headers.join(',') + '\n'; // Start with header row

        // Process each result into a CSV row
        allResults.forEach(result => {
            // Extract data with fallbacks for missing fields
            const studentName = result.studentData?.['student-name'] || '';
            const grade = result.studentData?.grade || '';
            const date = result.date || '';
            const summary = result.summary || '';
            const analysis = result.result?.analysis || '';
            const recommendations = (result.result?.recommendations || []).map(r => `- ${r}`).join(' | '); // Join recommendations with a separator

            // Prepare row data object matching headers
            let rowData = {
                "Student Name": studentName, "Grade": grade, "Date": date, "Summary": summary, "Analysis": analysis, "Recommendations": recommendations,
                "Realistic": 'N/A', "Investigative": 'N/A', "Artistic": 'N/A', "Social": 'N/A', "Enterprising": 'N/A', "Conventional": 'N/A',
                "Aptitude Score": 'N/A', "Aptitude Scored Questions": 'N/A', "Aptitude Percentage": 'N/A',
                "Sociability": 'N/A', "Openness/Curiosity": 'N/A', "Agreeableness": 'N/A', "Persistence": 'N/A', "Anxiety Level": 'N/A', "Artistic Interest": 'N/A', "Investigative Interest": 'N/A',
                "Total Items in Test": 'N/A'
            };

            // Populate scores and personality based on grade
            if (result.result?.scores) {
                 rowData["Total Items in Test"] = result.result.scores.totalItems ?? 'N/A';
                 if (parseInt(grade) > 8) { // RIASEC Scores
                     Object.assign(rowData, {
                         "Realistic": result.result.scores.realistic ?? 'N/A',
                         "Investigative": result.result.scores.investigative ?? 'N/A',
                         "Artistic": result.result.scores.artistic ?? 'N/A',
                         "Social": result.result.scores.social ?? 'N/A',
                         "Enterprising": result.result.scores.enterprising ?? 'N/A',
                         "Conventional": result.result.scores.conventional ?? 'N/A'
                     });
                 } else { // Aptitude Scores
                     Object.assign(rowData, {
                         "Aptitude Score": result.result.scores.score ?? 'N/A',
                         "Aptitude Scored Questions": result.result.scores.scoredQuestions ?? 'N/A',
                         "Aptitude Percentage": result.result.scores.percentage?.toFixed(1) ?? 'N/A'
                     });
                 }
            }
             if (result.result?.personalityProfile && parseInt(grade) <= 8) { // Personality Profile
                 Object.assign(rowData, {
                     "Sociability": result.result.personalityProfile.sociability || 'N/A',
                     "Openness/Curiosity": result.result.personalityProfile.openness || 'N/A',
                     "Agreeableness": result.result.personalityProfile.agreeableness || 'N/A',
                     "Persistence": result.result.personalityProfile.persistence || 'N/A',
                     "Anxiety Level": result.result.personalityProfile.anxiety || 'N/A',
                     "Artistic Interest": result.result.personalityProfile.artistic || 'N/A',
                     "Investigative Interest": result.result.personalityProfile.investigative || 'N/A'
                 });
             }

            // Function to safely format a value for CSV
            const formatCsvValue = (value) => {
                const stringValue = String(value ?? ''); // Handle null/undefined
                // Escape double quotes by doubling them, and enclose in double quotes if it contains comma, newline, or double quote
                if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue; // Return as is if no special characters
            };

            // Create the row string by mapping data according to headers
            const row = headers.map(header => formatCsvValue(rowData[header])).join(',');
            csvContent += row + '\n'; // Add the row to the CSV content
        });

        // --- Trigger CSV Download ---
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Create timestamp for filename
        link.download = `Psychometrica_All_Results_${timestamp}.csv`; // Set filename
        document.body.appendChild(link); // Append link to body (required for Firefox)
        link.click(); // Simulate click to trigger download
        document.body.removeChild(link); // Clean up by removing the link
        URL.revokeObjectURL(link.href); // Release the object URL memory

        showAlert('success', 'All results exported to CSV successfully.');
    }

    /** Saves student information entered in the admin form. */
    function submitStudentInfo() {
        // Get form elements
        const formElements = {
            studentName: document.getElementById('info-student-name'),
            parentName: document.getElementById('info-parent-name'),
            mobile: document.getElementById('info-mobile'),
            email: document.getElementById('info-email'),
            school: document.getElementById('info-school'),
            age: document.getElementById('info-age'),
            board: document.getElementById('info-board'),
            standard: document.getElementById('info-standard'),
            medium: document.getElementById('info-medium')
        };

        // Basic check if elements exist
        if (Object.values(formElements).some(el => !el)) {
             showAlert('error', 'Student information form fields are missing. Cannot submit.');
             return;
        }

        // Get values
        const studentInfoData = {
            studentName: formElements.studentName.value.trim(),
            parentName: formElements.parentName.value.trim(),
            mobile: formElements.mobile.value.trim(),
            email: formElements.email.value.trim(),
            school: formElements.school.value.trim(),
            age: formElements.age.value, // Keep as string initially for validation
            board: formElements.board.value,
            standard: formElements.standard.value,
            medium: formElements.medium.value,
        };

        // --- Validation ---
        if (!studentInfoData.studentName || !studentInfoData.parentName || !studentInfoData.mobile ||
            !studentInfoData.email || !studentInfoData.school || !studentInfoData.age ||
            !studentInfoData.board || !studentInfoData.standard || !studentInfoData.medium) {
            showAlert('warning', 'Please fill in all student information fields.');
            return;
        }
        const ageNum = parseInt(studentInfoData.age, 10);
        if (isNaN(ageNum) || ageNum < 10 || ageNum > 18) {
            showAlert('warning', 'Valid age (10-18) is required.');
            formElements.age.focus();
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentInfoData.email)) {
            showAlert('warning', 'Please enter a valid email address.');
             formElements.email.focus();
            return;
        }
        if (!/^\d{10}$/.test(studentInfoData.mobile)) {
            showAlert('warning', 'Please enter a valid 10-digit mobile number.');
             formElements.mobile.focus();
            return;
        }

        // Add timestamp and convert age back to number after validation
        studentInfoData.age = ageNum;
        studentInfoData.timestamp = new Date().toISOString();

        // --- Save Data ---
        // Consider checking for duplicates or updating existing records if needed
        allStudentInfo.push(studentInfoData);
        saveStudentInfo(); // Save updated array to localStorage
        showAdminDashboard(); // Refresh the display table

        // --- Clear Form ---
        Object.values(formElements).forEach(el => el.value = ''); // Reset all fields

        showAlert('success', 'Student information saved successfully.');
    }

    /** Exports all stored student information to a CSV file. */
    function exportStudentInfoToCSV() {
        if (!allStudentInfo.length) {
            showAlert('warning', 'No student information available to export.');
            return;
        }
        // Define headers matching the keys in the studentInfo objects (or desired output columns)
        const headers = ['studentName', 'parentName', 'mobile', 'email', 'school', 'age', 'board', 'standard', 'medium', 'timestamp'];
        // Create display-friendly headers for the CSV file
        const displayHeaders = ['Student Name', 'Parent Name', 'Mobile', 'Email', 'School', 'Age', 'Board', 'Standard', 'Medium', 'Timestamp'];
        let csvContent = displayHeaders.join(',') + '\n'; // Start with display headers

        // Function to safely format CSV values
         const formatCsvValue = (value) => {
            const stringValue = String(value ?? ''); // Handle null/undefined
            if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };


        allStudentInfo.forEach(info => {
            // Map data based on the defined headers order
            const row = headers.map(headerKey => formatCsvValue(info[headerKey])).join(',');
            csvContent += row + '\n'; // Add row to CSV content
        });

        // --- Trigger CSV Download ---
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `Student_Information_${timestamp}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        showAlert('success', 'Student information exported to CSV successfully.');
    }

    /** Confirms and clears all locally stored student information. */
    function clearStudentInfo() {
        if (confirm('DANGER: Are you sure you want to permanently clear ALL locally stored student information? This action cannot be undone. Export data first!')) {
             if (confirm('FINAL CONFIRMATION: Delete all student information?')) {
                allStudentInfo = []; // Clear the array
                saveStudentInfo(); // Save the empty array to storage
                showAdminDashboard(); // Refresh the admin view
                showAlert('success', 'All local student information has been cleared.');
            }
        }
    }

    // --- Functions for Sharing Generated Plan (Admin Panel) ---

    /** Shares the currently displayed generated plan via WhatsApp. */
    function sharePlanOnWhatsApp() {
        const planText = document.getElementById('plan-text')?.textContent;
        if (!planText || planText.trim() === '') {
             showAlert('warning', 'No development plan has been generated yet to share.');
             return;
        }
        const branding = getClientBranding() || { name: 'Psychometrica Pro Plus' }; // Get branding name
        // Format text for WhatsApp
        const whatsappText = `*Development Plan from ${branding.name}*\n\n${planText}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
        window.open(whatsappUrl, '_blank'); // Open WhatsApp
        showAlert('info', 'Please select the recipient in WhatsApp.'); // Remind admin to choose contact
    }

     /**
      * NEW BEHAVIOR: Copies generated plan text to clipboard and instructs user to paste into email.
      */
     function emailPlan() {
         console.log("emailPlan (Copy Mode) called.");
         const planText = document.getElementById('plan-text')?.textContent;
         if (!planText || planText.trim() === '') {
             showAlert('warning', 'No development plan has been generated yet to email.');
             return;
         }
         // Get student name from the input field used to generate the plan
         const studentName = document.getElementById('plan-student-name')?.value?.trim() || 'Student';

         // Copy the plan text to the clipboard
         navigator.clipboard.writeText(planText).then(() => {
             console.log("Plan text copied to clipboard successfully.");
             // Show success alert with instructions
             showAlert('success', `Plan for ${studentName} copied! Please open your email client (Gmail, Outlook, etc.) and paste this into a new email.`);
         }).catch(err => {
             console.error('Failed to copy plan text to clipboard:', err);
             showAlert('error', 'Could not copy the plan to the clipboard. Please try copying manually.');
         });
     }


    // ========================================================================
    // Initialization - Runs when the DOM is fully loaded
    // ========================================================================

    console.log('SCRIPT INFO: Assigning functions to window object for HTML access...');
    // Assign functions that are called directly from HTML onclick attributes to the window object
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
    window.emailResult = emailResult; // Updated email function
    window.goBack = goBack;
    window.exportAllToExcel = exportAllToExcel;
    window.toggleRecommendations = toggleRecommendations;
    window.downloadCertificate = downloadCertificate;
    window.clearReports = clearReports;
    // Plan functions are exposed in plan.js, but ensure sharing functions are exposed if called from HTML
    window.sharePlanOnWhatsApp = sharePlanOnWhatsApp;
    window.emailPlan = emailPlan; // Updated email function
    // Student Info Admin functions
    window.submitStudentInfo = submitStudentInfo;
    window.exportStudentInfoToCSV = exportStudentInfoToCSV;
    window.clearStudentInfo = clearStudentInfo;
    // Expose branding getter if needed by other potential scripts, though usually used internally
    window.getClientBranding = getClientBranding;


    console.log('SCRIPT INFO: Initializing application state...');
    // Load data from local storage when the application starts
    loadResults();
    loadStudentInfo();
    // Set the initial UI state (show login screen)
    resetUI();

    console.log("SCRIPT END: Initialization complete. Application ready.");
});
