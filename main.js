
// import './style.css' // Loaded via HTML now
import { calculateElevation } from './physicsEngine.js'
import { auth } from './src/auth.js'
// import confetti from 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/+esm'

document.addEventListener('DOMContentLoaded', () => {
    // --- View Elements ---
    const views = {
        landing: document.getElementById('landing-view'),
        login: document.getElementById('login-view'),
        signup: document.getElementById('signup-view'),
        app: document.getElementById('app-view')
    };

    // Legacy nav removed
    // const nav = document.getElementById('main-nav');
    const logoutBtn = document.getElementById('logout-btn');

    // --- State Management ---
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
    document.getElementById('landing-login-btn').addEventListener('click', () => switchView('login'));

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
    });

    // --- Header & User Logic ---
    const userAvatar = document.getElementById('user-avatar');
    const userInitials = document.getElementById('user-initials');
    const settingsDropdown = document.getElementById('settings-dropdown');

    // Set Initials
    const currentUser = auth.getUser();
    if (currentUser) {
        let text = 'U';
        if (currentUser.name) {
            text = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        } else if (currentUser.username) {
            text = currentUser.username.substring(0, 2).toUpperCase();
        }
        if (userInitials) userInitials.textContent = text;
    }

    // Toggle Dropdown
    if (userAvatar && settingsDropdown) {
        userAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsDropdown.classList.toggle('hidden');
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
        logoutBtn.addEventListener('click', () => {
            auth.logout();
            switchView('landing');
        });
    }

    // --- Event Listeners : Auth Forms ---

    // Auto-fill password when username is entered (if Remember Me was used before)
    const loginUsernameInput = document.getElementById('login-username');
    const loginPasswordInput = document.getElementById('login-password');
    const loginRememberCheckbox = document.getElementById('login-remember');

    if (loginUsernameInput && loginPasswordInput) {
        loginUsernameInput.addEventListener('input', () => {
            const username = loginUsernameInput.value.trim();
            if (username) {
                const savedCreds = localStorage.getItem('saved_credentials');
                if (savedCreds) {
                    try {
                        const { username: savedUsername, password: savedPassword } = JSON.parse(savedCreds);
                        if (savedUsername === username && savedPassword) {
                            loginPasswordInput.value = savedPassword;
                            if (loginRememberCheckbox) {
                                loginRememberCheckbox.checked = true;
                            }
                        }
                    } catch (e) {
                        console.error('Error reading saved credentials:', e);
                    }
                }
            }
        });
    }

    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('login-username').value;
        const pass = document.getElementById('login-password').value;
        const remember = document.getElementById('login-remember').checked;

        if (auth.login(user, pass, remember)) {
            switchView('app');
            // Clear form
            e.target.reset();
        }
    });

    document.getElementById('signup-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const user = document.getElementById('signup-username').value;
        const pass = document.getElementById('signup-password').value;

        if (auth.signup(name, email, user, pass)) {
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
        const savedWeight = localStorage.getItem('bike_weight');
        if (savedWeight) {
            weightInput.value = savedWeight;
            profileWeightInput.value = savedWeight;
        }

        const savedGoal = localStorage.getItem('bike_goal');
        if (savedGoal) {
            profileGoalInput.value = savedGoal;
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
            alert(msg);
        } else {
            alert('Please enter valid details.');
        }
    });

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
        const unlockedBadges = JSON.parse(localStorage.getItem('unlocked_badges') || '[]');

        badges.forEach(badge => {
            if (meters >= badge.threshold && !unlockedBadges.includes(badge.id)) {
                unlockBadge(badge);
            }
        });
    }

    function unlockBadge(badge) {
        // Save
        const unlockedBadges = JSON.parse(localStorage.getItem('unlocked_badges') || '[]');
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
        const unlockedBadges = JSON.parse(localStorage.getItem('unlocked_badges') || '[]');
        unlockedBadges.forEach(id => updateBadgeUI(id));
    }

    // --- Peloton Sync Logic ---
    const workoutList = document.getElementById('workout-list');
    const addToChallengeBtn = document.getElementById('add-to-challenge-btn');
    const challengeSummary = document.getElementById('challenge-summary');

    // New Form Elements
    const logTypeInput = document.getElementById('challenge-log-type');
    const logDateInput = document.getElementById('challenge-log-date');
    const logDescInput = document.getElementById('challenge-log-desc');
    const logOutputInput = document.getElementById('challenge-log-output');
    const logBtn = document.getElementById('challenge-log-workout-btn');
    const targetChallengeSelect = document.getElementById('target-challenge-select');
    // workoutList already defined above
    // profileWeightInput already defined above

    // Workout Metric Toggle
    let currentWorkoutMetric = 'output'; // 'output' or 'miles'

    // Handle workout metric toggle
    document.querySelectorAll('[data-unit-type="workout-metric"]').forEach(option => {
        option.addEventListener('click', function () {
            const selectedUnit = this.dataset.unit;

            // Update active states
            document.querySelectorAll('[data-unit-type="workout-metric"]').forEach(opt => {
                opt.classList.remove('active');
            });
            this.classList.add('active');

            // Update current metric
            currentWorkoutMetric = selectedUnit;

            // Update placeholder
            if (selectedUnit === 'output') {
                logOutputInput.placeholder = 'Output (kJ)';
            } else {
                logOutputInput.placeholder = 'Miles';
            }
        });
    });

    let workoutHistory = JSON.parse(localStorage.getItem('workout_history') || '[]');

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
        const value = parseFloat(logOutputInput.value);

        if (!desc || !value || value <= 0) {
            alert('Please enter a description and valid value.');
            return;
        }

        const newWorkout = {
            id: Date.now(),
            type,
            date,
            title: desc,
            output: value,
            metricType: currentWorkoutMetric // Store which metric was used
        };

        workoutHistory.unshift(newWorkout);
        localStorage.setItem('workout_history', JSON.stringify(workoutHistory));
        renderWorkouts();

        // Clear text inputs
        logDescInput.value = '';
        logOutputInput.value = '';
    }

    if (logBtn) {
        logBtn.addEventListener('click', logWorkout);
    }

    // Debug check for inputs
    if (!logTypeInput || !logDateInput || !logDescInput || !logOutputInput) {
        console.error('One or more log inputs are missing');
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
        { id: 'cross-country', title: 'Cross Country', distance: 500, type: 'distance', icon: '🌍' }
    ];

    function getAllClimbingChallenges() {
        const custom = JSON.parse(localStorage.getItem('custom_climbing_challenges') || '[]');
        return [...defaultClimbingChallenges, ...custom];
    }

    function getAllDistanceChallenges() {
        const custom = JSON.parse(localStorage.getItem('custom_distance_challenges') || '[]');
        return [...defaultDistanceChallenges, ...custom];
    }

    function getAllChallenges() {
        return [...getAllClimbingChallenges(), ...getAllDistanceChallenges()];
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
        const height = parseInt(newClimbingChallengeHeight.value);

        if (!name || !height || height <= 0) {
            alert('Please enter a valid name and height.');
            return;
        }

        const newChallenge = {
            id: 'custom_climbing_' + Date.now(),
            title: name,
            height: height,
            type: 'climbing',
            icon: '🚩'
        };

        const custom = JSON.parse(localStorage.getItem('custom_climbing_challenges') || '[]');
        custom.push(newChallenge);
        localStorage.setItem('custom_climbing_challenges', JSON.stringify(custom));

        renderChallenges();
        alert(`🎯 Created climbing goal: ${name}`);

        newClimbingChallengeName.value = '';
        newClimbingChallengeHeight.value = '';
    }

    function createCustomDistanceChallenge() {
        const name = newDistanceChallengeName.value.trim();
        const distance = parseFloat(newDistanceChallengeDistance.value);

        if (!name || !distance || distance <= 0) {
            alert('Please enter a valid name and distance.');
            return;
        }

        const newChallenge = {
            id: 'custom_distance_' + Date.now(),
            title: name,
            distance: distance,
            type: 'distance',
            icon: '🎯'
        };

        const custom = JSON.parse(localStorage.getItem('custom_distance_challenges') || '[]');
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
        return JSON.parse(localStorage.getItem('challenge_progress') || '{}');
    }

    function renderChallenges() {
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

                const card = document.createElement('div');
                card.className = `challenge-card ${isActive ? 'active-challenge' : ''}`;
                card.innerHTML = `
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

                    <button class="btn-challenge ${isActive ? 'active-btn' : 'join'}" 
                        data-id="${challenge.id}">
                        ${isActive ? 'Active Challenge' : 'Join Challenge'}
                    </button>
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

                const card = document.createElement('div');
                card.className = `challenge-card ${isActive ? 'active-challenge' : ''}`;
                card.innerHTML = `
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

                    <button class="btn-challenge ${isActive ? 'active-btn' : 'join'}" 
                        data-id="${challenge.id}">
                        ${isActive ? 'Active Challenge' : 'Join Challenge'}
                    </button>
                `;
                distanceChallengesGrid.appendChild(card);
            });
        }

        // Add Listeners for both types
        document.querySelectorAll('.btn-challenge.join').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                localStorage.setItem('active_challenge', id);
                renderChallenges();
                const all = getAllChallenges();
                const challenge = all.find(c => c.id === id);
                if (challenge.type === 'climbing') {
                    alert(`🏔️ You are now climbing ${challenge.title}!`);
                } else {
                    alert(`🏃 You are now pursuing ${challenge.title}!`);
                }
            });
        });

        // Update Target Challenge Dropdown
        if (targetChallengeSelect) {
            targetChallengeSelect.innerHTML = '';
            const all = getAllChallenges();
            all.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.title;
                if (c.id === activeId) opt.selected = true;
                targetChallengeSelect.appendChild(opt);
            });
        }
    }

    let editingWorkoutId = null;

    function renderWorkouts() {
        if (!workoutList) return;
        workoutList.innerHTML = '';

        if (workoutHistory.length === 0) {
            workoutList.innerHTML = '<p style="color: grey; font-style: italic;">No workouts logged yet.</p>';
            return;
        }

        workoutHistory.forEach(workout => {
            const item = document.createElement('div');
            item.className = 'workout-item';

            // Check if this workout is being edited
            if (editingWorkoutId === workout.id) {
                // Render Edit Form
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
                // Render Normal View (with Edit Button)
                const icon = getIconForType(workout.type) || '💪';
                const unitLabel = workout.metricType === 'miles' ? 'mi' : 'kJ';

                item.innerHTML = `
                    <input type="checkbox" class="workout-checkbox" data-output="${workout.output}">
                    <div class="workout-info">
                        <span class="workout-title">${icon} ${workout.title}</span>
                        <span class="workout-meta">${workout.date} • ${workout.output} ${unitLabel}</span>
                    </div>
                    <div class="workout-actions">
                         <button class="btn-icon edit" data-id="${workout.id}" title="Edit">✏️</button>
                    </div>
                `;
            }
            workoutList.appendChild(item);
        });

        // Add Listeners
        document.querySelectorAll('.workout-checkbox').forEach(cb => {
            cb.addEventListener('change', updateChallengeSummary);
        });

        // Edit Button Listeners
        document.querySelectorAll('.btn-icon.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                editingWorkoutId = parseInt(e.currentTarget.dataset.id);
                renderWorkouts();
            });
        });

        // Save Button Listeners
        document.querySelectorAll('.btn-icon.save').forEach(btn => {
            btn.addEventListener('click', (e) => {
                saveWorkout(parseInt(e.currentTarget.dataset.id));
            });
        });

        // Cancel Button Listeners
        document.querySelectorAll('.btn-icon.cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                editingWorkoutId = null;
                renderWorkouts();
            });
        });

        // Delete Button Listeners
        document.querySelectorAll('.btn-icon.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (confirm('Are you sure you want to delete this workout?')) {
                    deleteWorkout(parseInt(e.currentTarget.dataset.id));
                }
            });
        });
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
            totalKj += parseInt(cb.dataset.output);
        });

        challengeSummary.textContent = `${totalKj} kJ selected`;
        addToChallengeBtn.disabled = totalKj === 0;

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
            const progressMap = getChallengeProgress();

            // Fix: Calculate new progress correctly
            const currentProgress = progressMap[targetId] || 0;
            const newProgress = currentProgress + addedMeters;

            progressMap[targetId] = newProgress;
            localStorage.setItem('challenge_progress', JSON.stringify(progressMap));

            // 4. Update UI
            renderChallenges();

            // Celebrate
            // confetti({
            //     particleCount: 150,
            //     spread: 100,
            //     origin: { y: 0.6 }
            // });

            const all = getAllChallenges();
            // Fix: Use addedMeters variable
            alert(`🔥 Awesome! ${totalKj} kJ converted to ${addedMeters}m!\nAdded to ${all.find(c => c.id === targetId).title}.`);

            // Switch tab to Challenges to see progress?
            document.querySelector('[data-tab="challenges"]').click();
        });
    }

    // --- Migration Logic ---
    function migrateLegacyData() {
        // 1. Migrate 'custom_challenges' to 'custom_climbing_challenges' (assuming they are climbing if they have height)
        const legacyCustom = JSON.parse(localStorage.getItem('custom_challenges') || '[]');
        if (legacyCustom.length > 0) {
            console.log('Migrating legacy custom challenges...', legacyCustom);
            let climbing = JSON.parse(localStorage.getItem('custom_climbing_challenges') || '[]');

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
        const legacyChallenges = JSON.parse(localStorage.getItem('challenges') || '[]');
        if (legacyChallenges.length > 0) {
            console.log('Migrating legacy "challenges"...', legacyChallenges);
            let climbing = JSON.parse(localStorage.getItem('custom_climbing_challenges') || '[]');

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

    // --- Init ---
    migrateLegacyData(); // Run migration before rendering
    checkAuth();
    loadSettings();
    loadTheme();
    loadBadges();
    renderWorkouts();
    renderChallenges();
});
