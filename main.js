
// import './style.css' // Loaded via HTML now
import { calculateElevation } from './physicsEngine.js'
import { auth } from './src/auth.js'
// Import Firebase services
import { auth as firebaseAuth, db as firebaseDb, firebaseApp } from './src/firebase-config.js'
// import confetti from 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/+esm'

document.addEventListener('DOMContentLoaded', () => {
    // --- View Elements ---
    const views = {
        landing: document.getElementById('landing-view'),
        login: document.getElementById('login-view'),
        signup: document.getElementById('signup-view'),
        app: document.getElementById('app-view')
    };

    // --- Notification Helper ---
    function showNotification(title, message, icon = '✅') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'notification-toast';

        toast.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
        `;

        container.appendChild(toast);

        // Remove after delay
        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    }

    // --- Confirmation Helper ---
    function showConfirmation(message, onConfirm) {
        // Create Overlay
        const overlay = document.createElement('div');
        overlay.className = 'confirmation-overlay';

        // Create Modal
        const modal = document.createElement('div');
        modal.className = 'confirmation-modal';

        modal.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 1rem;">🗑️</div>
            <p>${message}</p>
            <div class="confirmation-actions">
                <button class="btn-cancel">Cancel</button>
                <button class="btn-confirm">Delete</button>
            </div>
        `;

        // Append to overlay
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Handlers
        const cancelBtn = modal.querySelector('.btn-cancel');
        const confirmBtn = modal.querySelector('.btn-confirm');

        function close() {
            overlay.classList.add('fade-out'); // Add fade-out animation if defined, or just remove
            overlay.remove();
        }

        cancelBtn.addEventListener('click', close);

        // Close on background click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        confirmBtn.addEventListener('click', () => {
            onConfirm();
            close();
        });

        // Focus confirm for accessibility/speed? Or cancel for safety? 
        // Let's focus cancel for safety.
        cancelBtn.focus();
    }

    // Legacy nav removed
    // const nav = document.getElementById('main-nav');
    const logoutBtn = document.getElementById('logout-btn');

    // --- State Management ---
    // Helper for safe JSON parsing
    function safeJSONParse(key, fallback) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : fallback;
        } catch (e) {
            console.error(`Error parsing ${key} from localStorage:`, e);
            return fallback;
        }
    }

    function switchView(viewName) {
        // Hide all views
        Object.values(views).forEach(el => el.classList.add('hidden'));
        // Show target view
        if (views[viewName]) {
            views[viewName].classList.remove('hidden');
        }

        // Handle Nav Visibility - Removed
        // if (viewName === 'app') { ... }
    }

    function checkAuth() {
        if (auth.isAuthenticated()) {
            switchView('app');
        } else {
            switchView('landing');
        }
    }

    // --- Event Listeners : Navigation ---

    // Landing Page Buttons
    document.getElementById('landing-signup-btn').addEventListener('click', () => switchView('signup'));
    document.getElementById('landing-login-btn').addEventListener('click', () => {
        switchView('login');
        // Auto-fill saved email after a short delay to ensure view is rendered
        setTimeout(() => {
            const savedEmail = localStorage.getItem('saved_email');
            const loginUsername = document.getElementById('login-username');
            const loginRemember = document.getElementById('login-remember');
            if (savedEmail && loginUsername && loginRemember) {
                loginUsername.value = savedEmail;
                loginRemember.checked = true;
            }
        }, 50);
    });

    // Back Buttons
    document.getElementById('login-back-btn').addEventListener('click', () => switchView('landing'));
    document.getElementById('signup-back-btn').addEventListener('click', () => switchView('landing'));

    // Cross Links
    document.getElementById('to-signup-link').addEventListener('click', (e) => {
        e.preventDefault();
        switchView('signup');
    });
    document.getElementById('to-login-link').addEventListener('click', (e) => {
        e.preventDefault();
        switchView('login');
        autoFillSavedEmail(); // Auto-fill email if saved
    });

    // Auto-fill saved email when login page is shown
    function autoFillSavedEmail() {
        const savedEmail = localStorage.getItem('saved_email');
        if (savedEmail && loginUsernameInput && loginRememberCheckbox) {
            loginUsernameInput.value = savedEmail;
            loginRememberCheckbox.checked = true;
        }
    }

    // --- Header & User Logic ---
    const userAvatar = document.getElementById('user-avatar');
    const userInitials = document.getElementById('user-initials');
    const settingsDropdown = document.getElementById('settings-dropdown');

    // User initials will be set in onAuthStateChanged callback (below)
    // to ensure Firebase auth has loaded the user data first

    // Toggle Dropdown
    if (userAvatar && settingsDropdown) {
        userAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasHidden = settingsDropdown.classList.contains('hidden');
            settingsDropdown.classList.toggle('hidden');

            // If opening the dropdown, refresh the values to show what's saved
            if (wasHidden) {
                const savedWeight = localStorage.getItem('bike_weight');
                const savedGoal = localStorage.getItem('bike_goal');

                if (savedWeight) {
                    profileWeightInput.value = savedWeight;
                }

                if (savedGoal) {
                    profileGoalInput.value = savedGoal;
                }
            }
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!settingsDropdown.classList.contains('hidden') &&
                !settingsDropdown.contains(e.target) &&
                e.target !== userAvatar) {
                settingsDropdown.classList.add('hidden');
            }
        });

        // Prevent closing when clicking inside dropdown
        settingsDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await auth.logout();
            switchView('landing');
        });
    }

    // --- Event Listeners : Auth Forms ---

    // Auto-fill email when the field gains focus (if Remember Me was used before)
    const loginUsernameInput = document.getElementById('login-username');
    const loginPasswordInput = document.getElementById('login-password');
    const loginRememberCheckbox = document.getElementById('login-remember');

    if (loginUsernameInput && loginPasswordInput) {
        loginUsernameInput.addEventListener('input', () => {
            const email = loginUsernameInput.value.trim();
            if (email) {
                const savedEmail = localStorage.getItem('saved_email');
                if (savedEmail === email && loginRememberCheckbox) {
                    loginRememberCheckbox.checked = true;
                }
            }
        });
    }


    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('login-username').value;
        const pass = document.getElementById('login-password').value;
        const remember = document.getElementById('login-remember').checked;

        const success = await auth.login(user, pass, remember);
        if (success) {
            // Save or remove email based on "Remember Me" setting
            if (remember) {
                localStorage.setItem('saved_email', user);
            } else {
                localStorage.removeItem('saved_email');
            }

            switchView('app');
            // Clear form
            e.target.reset();
        }
    });

    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const user = document.getElementById('signup-username').value;
        const pass = document.getElementById('signup-password').value;

        const success = await auth.signup(name, email, user, pass);
        if (success) {
            switchView('app');
            // Clear form
            e.target.reset();
        }
    });


    // --- Core App Logic (Calculator) ---
    const calculateBtn = document.getElementById('calculate-btn');
    const outputInput = document.getElementById('output-kj');
    const weightInput = document.getElementById('user-weight');
    const resultsSection = document.getElementById('results');
    const resMeters = document.getElementById('res-meters');
    const resFeet = document.getElementById('res-feet');
    const resLandmark = document.getElementById('res-landmark');

    // Only set up calculator if elements exist (to prevent errors in newer UI versions)
    if (calculateBtn && outputInput && weightInput && resultsSection && resMeters && resFeet && resLandmark) {
        calculateBtn.addEventListener('click', () => {
            const totalOutput = parseFloat(outputInput.value);
            let userWeight = parseFloat(weightInput.value);

            // Check which weight unit is selected
            const activeWeightUnit = document.querySelector('[data-unit-type="calc-weight"].active');
            const calcWeightUnit = activeWeightUnit ? activeWeightUnit.dataset.unit : 'kg';

            // Convert lbs to kg if needed
            if (calcWeightUnit === 'lbs') {
                userWeight = userWeight * 0.453592; // Convert lbs to kg
            }

            if (isNaN(totalOutput) || isNaN(userWeight) || totalOutput < 0 || userWeight < 0) {
                alert('Please enter valid positive numbers for both fields.');
                return;
            }

            const result = calculateElevation(totalOutput, userWeight);

            // Update UI
            resMeters.textContent = result.meters;
            resFeet.textContent = result.feet;
            resLandmark.textContent = result.landmark;

            // Show results
            resultsSection.classList.remove('hidden');

            // Check for achievements
            checkBadges(result.meters);
        });
    }

    // --- Tab Switching Logic ---
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = {
        myworkouts: document.getElementById('tab-myworkouts'),
        mychallenges: document.getElementById('tab-mychallenges'),
        profile: document.getElementById('tab-profile'),
        challenges: document.getElementById('tab-challenges')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            // Update Tab Buttons
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update Content
            Object.values(tabContents).forEach(content => {
                content.classList.remove('active');
                content.classList.add('hidden');
            });
            tabContents[target].classList.remove('hidden');
            tabContents[target].classList.add('active');

            // Bug Refresh: If switching to myworkouts, refresh the dropdown
            if (target === 'myworkouts') {
                updateTargetChallengeSelect();
            }

            // Refresh facts when viewing achievements
            if (target === 'profile') {
                renderAchievementFacts();
            }
        });
    });

    // --- Profile & Settings Logic ---
    const profileWeightInput = document.getElementById('profile-weight');
    const profileGoalInput = document.getElementById('profile-goal');
    const saveProfileBtn = document.getElementById('save-profile-btn');

    // --- Unit Logic ---
    const weightToggles = document.querySelectorAll('[data-unit-type="weight"]');
    const calcWeightToggles = document.querySelectorAll('[data-unit-type="calc-weight"]');
    const distanceToggles = document.querySelectorAll('[data-unit-type="distance"]');

    function setUnit(type, unit) {
        // Save
        localStorage.setItem(`unit_${type}`, unit);

        // Update UI
        const toggles = type === 'weight' ? weightToggles : distanceToggles;
        toggles.forEach(t => {
            if (t.dataset.unit === unit) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });

        // Update Labels/Placeholders (Optional, but good UX)
        if (type === 'weight') {
            const profileLabel = document.querySelector("label[for='profile-weight']");
            if (profileLabel) profileLabel.textContent = `Default Weight`;

            const calcLabel = document.querySelector("label[for='user-weight']");
            if (calcLabel) calcLabel.textContent = `Your Weight (${unit})`;
        } else {
            const goalLabel = document.querySelector("label[for='profile-goal']");
            if (goalLabel) goalLabel.textContent = `Weekly Goal`;
        }
    }

    // Listeners
    weightToggles.forEach(t => t.addEventListener('click', () => setUnit('weight', t.dataset.unit)));
    calcWeightToggles.forEach(t => t.addEventListener('click', () => {
        // Simple UI toggle for calculator tab, no persistence needed for this specific request or could persist separately
        // For now, just toggle class
        calcWeightToggles.forEach(btn => btn.classList.remove('active'));
        t.classList.add('active');

        // Update placeholder logic if we want to be fancy, but simple toggle is enough
        // Maybe update local storage if we want to remember preference?
        // Let's keep it simple as a UI state for now or match profile?
        // User asked "allow user to enter ... in KG or pounds", implies immediate switch.
        // Let's just handle the active class switch.
    }));
    distanceToggles.forEach(t => t.addEventListener('click', () => setUnit('distance', t.dataset.unit)));

    // New Challenge Unit Toggles
    const newClimbUnitToggles = document.querySelectorAll('[data-unit-type="new-climb-unit"]');
    newClimbUnitToggles.forEach(t => t.addEventListener('click', () => {
        newClimbUnitToggles.forEach(btn => btn.classList.remove('active'));
        t.classList.add('active');
        const heightInput = document.getElementById('new-climbing-challenge-height');
        if (heightInput) {
            heightInput.placeholder = t.dataset.unit === 'ft' ? 'Height (ft)' : 'Height (m)';
        }
    }));

    const newDistUnitToggles = document.querySelectorAll('[data-unit-type="new-dist-unit"]');
    newDistUnitToggles.forEach(t => t.addEventListener('click', () => {
        newDistUnitToggles.forEach(btn => btn.classList.remove('active'));
        t.classList.add('active');
        const distInput = document.getElementById('new-distance-challenge-distance');
        if (distInput) {
            distInput.placeholder = t.dataset.unit === 'mi' ? 'Distance (mi)' : 'Distance (km)';
        }
    }));

    // Workout Metric Toggle (Output vs Miles)
    const workoutMetricToggles = document.querySelectorAll('[data-unit-type="workout-metric"]');

    if (workoutMetricToggles.length > 0) {
        workoutMetricToggles.forEach(t => t.addEventListener('click', () => {
            workoutMetricToggles.forEach(btn => btn.classList.remove('active'));
            t.classList.add('active');

            // Update placeholder (logOutputInput is declared later in the file)
            const outputField = document.getElementById('log-output');
            if (outputField) {
                if (t.dataset.unit === 'output') {
                    outputField.placeholder = 'Enter kJ';
                } else {
                    outputField.placeholder = 'Enter miles';
                }
            }
        }));
    }

    // Load Settings
    function loadSettings() {
        // Units
        const savedWeightUnit = localStorage.getItem('unit_weight') || 'kg';
        const savedDistanceUnit = localStorage.getItem('unit_distance') || 'km';
        setUnit('weight', savedWeightUnit);
        setUnit('distance', savedDistanceUnit);

        // Values
        // Values
        const savedWeight = localStorage.getItem('bike_weight');
        if (savedWeight) {
            if (weightInput) weightInput.value = savedWeight;
            if (profileWeightInput) profileWeightInput.value = savedWeight;
        }

        const savedGoal = localStorage.getItem('bike_goal');
        if (savedGoal) {
            if (profileGoalInput) profileGoalInput.value = savedGoal;
        }
    }

    // Save Settings
    saveProfileBtn.addEventListener('click', () => {
        const weight = profileWeightInput.value;
        const goal = profileGoalInput.value;
        let msg = '';

        if (weight && weight > 0) {
            localStorage.setItem('bike_weight', weight);
            weightInput.value = weight; // Update calculator immediately
            msg += 'Weight saved. ';
        }

        if (goal && goal > 0) {
            localStorage.setItem('bike_goal', goal);
            msg += 'Weekly goal saved.';
        }

        if (msg) {
            showNotification('Settings Saved', msg);
            // Close the settings dropdown after saving
            if (settingsDropdown) {
                settingsDropdown.classList.add('hidden');
            }
        } else {
            showNotification('Error', 'Please enter valid details.', '⚠️');
        }
    });

    // --- Change Password Logic ---
    const changePasswordBtn = document.getElementById('change-password-btn');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', async () => {
            const currentPassword = currentPasswordInput.value.trim();
            const newPassword = newPasswordInput.value.trim();
            const confirmPassword = confirmPasswordInput.value.trim();

            // Validation
            if (!currentPassword) {
                alert('Please enter your current password.');
                return;
            }

            if (!newPassword) {
                alert('Please enter a new password.');
                return;
            }

            if (newPassword.length < 6) {
                alert('New password must be at least 6 characters long.');
                return;
            }

            if (newPassword !== confirmPassword) {
                alert('New passwords do not match. Please try again.');
                return;
            }

            // Attempt to change password
            const success = await auth.changePassword(currentPassword, newPassword);

            if (success) {
                showNotification('Password Changed', 'Your password has been updated successfully.', '🔐');

                // Clear the password fields
                currentPasswordInput.value = '';
                newPasswordInput.value = '';
                confirmPasswordInput.value = '';
            }
        });
    }

    // --- App Tabs Logic ---
    const appTabBtns = document.querySelectorAll('.app-tab-btn');
    const appContents = {
        peloton: document.getElementById('app-content-peloton'),
        apple: document.getElementById('app-content-apple')
    };

    appTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.appTab;

            // Update Buttons
            appTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update Content
            Object.values(appContents).forEach(content => content.classList.add('hidden'));
            appContents[target].classList.remove('hidden');
        });
    });

    // --- Theme Logic ---
    const themeBtns = document.querySelectorAll('.theme-btn');

    function setTheme(themeName) {
        // Apply to Body
        document.body.classList.remove('theme-dark', 'theme-light', 'theme-neon');
        document.body.classList.add(themeName);

        // Update Buttons
        themeBtns.forEach(btn => {
            if (btn.dataset.theme === themeName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Save
        localStorage.setItem('app_theme', themeName);
    }

    // Theme Listeners
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setTheme(btn.dataset.theme);
        });
    });

    // Load Theme
    function loadTheme() {
        const savedTheme = localStorage.getItem('app_theme') || 'theme-dark';
        setTheme(savedTheme);
    }

    // --- Gamification Logic ---
    const badges = [
        { id: 'first-ride', threshold: 10, name: 'First Ride' },
        { id: 'eiffel', threshold: 324, name: 'Eiffel Tower' },
        { id: 'montblanc', threshold: 4807, name: 'Mont Blanc' },
        { id: 'kilimanjaro', threshold: 5895, name: 'Kilimanjaro' },
        { id: 'k2', threshold: 8611, name: 'K2' },
        { id: 'everest', threshold: 8848, name: 'Mt. Everest' }
    ];

    function checkBadges(meters) {
        const unlockedBadges = safeJSONParse('unlocked_badges', []);

        badges.forEach(badge => {
            if (meters >= badge.threshold && !unlockedBadges.includes(badge.id)) {
                unlockBadge(badge);
            }
        });
    }

    function unlockBadge(badge) {
        // Save
        const unlockedBadges = safeJSONParse('unlocked_badges', []);
        unlockedBadges.push(badge.id);
        localStorage.setItem('unlocked_badges', JSON.stringify(unlockedBadges));

        // Update UI
        updateBadgeUI(badge.id);

        // Celebrate
        // confetti({
        //     particleCount: 150,
        //     spread: 70,
        //     origin: { y: 0.6 }
        // });

        alert(`🏆 Achievement Unlocked: ${badge.name}!`);
    }

    function updateBadgeUI(badgeId) {
        const badgeEl = document.getElementById(`badge-${badgeId}`);
        if (badgeEl) {
            badgeEl.classList.remove('locked');
            badgeEl.classList.add('unlocked');
        }
    }

    function loadBadges() {
        const unlockedBadges = safeJSONParse('unlocked_badges', []);
        unlockedBadges.forEach(id => updateBadgeUI(id));
    }

    // --- Achievement Facts Logic ---
    const climbingFacts = [
        { threshold: 0, comparison: "Just getting started!" },
        { threshold: 324, comparison: "Height of the Eiffel Tower 🗼" },
        { threshold: 443, comparison: "Height of the Empire State Building 🏙️" },
        { threshold: 828, comparison: "Height of Burj Khalifa (world's tallest building) 🏗️" },
        { threshold: 2000, comparison: "2x the height of Burj Khalifa" },
        { threshold: 4807, comparison: "Summit of Mont Blanc 🏔️" },
        { threshold: 5895, comparison: "Summit of Mount Kilimanjaro 🦁" },
        { threshold: 8611, comparison: "Summit of K2 ⛰️" },
        { threshold: 8849, comparison: "Summit of Mount Everest! 🧗" },
        { threshold: 10000, comparison: "Higher than Mount Everest! Into the stratosphere! ✈️" },
        { threshold: 20000, comparison: "Twice the height of Everest!" },
        { threshold: 30000, comparison: "You've climbed to cruising altitude! 🛫" }
    ];

    const distanceFacts = [
        { threshold: 0, comparison: "Start your journey!" },
        { threshold: 42.195, comparison: "Distance of a Marathon 🏃" },
        { threshold: 100, comparison: "Distance of an Ultra Marathon 🏃‍♂️" },
        { threshold: 160.9, comparison: "A Century Ride 🚴" },
        { threshold: 400, comparison: "Distance from Los Angeles to San Francisco 🌉" },
        { threshold: 1000, comparison: "Distance from New York to Miami ✈️" },
        { threshold: 3500, comparison: "Distance of Tour de France 🇫🇷" },
        { threshold: 4828, comparison: "Distance from Los Angeles to New York 🗽" },
        { threshold: 9000, comparison: "Distance from Los Angeles to Paris 🇫🇷" },
        { threshold: 12000, comparison: "Distance from London to Sydney 🦘" },
        { threshold: 20000, comparison: "Halfway around the world 🌍" },
        { threshold: 40075, comparison: "Around the entire Earth! 🌎" },
        { threshold: 80000, comparison: "Around the world twice! 🚀" },
        { threshold: 384400, comparison: "Distance to the Moon! 🌙" }
    ];

    function calculateTotalProgress() {
        // Get default weight for elevation calculations
        let defaultWeight = parseFloat(localStorage.getItem('bike_weight')) || 80;
        const weightUnit = localStorage.getItem('unit_weight') || 'kg';
        if (weightUnit === 'lbs') {
            defaultWeight = defaultWeight * 0.453592; // Convert to kg
        }

        let totalClimbingMeters = 0;
        let totalDistanceKm = 0;

        // 1. Get totals from all workouts in history
        const workoutHistory = safeJSONParse('workout_history', []);

        workoutHistory.forEach(workout => {
            // 1. Calculate Climbing (from kJ)
            if (workout.outputKj) {
                const elevationMeters = calculateElevation(workout.outputKj, defaultWeight).meters;
                totalClimbingMeters += elevationMeters;
            } else if (workout.metricType === 'output' || (!workout.miles && workout.output)) {
                // Legacy or simple kJ log
                const elevationMeters = calculateElevation(workout.output, defaultWeight).meters;
                totalClimbingMeters += elevationMeters;
            }

            // 2. Calculate Distance (from Miles)
            if (workout.miles) {
                totalDistanceKm += (workout.miles * 1.60934);
            } else if (workout.metricType === 'miles') {
                // Legacy simple miles log
                totalDistanceKm += (workout.output * 1.60934);
            }
        });

        return {
            climbingMeters: totalClimbingMeters,
            climbingFeet: totalClimbingMeters * 3.28084,
            distanceKm: totalDistanceKm,
            distanceMiles: totalDistanceKm * 0.621371
        };
    }

    function findBestComparison(value, factsArray) {
        // Find the highest threshold that the value has reached
        let bestFact = factsArray[0];
        for (let i = factsArray.length - 1; i >= 0; i--) {
            if (value >= factsArray[i].threshold) {
                bestFact = factsArray[i];
                break;
            }
        }
        return bestFact;
    }

    function renderAchievementFacts() {
        const container = document.getElementById('achievement-facts-container');
        if (!container) return;

        const totals = calculateTotalProgress();
        const climbingFact = findBestComparison(totals.climbingMeters, climbingFacts);
        const distanceFact = findBestComparison(totals.distanceKm, distanceFacts);

        // Get user's preferred units
        const distanceUnit = localStorage.getItem('unit_distance') || 'km';

        container.innerHTML = `
            <div class="fact-card">
                <div class="fact-icon">🏔️</div>
                <div class="fact-content">
                    <div class="fact-label">Total Climbing</div>
                    <div class="fact-value">${totals.climbingMeters.toFixed(0)}m <span class="fact-alt-unit">(${totals.climbingFeet.toFixed(0)}ft)</span></div>
                    <div class="fact-comparison">${climbingFact.comparison}</div>
                </div>
            </div>
            <div class="fact-card">
                <div class="fact-icon">🚴</div>
                <div class="fact-content">
                    <div class="fact-label">Total Distance</div>
                    <div class="fact-value">
                        ${distanceUnit === 'km'
                ? `${totals.distanceKm.toFixed(1)}km <span class="fact-alt-unit">(${totals.distanceMiles.toFixed(1)}mi)</span>`
                : `${totals.distanceMiles.toFixed(1)}mi <span class="fact-alt-unit">(${totals.distanceKm.toFixed(1)}km)</span>`
            }
                    </div>
                    <div class="fact-comparison">${distanceFact.comparison}</div>
                </div>
            </div>
        `;
    }

    // --- Peloton Sync Logic ---
    const workoutList = document.getElementById('workout-list');
    const addToChallengeBtn = document.getElementById('add-to-challenge-btn');
    const challengeSummary = document.getElementById('challenge-summary');

    // New Form Elements
    const logTypeInput = document.getElementById('challenge-log-type');
    const logDateInput = document.getElementById('challenge-log-date');
    const logDescInput = document.getElementById('challenge-log-desc');
    const logKjInput = document.getElementById('challenge-log-kj');
    const logMilesInput = document.getElementById('challenge-log-miles');
    const logBtn = document.getElementById('challenge-log-workout-btn');
    const targetChallengeSelect = document.getElementById('target-challenge-select');
    // workoutList already defined above
    // profileWeightInput already defined above

    let workoutHistory = safeJSONParse('workout_history', []);
    let editingWorkoutId = null; // Track which workout is being edited

    function getIconForType(type) {
        switch (type) {
            case 'bike': return '🚴';
            case 'run': return '🏃';
            case 'walk': return '🚶';
            case 'hike': return '🥾';
            default: return '💪';
        }
    }

    function logWorkout() {
        // Debugging
        console.log('Attempting to log workout...');

        const type = logTypeInput.value;
        const date = logDateInput.value || new Date().toISOString().split('T')[0];
        const desc = logDescInput.value.trim();
        const kjValue = parseFloat(logKjInput.value) || null;
        const milesValue = parseFloat(logMilesInput.value) || null;

        // Validate: need description and at least one metric
        if (!desc) {
            showNotification('Error', 'Please enter a description.', '⚠️');
            return;
        }

        if (!kjValue && !milesValue) {
            showNotification('Error', 'Please enter at least one value (kJ or miles).', '⚠️');
            return;
        }

        if ((kjValue && kjValue <= 0) || (milesValue && milesValue <= 0)) {
            showNotification('Error', 'Values must be greater than zero.', '⚠️');
            return;
        }

        const newWorkout = {
            id: Date.now(),
            type,
            date,
            title: desc,
            outputKj: kjValue,
            miles: milesValue,
            // Keep legacy 'output' and 'metricType' for backward compatibility
            output: kjValue || milesValue,
            metricType: kjValue ? 'output' : 'miles'
        };

        workoutHistory.unshift(newWorkout);
        localStorage.setItem('workout_history', JSON.stringify(workoutHistory));
        renderWorkouts();

        // Clear inputs
        logDescInput.value = '';
        logKjInput.value = '';
        logMilesInput.value = '';

        showNotification('Logged', 'Workout logged successfully!', '✅');
    }

    if (logBtn) {
        logBtn.addEventListener('click', logWorkout);
    }

    // Debug check for inputs
    if (!logTypeInput || !logDateInput || !logDescInput || (!logKjInput && !logMilesInput)) {
        console.error('One or more log inputs are missing or improperly loaded');
    }

    // --- Challenges Logic ---
    const climbingChallengesGrid = document.getElementById('climbing-challenges-grid');
    const distanceChallengesGrid = document.getElementById('distance-challenges-grid');

    // Challenge Type Tabs
    const challengeTypeBtns = document.querySelectorAll('.challenge-type-btn');
    const climbingSection = document.getElementById('climbing-challenges-section');
    const distanceSection = document.getElementById('distance-challenges-section');

    // Climbing Challenge Inputs
    const newClimbingChallengeName = document.getElementById('new-climbing-challenge-name');
    const newClimbingChallengeHeight = document.getElementById('new-climbing-challenge-height');
    const createClimbingChallengeBtn = document.getElementById('create-climbing-challenge-btn');

    // Distance Challenge Inputs
    const newDistanceChallengeName = document.getElementById('new-distance-challenge-name');
    const newDistanceChallengeDistance = document.getElementById('new-distance-challenge-distance');
    const createDistanceChallengeBtn = document.getElementById('create-distance-challenge-btn');

    // Default Challenges
    const defaultClimbingChallenges = [
        { id: 'everest', title: 'Mount Everest', height: 8849, type: 'climbing', image: '/images/challenges/everest.png' },
        { id: 'k2', title: 'K2', height: 8611, type: 'climbing', image: '/images/challenges/k2.png' },
        { id: 'kilimanjaro', title: 'Mount Kilimanjaro', height: 5895, type: 'climbing', image: '/images/challenges/kilimanjaro.png' },
        { id: 'montblanc', title: 'Mont Blanc', height: 4807, type: 'climbing', image: '/images/challenges/montblanc.png' }
    ];

    const defaultDistanceChallenges = [
        { id: 'marathon', title: 'Marathon', distance: 42.195, type: 'distance', icon: '🏃' },
        { id: 'ultra', title: 'Ultra Marathon', distance: 100, type: 'distance', icon: '🏃‍♂️' },
        { id: 'century', title: 'Century Ride', distance: 160.9, type: 'distance', icon: '🚴' },
        { id: 'cross-country', title: 'Cross Country', distance: 500, type: 'distance', icon: '🌍' },
        { id: 'tour-de-france', title: 'Tour de France', distance: 3500, type: 'distance', icon: '🇫🇷' }
    ];

    function getAllClimbingChallenges() {
        const defaults = [
            { id: 'everest', title: 'Mount Everest', height: 8849, type: 'climbing', image: '/images/challenges/everest.png' },
            { id: 'k2', title: 'K2', height: 8611, type: 'climbing', image: '/images/challenges/k2.png' },
            { id: 'kilimanjaro', title: 'Mount Kilimanjaro', height: 5895, type: 'climbing', image: '/images/challenges/kilimanjaro.png' },
            { id: 'montblanc', title: 'Mont Blanc', height: 4807, type: 'climbing', image: '/images/challenges/montblanc.png' }
        ];
        let custom = safeJSONParse('custom_climbing_challenges', []);
        if (!Array.isArray(custom)) custom = [];
        return [...defaults, ...custom];
    }

    function getAllDistanceChallenges() {
        const defaults = [
            { id: 'marathon', title: 'Marathon', distance: 42.195, type: 'distance', icon: '🏃' },
            { id: 'ultra', title: 'Ultra Marathon', distance: 100, type: 'distance', icon: '🏃‍♂️' },
            { id: 'century', title: 'Century Ride', distance: 160.9, type: 'distance', icon: '🚴' },
            { id: 'cross-country', title: 'Cross Country', distance: 500, type: 'distance', icon: '🌍' },
            { id: 'tour-de-france', title: 'Tour de France', distance: 3500, type: 'distance', icon: '🇫🇷' }
        ];
        let custom = safeJSONParse('custom_distance_challenges', []);
        if (!Array.isArray(custom)) custom = [];
        return [...defaults, ...custom];
    }

    function getAllChallenges() {
        return [...getAllClimbingChallenges(), ...getAllDistanceChallenges()];
    }

    // --- My Challenges Logic ---
    function getMyChallenges() {
        let my = safeJSONParse('my_challenges', []);
        return Array.isArray(my) ? my : [];
    }

    function saveMyChallenges(challenges) {
        localStorage.setItem('my_challenges', JSON.stringify(challenges));
    }

    // Robust UUID generator
    function generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'uuid-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    function addToMyChallenges(challengeId) {
        console.log('addToMyChallenges called with ID:', challengeId);
        const all = getAllChallenges();
        const template = all.find(c => c.id === challengeId);

        if (!template) {
            console.error('Challenge not found:', challengeId);
            return;
        }

        const myChallenges = getMyChallenges();

        // Create a unique instance
        const newInstance = {
            ...template,
            instanceId: `my_${template.id}_${generateUUID()}`,
            originalId: template.id,
            dateStarted: new Date().toISOString().split('T')[0],
            progress: 0,
            status: 'active' // active, completed
        };

        myChallenges.push(newInstance);
        saveMyChallenges(myChallenges);
        console.log('Saved myChallenges. New Count:', myChallenges.length);

        // alert(`✅ Added "${template.title}" to My Challenges!`);
        showNotification('Challenge Added', `Added "${template.title}"! (Total: ${myChallenges.length})`, '🎯');
        renderMyChallenges(); // Refresh the tab

        // Debug: Check if dropdown logic runs
        updateTargetChallengeSelect();

        // Auto-select the new challenge so it's ready to use
        const select = document.getElementById('target-challenge-select');
        if (select) {
            select.value = newInstance.instanceId;
            // Optional: Scroll to it or highlight it?
            // For now, selecting it is enough.
            console.log('Auto-selected new challenge:', newInstance.instanceId);
        }
    }

    function removeMyChallenge(instanceId) {
        showConfirmation('Are you sure you want to remove this challenge? Progress will be lost.', () => {
            let myChallenges = getMyChallenges();
            myChallenges = myChallenges.filter(c => c.instanceId !== instanceId);
            saveMyChallenges(myChallenges);
            renderMyChallenges();
            renderAchievementFacts(); // Update facts after removing challenge
            showNotification('Removed', 'Challenge removed from your list.', '🗑️');
        });
    }

    function renderMyChallenges() {
        const container = document.getElementById('active-challenge-display');
        if (!container) return;

        const myChallenges = getMyChallenges();

        if (myChallenges.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem 0; color: rgba(255,255,255,0.8);">
                    <span style="font-size: 3rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">🏔️</span>
                    <p style="margin-top: 1rem; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">No active challenges.</p>
                    <p style="font-size: 0.9rem; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">Go to "Challenges" and add one!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '<div class="my-challenges-wrapper" id="my-challenges-grid"></div>';
        const grid = document.getElementById('my-challenges-grid');

        myChallenges.forEach(challenge => {
            const isClimbing = challenge.type === 'climbing';
            const total = isClimbing ? challenge.height : challenge.distance;
            const unit = isClimbing ? 'm' : 'km';
            const current = challenge.progress || 0;
            const percentage = Math.min((current / total) * 100, 100).toFixed(1);

            const ringContainer = document.createElement('div');
            ringContainer.className = 'challenge-ring-container';

            // Dynamic Gradient for Progress Ring
            // Using primary color for progress, and a faded white for remaining
            ringContainer.style.background = `conic-gradient(var(--primary-color) ${percentage}%, rgba(255,255,255,0.1) 0)`;

            // Dual Unit Calculation
            let statsDisplay = '';

            if (isClimbing) {
                // Primary: m, Secondary: ft
                const currentFt = current * 3.28084;
                const totalFt = total * 3.28084;
                statsDisplay = `${Number(current).toFixed(0)} / ${total}m <span style="font-size:0.8em; opacity:0.7">(${currentFt.toFixed(0)} / ${totalFt.toFixed(0)}ft)</span>`;
            } else {
                // Primary: km, Secondary: mi
                const currentMi = current * 0.621371;
                const totalMi = total * 0.621371;
                statsDisplay = `${Number(current).toFixed(1)} / ${total}km <span style="font-size:0.8em; opacity:0.7">(${currentMi.toFixed(1)} / ${totalMi.toFixed(1)}mi)</span>`;
            }

            ringContainer.innerHTML = `
                <div class="challenge-circle-inner">
                    <button class="circle-remove-btn remove-challenge-btn" 
                            data-instance-id="${challenge.instanceId}" 
                            title="Remove Challenge">
                        ✕
                    </button>

                    ${challenge.image
                    ? `<img src="${challenge.image}" alt="${challenge.title}" class="challenge-img" style="border-radius:50%; width:80px; height:80px; margin-bottom:0.5rem;">`
                    : `<span class="circle-icon">${challenge.icon || '🎯'}</span>`
                }
                    
                    <div class="circle-title">${challenge.title}</div>
                    
                    <div class="circle-percent">${percentage}%</div>
                    
                    <div class="circle-stats" style="font-size: 0.85rem;">
                        ${statsDisplay}
                    </div>
                </div>
            `;
            grid.appendChild(ringContainer);
        });

        // Also update the logging dropdown to include these
        updateTargetChallengeSelect();
    }

    // --- Event Delegation for Dynamic Remove Buttons ---
    const activeChallengeDisplay = document.getElementById('active-challenge-display');
    if (activeChallengeDisplay) {
        activeChallengeDisplay.addEventListener('click', (e) => {
            const btn = e.target.closest('.remove-challenge-btn');
            if (btn) {
                e.preventDefault(); // Stop default action
                const id = btn.dataset.instanceId;
                console.log('Delegated remove click for:', id);
                removeMyChallenge(id);
            }
        });
    }

    // Challenge Type Tab Switching
    challengeTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.challengeType;

            // Update button states
            challengeTypeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update section visibility
            if (type === 'climbing') {
                climbingSection.classList.remove('hidden');
                distanceSection.classList.add('hidden');
            } else {
                climbingSection.classList.add('hidden');
                distanceSection.classList.remove('hidden');
            }
        });
    });

    function createCustomClimbingChallenge() {
        const name = newClimbingChallengeName.value.trim();
        let height = parseInt(newClimbingChallengeHeight.value);

        if (!name || !height || height <= 0) {
            alert('Please enter a valid name and height.');
            return;
        }

        // Check unit and convert if necessary (Store as meters)
        const activeUnit = document.querySelector('[data-unit-type="new-climb-unit"].active');
        const unit = activeUnit ? activeUnit.dataset.unit : 'm';

        if (unit === 'ft') {
            height = Math.round(height * 0.3048); // Convert ft to m
        }

        const newChallenge = {
            id: 'custom_climbing_' + Date.now(),
            title: name,
            height: height,
            type: 'climbing',
            icon: '🚩'
        };

        const custom = safeJSONParse('custom_climbing_challenges', []);
        custom.push(newChallenge);
        localStorage.setItem('custom_climbing_challenges', JSON.stringify(custom));

        renderChallenges();
        alert(`🎯 Created climbing goal: ${name}`);

        newClimbingChallengeName.value = '';
        newClimbingChallengeHeight.value = '';
    }

    function createCustomDistanceChallenge() {
        const name = newDistanceChallengeName.value.trim();
        let distance = parseFloat(newDistanceChallengeDistance.value);

        if (!name || !distance || distance <= 0) {
            alert('Please enter a valid name and distance.');
            return;
        }

        // Check unit and convert if necessary (Store as km)
        const activeUnit = document.querySelector('[data-unit-type="new-dist-unit"].active');
        const unit = activeUnit ? activeUnit.dataset.unit : 'km';

        if (unit === 'mi') {
            distance = parseFloat((distance * 1.60934).toFixed(2)); // Convert mi to km
        }

        const newChallenge = {
            id: 'custom_distance_' + Date.now(),
            title: name,
            distance: distance,
            type: 'distance',
            icon: '🎯'
        };

        const custom = safeJSONParse('custom_distance_challenges', []);
        custom.push(newChallenge);
        localStorage.setItem('custom_distance_challenges', JSON.stringify(custom));

        renderChallenges();
        alert(`🎯 Created distance goal: ${name}`);

        newDistanceChallengeName.value = '';
        newDistanceChallengeDistance.value = '';
    }

    if (createClimbingChallengeBtn) {
        createClimbingChallengeBtn.addEventListener('click', createCustomClimbingChallenge);
    }

    if (createDistanceChallengeBtn) {
        createDistanceChallengeBtn.addEventListener('click', createCustomDistanceChallenge);
    }

    function getActiveChallenge() {
        return localStorage.getItem('active_challenge');
    }

    function getChallengeProgress() {
        return safeJSONParse('challenge_progress', {});
    }

    function updateTargetChallengeSelect() {
        console.log('updateTargetChallengeSelect called');
        const targetChallengeSelect = document.getElementById('target-challenge-select');
        if (!targetChallengeSelect) {
            console.error('Target challenge select element not found!');
            return;
        }

        targetChallengeSelect.innerHTML = '';

        // Add "My Challenges" first
        const myChallenges = getMyChallenges();

        // DEBUG: Log state
        console.log(`DEBUG: Updating Dropdown. Count: ${myChallenges.length}`);

        if (myChallenges.length > 0) {
            // Simplified: No optgroup to avoid potential rendering glitches
            // const group = document.createElement('optgroup');
            // group.label = "My Active Challenges";

            myChallenges.forEach(c => {
                if (c && c.title && c.instanceId) {
                    const opt = document.createElement('option');
                    opt.value = c.instanceId; // Use instanceId for logging!
                    opt.textContent = `${c.title} (Started ${c.dateStarted})`;
                    // group.appendChild(opt);
                    targetChallengeSelect.appendChild(opt);
                } else {
                    console.warn('Skipping malformed my_challenge entry:', c);
                }
            });
            // if (group.children.length > 0) {
            //     targetChallengeSelect.appendChild(group);
            // }
        }

        // Global templates removed from dropdown as per user request.
        // Users must add challenges to "My Challenges" first.
        if (targetChallengeSelect.options.length === 0) {
            const placeholder = document.createElement('option');
            placeholder.text = "Select a challenge (Add one from 'Challenges' tab)";
            placeholder.disabled = true;
            placeholder.selected = true;
            targetChallengeSelect.appendChild(placeholder);
        }
    }

    function deleteCustomChallenge(id, type) {
        showConfirmation('Are you sure you want to delete this custom challenge template?', () => {
            const key = type === 'climbing' ? 'custom_climbing_challenges' : 'custom_distance_challenges';
            let custom = safeJSONParse(key, []);

            custom = custom.filter(c => c.id !== id);
            localStorage.setItem(key, JSON.stringify(custom));

            renderChallenges();
            updateTargetChallengeSelect();
            showNotification('Deleted', 'Custom challenge template deleted.', '🗑️');
        });
    }

    function renderChallenges() {
        try {
            // Render Climbing Challenges
            if (climbingChallengesGrid) {
                climbingChallengesGrid.innerHTML = '';
                const climbingChallenges = getAllClimbingChallenges();
                const activeId = getActiveChallenge();
                const progressMap = getChallengeProgress();

                climbingChallenges.forEach(challenge => {
                    const progress = progressMap[challenge.id] || 0;
                    const percentage = Math.min((progress / challenge.height) * 100, 100).toFixed(1);
                    const isActive = challenge.id === activeId;
                    const isCustom = challenge.id.startsWith('custom_');

                    const card = document.createElement('div');
                    card.className = `challenge-card ${isActive ? 'active-challenge' : ''}`;

                    let deleteBtnHtml = '';
                    if (isCustom) {
                        deleteBtnHtml = `
                        <button class="btn-icon delete-challenge-btn" data-id="${challenge.id}" data-type="climbing" title="Delete Template" 
                                style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.5); color: #ff5555;">
                            🗑️
                        </button>
                    `;
                    }

                    card.innerHTML = `
                    ${deleteBtnHtml}
                    <div class="challenge-header">
                        ${challenge.image
                            ? `<img src="${challenge.image}" alt="${challenge.title}" class="challenge-img">`
                            : `<span class="challenge-icon">${challenge.icon}</span>`
                        }
                        <div style="text-align: right;">
                            <div class="challenge-title">${challenge.title}</div>
                            <div class="challenge-height">${challenge.height}m</div>
                        </div>
                    </div>
                    
                    <div class="challenge-progress-container">
                        <div class="challenge-progress-bar" style="width: ${percentage}%"></div>
                    </div>
                    
                    <div class="challenge-stats">
                        <span>${progress.toFixed(0)}m climbed</span>
                        <span>${percentage}%</span>
                    </div>

                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                        <button class="btn-challenge simple-add-btn" 
                            data-id="${challenge.id}" style="flex: 1;">
                            + My Challenges
                        </button>
                    </div>
                `;
                    climbingChallengesGrid.appendChild(card);
                });
            }

            // Render Distance Challenges
            if (distanceChallengesGrid) {
                distanceChallengesGrid.innerHTML = '';
                const distanceChallenges = getAllDistanceChallenges();
                const activeId = getActiveChallenge();
                const progressMap = getChallengeProgress();

                distanceChallenges.forEach(challenge => {
                    const progress = progressMap[challenge.id] || 0;
                    const percentage = Math.min((progress / challenge.distance) * 100, 100).toFixed(1);
                    const isActive = challenge.id === activeId;
                    const isCustom = challenge.id.startsWith('custom_');

                    const card = document.createElement('div');
                    card.className = `challenge-card ${isActive ? 'active-challenge' : ''}`;

                    let deleteBtnHtml = '';
                    if (isCustom) {
                        deleteBtnHtml = `
                        <button class="btn-icon delete-challenge-btn" data-id="${challenge.id}" data-type="distance" title="Delete Template"
                                style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.5); color: #ff5555;">
                            🗑️
                        </button>
                    `;
                    }

                    card.innerHTML = `
                    ${deleteBtnHtml}
                    <div class="challenge-header">
                        ${challenge.image
                            ? `<img src="${challenge.image}" alt="${challenge.title}" class="challenge-img">`
                            : `<span class="challenge-icon">${challenge.icon}</span>`
                        }
                        <div style="text-align: right;">
                            <div class="challenge-title">${challenge.title}</div>
                            <div class="challenge-height">${challenge.distance}km</div>
                        </div>
                    </div>
                    
                    <div class="challenge-progress-container">
                        <div class="challenge-progress-bar" style="width: ${percentage}%"></div>
                    </div>
                    
                    <div class="challenge-stats">
                        <span>${progress.toFixed(1)}km covered</span>
                        <span>${percentage}%</span>
                    </div>

                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                         <button class="btn-challenge simple-add-btn" 
                            data-id="${challenge.id}" style="flex: 1;">
                            + My Challenges
                        </button>
                    </div>
                `;
                    distanceChallengesGrid.appendChild(card);
                });
            }

            // Add Listeners for Add Buttons
            document.querySelectorAll('.simple-add-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    console.log('Add button clicked. ID:', id);
                    addToMyChallenges(id);
                });
            });

            // Add Listeners for Delete Custom Buttons
            document.querySelectorAll('.delete-challenge-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation(); // prevent other clicks
                    const id = e.target.dataset.id;
                    const type = e.target.dataset.type;
                    deleteCustomChallenge(id, type);
                });
            });

            updateTargetChallengeSelect();
        } catch (error) {
            console.error('Error in renderChallenges:', error);
            showNotification('Error', 'Failed to load challenges. Data may be corrupted.', '⚠️');
        }
    }


    function renderWorkouts() {
        if (!workoutList) return;
        const historyList = document.getElementById('workout-history-list');

        workoutList.innerHTML = '';
        if (historyList) historyList.innerHTML = '';

        if (workoutHistory.length === 0) {
            workoutList.innerHTML = '<p style="color: grey; font-style: italic;">No workouts logged yet.</p>';
            if (historyList) historyList.innerHTML = '<p style="color: var(--text-muted); font-style: italic; text-align: center;">No history logs yet.</p>';
            return;
        }

        // Calculate Date Cutoff (5 days ago)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 5);
        cutoffDate.setHours(0, 0, 0, 0); // Normalize to start of day

        // Split workouts
        const recentLogs = [];
        const historyLogs = [];

        workoutHistory.forEach(w => {
            const wDate = new Date(w.date);
            wDate.setHours(12, 0, 0, 0); // Avoid timezone edge cases by checking mid-day or just rely on string comparison if ISO
            // robust date comparison:
            const wDateStr = w.date; // YYYY-MM-DD
            const cutoffStr = cutoffDate.toISOString().split('T')[0];

            if (wDateStr >= cutoffStr) {
                recentLogs.push(w);
            } else {
                historyLogs.push(w);
            }
        });

        // Helper to render to a container
        const renderItemToContainer = (workout, container) => {
            const item = document.createElement('div');
            item.className = 'workout-item';

            if (editingWorkoutId === workout.id) {
                item.innerHTML = `
                    <div class="workout-edit-form">
                        <input type="text" id="edit-desc-${workout.id}" class="manual-input" value="${workout.title}" style="flex: 2;">
                        <input type="date" id="edit-date-${workout.id}" class="manual-input" value="${workout.date}" style="width: auto;">
                        <div style="display: flex; gap: 0.2rem; flex: 1;">
                            <input type="number" id="edit-val-${workout.id}" class="manual-input" value="${workout.output}" style="flex: 1;">
                            <select id="edit-metric-${workout.id}" class="manual-input" style="width: auto;">
                                <option value="output" ${workout.metricType !== 'miles' ? 'selected' : ''}>kJ</option>
                                <option value="miles" ${workout.metricType === 'miles' ? 'selected' : ''}>mi</option>
                            </select>
                        </div>
                        <div class="workout-actions">
                            <button class="btn-icon save" data-id="${workout.id}" title="Save">💾</button>
                            <button class="btn-icon cancel" title="Cancel">❌</button>
                            <button class="btn-icon delete" data-id="${workout.id}" title="Delete">🗑️</button>
                        </div>
                    </div>
                `;
            } else {
                const icon = getIconForType(workout.type) || '💪';

                // Build the display string for metrics
                let metricDisplay = '';
                if (workout.outputKj && workout.miles) {
                    metricDisplay = `${workout.outputKj} kJ • ${workout.miles} mi`;
                } else if (workout.outputKj) {
                    metricDisplay = `${workout.outputKj} kJ`;
                } else if (workout.miles) {
                    metricDisplay = `${workout.miles} mi`;
                } else {
                    // Legacy support for old data
                    const unitLabel = workout.metricType === 'miles' ? 'mi' : 'kJ';
                    metricDisplay = `${workout.output} ${unitLabel}`;
                }

                item.innerHTML = `
                    <div style="display: flex; align-items: center; margin-right: 0.75rem;">
                        <input type="checkbox" class="workout-checkbox" data-id="${workout.id}" style="cursor: pointer; transform: scale(1.2);">
                    </div>
                    <div class="workout-icon">${icon}</div>
                    <div class="workout-details">
                        <div class="workout-title">${workout.title}</div>
                        <div class="workout-meta">${workout.date} • ${metricDisplay}</div>
                        ${workout.desc ? `<div class="workout-desc" style="font-size: 0.8rem; color: #aaa; margin-top: 0.2rem;">${workout.desc}</div>` : ''}
                    </div>
                    <div class="workout-actions">
                        <button class="btn-icon edit" data-id="${workout.id}" title="Edit">✏️</button>
                    </div>
                `;
            }
            container.appendChild(item);
        };

        // Render Recent
        if (recentLogs.length === 0) {
            workoutList.innerHTML = '<p style="color: grey; font-style: italic;">No recent logs (last 5 days).</p>';
        } else {
            recentLogs.forEach(w => renderItemToContainer(w, workoutList));
        }

        // Render History
        if (historyList) {
            if (historyLogs.length === 0) {
                historyList.innerHTML = '<p style="color: var(--text-muted); font-style: italic; text-align: center;">No older history.</p>';
            } else {
                historyLogs.forEach(w => renderItemToContainer(w, historyList));
            }
        }

        // Attach Listeners (Global for both lists)
        // We can just query all buttons in document or specific containers.
        // renderWorkouts replaces content, so we re-attach to new elements.

        const attach = (selector, fn) => {
            document.querySelectorAll(selector).forEach(el => el.addEventListener('click', fn));
        };

        // Checkboxes
        document.querySelectorAll('.workout-checkbox').forEach(cb => {
            cb.addEventListener('change', updateChallengeSummary);
        });

        // Edit
        attach('.btn-icon.edit', (e) => {
            editingWorkoutId = parseInt(e.currentTarget.dataset.id);
            renderWorkouts();
        });

        // Save
        attach('.btn-icon.save', (e) => {
            saveWorkout(parseInt(e.currentTarget.dataset.id));
        });

        // Cancel
        attach('.btn-icon.cancel', () => {
            editingWorkoutId = null;
            renderWorkouts();
        });

        // Delete
        attach('.btn-icon.delete', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            showConfirmation('Are you sure you want to delete this workout?', () => {
                deleteWorkout(id);
                showNotification('Deleted', 'Workout log deleted.', '🗑️');
            });
        });

        // --- Bulk Selection Logic ---
        const selectAllCheckbox = document.getElementById('select-all-workouts');
        const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
        const allCheckboxes = document.querySelectorAll('.workout-checkbox');

        const updateBulkUI = () => {
            const checkedCount = document.querySelectorAll('.workout-checkbox:checked').length;
            if (checkedCount > 0) {
                if (bulkDeleteBtn) {
                    bulkDeleteBtn.style.display = 'block';
                    bulkDeleteBtn.innerHTML = `🗑️ Delete (${checkedCount})`;
                }
            } else {
                if (bulkDeleteBtn) bulkDeleteBtn.style.display = 'none';
            }

            // Update Master Checkbox state
            if (allCheckboxes.length > 0 && selectAllCheckbox) {
                selectAllCheckbox.checked = checkedCount === allCheckboxes.length;
                selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
            } else if (selectAllCheckbox) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            }
        };

        if (selectAllCheckbox) {
            // Reset master checkbox state on re-render to avoid out-of-sync UI
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
            if (bulkDeleteBtn) bulkDeleteBtn.style.display = 'none';

            // Clone to remove old listeners (simple way to avoid duplicates on re-render)
            const newSelectAll = selectAllCheckbox.cloneNode(true);
            selectAllCheckbox.parentNode.replaceChild(newSelectAll, selectAllCheckbox);

            newSelectAll.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                document.querySelectorAll('.workout-checkbox').forEach(cb => {
                    cb.checked = isChecked;
                });
                updateBulkUI();
            });
        }

        // Listener for individual checkboxes
        allCheckboxes.forEach(cb => {
            cb.addEventListener('change', updateBulkUI);
        });

        // Bulk Delete Action
        if (bulkDeleteBtn) {
            const newBulkDelete = bulkDeleteBtn.cloneNode(true);
            bulkDeleteBtn.parentNode.replaceChild(newBulkDelete, bulkDeleteBtn);

            newBulkDelete.addEventListener('click', () => {
                const selectedIds = Array.from(document.querySelectorAll('.workout-checkbox:checked')).map(cb => cb.dataset.id);
                if (selectedIds.length === 0) return;

                showConfirmation(`Delete ${selectedIds.length} workouts? This cannot be undone.`, () => {
                    workoutHistory = workoutHistory.filter(w => !selectedIds.includes(w.id.toString()));
                    saveWorkouts();
                    renderWorkouts();
                    renderChallenges(); // Re-calc progress
                    showNotification('Deleted', `${selectedIds.length} workouts removed.`, '🗑️');
                });
            });
        }
    }

    function saveWorkout(id) {
        const descInput = document.getElementById(`edit-desc-${id}`);
        const dateInput = document.getElementById(`edit-date-${id}`);
        const valInput = document.getElementById(`edit-val-${id}`);
        const metricSelect = document.getElementById(`edit-metric-${id}`);

        if (descInput && dateInput && valInput && metricSelect) {
            const newTitle = descInput.value.trim();
            const newDate = dateInput.value;
            const newVal = parseFloat(valInput.value);
            const newMetric = metricSelect.value;

            if (!newTitle || newVal <= 0) {
                alert('Please enter valid data.');
                return;
            }

            // Find and update
            const index = workoutHistory.findIndex(w => w.id === id);
            if (index !== -1) {
                workoutHistory[index].title = newTitle;
                workoutHistory[index].date = newDate;
                workoutHistory[index].output = newVal;
                workoutHistory[index].metricType = newMetric;

                localStorage.setItem('workout_history', JSON.stringify(workoutHistory));
                editingWorkoutId = null;
                renderWorkouts();
            }
        }
    }

    function deleteWorkout(id) {
        workoutHistory = workoutHistory.filter(w => w.id !== id);
        localStorage.setItem('workout_history', JSON.stringify(workoutHistory));
        editingWorkoutId = null;
        renderWorkouts();
    }

    function updateChallengeSummary() {
        const checkedBoxes = document.querySelectorAll('.workout-checkbox:checked');
        let totalKj = 0;

        checkedBoxes.forEach(cb => {
            const wId = parseInt(cb.dataset.id);
            const w = workoutHistory.find(h => h.id === wId);
            if (w) {
                if (w.outputKj) {
                    totalKj += w.outputKj;
                } else if (w.metricType !== 'miles') {
                    // Assume output is kJ if not miles
                    totalKj += w.output;
                }
            }
        });

        challengeSummary.textContent = `${totalKj.toFixed(0)} kJ selected (for climbing)`;
        addToChallengeBtn.disabled = checkedBoxes.length === 0; // Enable if any selection, let specific logic handle 0-value cases

        return totalKj;
    }

    if (addToChallengeBtn) {
        addToChallengeBtn.addEventListener('click', () => {
            const totalKj = updateChallengeSummary();

            // 1. Get Weight
            let weight = parseFloat(profileWeightInput.value) || 80; // default 80kg
            // Handle lbs conversion
            const weightUnit = localStorage.getItem('unit_weight') || 'kg';
            if (weightUnit === 'lbs') {
                weight = weight * 0.453592;
            }

            const addedMeters = calculateElevation(totalKj, weight).meters;

            // 3. Update Progress for TARGET challenge
            const targetId = document.getElementById('target-challenge-select').value;
            // console.log('DEBUG: Add Btn Clicked. Target:', targetId); 

            // Check if it's a "My Challenge" (instance) or a global one (legacy/fallback)
            // Our new IDs start with "my_"

            const myChallenges = getMyChallenges();
            const instanceIndex = myChallenges.findIndex(c => c.instanceId === targetId);
            // console.log('DEBUG: Instance Index:', instanceIndex);

            let challengeTitle = "Unknown Challenge";

            if (instanceIndex !== -1) {
                // It is a My Challenge Instance
                const instance = myChallenges[instanceIndex];
                challengeTitle = instance.title;

                let addedValue = 0;

                if (instance.type === 'climbing') {
                    // Logic for CLIMBING challenges (needs Meters)
                    // We take the computed Elevation (meters) from the physics engine
                    // which uses the kJ output and weight.
                    addedValue = addedMeters;
                } else {
                    // Logic for DISTANCE challenges (needs KM)
                    // We need to look at what was selected and sum up the DISTANCE.

                    // Re-scan selected checkboxes to sum distance explicitly
                    const checkedBoxes = document.querySelectorAll('.workout-checkbox:checked');
                    let totalDistanceKm = 0;

                    checkedBoxes.forEach(cb => {
                        const wId = parseInt(cb.dataset.id);
                        const w = workoutHistory.find(h => h.id === wId);

                        if (w) {
                            // Check for explicit miles first
                            if (w.metricType === 'miles') {
                                // Miles -> Km
                                totalDistanceKm += (w.output * 1.60934);
                            } else if (w.miles) {
                                // If workout has both (legacy or dual logging), use the explicit miles field
                                totalDistanceKm += (w.miles * 1.60934);
                            } else {
                                // kJ only. We cannot safely convert to distance.
                                // Warn the user but continue.
                                console.warn(`Skipping workout ${w.id} for distance challenge: Metric is kJ only.`);
                            }
                        }
                    });
                    // console.log('DEBUG: Calculated Distance (km):', totalDistanceKm);

                    addedValue = totalDistanceKm;
                }

                if (addedValue > 0) {
                    instance.progress += addedValue;
                    myChallenges[instanceIndex] = instance;
                    saveMyChallenges(myChallenges);
                    renderMyChallenges(); // Update the specific tab UI
                    renderAchievementFacts(); // Update facts with new progress

                    // 4. Update UI
                    renderChallenges();

                    // Replaced alert with showNotification
                    const unitLabel = instance.type === 'climbing' ? 'm' : 'km';
                    showNotification('Progress Added', `🔥 Added ${addedValue.toFixed(1)}${unitLabel} to ${challengeTitle}!`, '🚀');

                    // Switch tab to Challenges to see progress?
                    // Optional: maybe stay here so they can add more?
                    // switching to see the bar is rewarding though.
                    document.querySelector('[data-tab="mychallenges"]').click();
                } else {
                    showNotification('No Progress', "⚠️ No compatible workouts selected (check units).", '⚠️');
                }

            } else {
                // Legacy / Global Logic
                const progressMap = getChallengeProgress();
                const currentProgress = progressMap[targetId] || 0;
                const newProgress = currentProgress + addedMeters;
                progressMap[targetId] = newProgress;
                localStorage.setItem('challenge_progress', JSON.stringify(progressMap));

                const all = getAllChallenges();
                const c = all.find(c => c.id === targetId);
                if (c) challengeTitle = c.title;

                // 4. Update UI (Legacy)
                renderChallenges();
                showNotification('Progress Added', `🔥 Added progress to ${challengeTitle}!`, '🚀');

                // Switch tab to Challenges to see progress?
                document.querySelector('[data-tab="challenges"]').click();
            }
        });
    }

    function repairData() {
        // Fix potential issues with my_challenges
        try {
            const myChallenges = safeJSONParse('my_challenges', []);
            let changed = false;
            const validChallenges = myChallenges.filter(c => {
                const isValid = c && c.instanceId && c.title;
                if (!isValid) {
                    console.warn('Removing malformed my_challenge:', c);
                    changed = true;
                }
                return isValid;
            });

            if (changed) {
                localStorage.setItem('my_challenges', JSON.stringify(validChallenges));
                console.log('Repaired my_challenges data.');
            }
        } catch (e) {
            console.error('Error repairing data:', e);
        }
    }

    // --- Migration Logic ---
    function migrateLegacyData() {
        repairData(); // Run repair first

        // 1. Migrate 'custom_challenges' to 'custom_climbing_challenges' (assuming they are climbing if they have height)
        const legacyCustom = safeJSONParse('custom_challenges', []);
        if (legacyCustom.length > 0) {
            console.log('Migrating legacy custom challenges...', legacyCustom);
            let climbing = safeJSONParse('custom_climbing_challenges', []);

            legacyCustom.forEach(c => {
                // Avoid duplicates by ID or Title
                if (!climbing.some(existing => existing.id === c.id || existing.title === c.title)) {
                    // Ensure it has the correct type
                    c.type = c.type || 'climbing';
                    // Remap 'name' to 'title' if needed (based on what I saw in browser check: name="Mount Fuji")
                    if (!c.title && c.name) c.title = c.name;

                    climbing.push(c);
                }
            });

            localStorage.setItem('custom_climbing_challenges', JSON.stringify(climbing));
            // Rename legacy key to avoid re-running, but keep backup
            localStorage.setItem('backup_custom_challenges', JSON.stringify(legacyCustom));
            localStorage.removeItem('custom_challenges');
            alert('Restored your old custom challenges! (Migrated from legacy format)');
        }

        // 2. Check 'challenges' key just in case (another legacy key found)
        const legacyChallenges = safeJSONParse('challenges', []);
        if (legacyChallenges.length > 0) {
            console.log('Migrating legacy "challenges"...', legacyChallenges);
            let climbing = safeJSONParse('custom_climbing_challenges', []);

            legacyChallenges.forEach(c => {
                if (c.isCustom) {
                    if (!climbing.some(existing => existing.id === c.id || existing.title === c.title || existing.title === c.name)) {
                        c.type = c.type || 'climbing';
                        if (!c.title && c.name) c.title = c.name;
                        climbing.push(c);
                    }
                }
            });
            localStorage.setItem('custom_climbing_challenges', JSON.stringify(climbing));
            localStorage.setItem('backup_challenges', JSON.stringify(legacyChallenges));
            localStorage.removeItem('challenges');
        }
    }

    // --- Workout History Toggle ---
    const historyHeader = document.getElementById('history-header');
    const historyList = document.getElementById('workout-history-list');
    const historyIcon = document.getElementById('history-toggle-icon');

    if (historyHeader && historyList && historyIcon) {
        historyHeader.addEventListener('click', () => {
            const isHidden = historyList.classList.contains('hidden');
            if (isHidden) {
                historyList.classList.remove('hidden');
                historyIcon.style.transform = 'rotate(180deg)';
            } else {
                historyList.classList.add('hidden');
                historyIcon.style.transform = 'rotate(0deg)';
            }
        });
    }

    // --- Firebase Auth State Listener ---
    // This automatically logs the user in if they were previously authenticated
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('✅ User is signed in:', user.email);
            // User is signed in, update UI if needed
            const currentUser = auth.getUser();
            if (currentUser && userInitials) {
                let text = 'U';
                if (currentUser.name) {
                    text = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                } else if (currentUser.username) {
                    text = currentUser.username.substring(0, 2).toUpperCase();
                }
                userInitials.textContent = text;
            }
        } else {
            console.log('❌ User is signed out');
        }
    });

    // --- Init ---
    // --- Reset Defaults Logic ---
    const resetBtn = document.getElementById('reset-challenges-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('This will restore the original challenges (Everest, etc.) and clear potentially corrupted challenge data. Your workout history will be safe. Continue?')) {
                // Clear all challenge-related keys to force a clean slate for definitions
                localStorage.removeItem('custom_climbing_challenges');
                localStorage.removeItem('custom_distance_challenges');
                // We do NOT clear 'my_challenges' or 'challenge_progress' so user doesn't lose progress on existing ones.
                // However, if the challenge definition is gone from 'my_challenges' but exists in defaults, it should be fine.
                // If the user wants a FULL reset, they can clear site data.
                // This is specifically to fix the "missing challenges" bug.

                // Force reload to re-run the default hydration logic
                location.reload();
            }
        });
    }

    try {
        migrateLegacyData();
        checkAuth();
        loadSettings();
        loadTheme();
        loadBadges();
        renderWorkouts();
        renderChallenges();
        renderMyChallenges();
        renderAchievementFacts(); // Render facts in achievements tab
    } catch (e) {
        console.error('CRITICAL: Main.js Initialization Failed!', e);
        if (typeof showNotification === 'function') {
            showNotification('App Error', 'Failed to initialize application.', '❌');
        }
    }
});
