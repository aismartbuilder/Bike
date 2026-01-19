
import './style.css'
import { calculateElevation } from './physicsEngine.js'
import { auth } from './src/auth.js'
import confetti from 'canvas-confetti'

document.addEventListener('DOMContentLoaded', () => {
    // --- View Elements ---
    const views = {
        landing: document.getElementById('landing-view'),
        login: document.getElementById('login-view'),
        signup: document.getElementById('signup-view'),
        app: document.getElementById('app-view')
    };

    const nav = document.getElementById('main-nav');
    const logoutBtn = document.getElementById('logout-btn');

    // --- State Management ---
    function switchView(viewName) {
        // Hide all views
        Object.values(views).forEach(el => el.classList.add('hidden'));
        // Show target view
        if (views[viewName]) {
            views[viewName].classList.remove('hidden');
        }

        // Handle Nav Visibility
        if (viewName === 'app') {
            nav.classList.remove('hidden');
        } else {
            nav.classList.add('hidden');
        }
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

    // Logout
    logoutBtn.addEventListener('click', () => {
        auth.logout();
        switchView('landing');
    });

    // --- Event Listeners : Auth Forms ---

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

    calculateBtn.addEventListener('click', () => {
        const totalOutput = parseFloat(outputInput.value);
        let userWeight = parseFloat(weightInput.value);

        // Handle Weight Unit
        const weightUnit = localStorage.getItem('unit_weight') || 'kg';
        if (weightUnit === 'lbs') {
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

    // --- Tab Switching Logic ---
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = {
        calculator: document.getElementById('tab-calculator'),
        profile: document.getElementById('tab-profile')
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
            document.querySelector("label[for='profile-weight']").textContent = `Default Weight`;
            document.querySelector("label[for='user-weight']").textContent = `Your Weight (${unit})`;
        } else {
            document.querySelector("label[for='profile-goal']").textContent = `Weekly Goal`;
        }
    }

    // Listeners
    weightToggles.forEach(t => t.addEventListener('click', () => setUnit('weight', t.dataset.unit)));
    distanceToggles.forEach(t => t.addEventListener('click', () => setUnit('distance', t.dataset.unit)));

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
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
        });

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
    const manualTitleInput = document.getElementById('manual-title');
    const manualOutputInput = document.getElementById('manual-output');
    const addManualBtn = document.getElementById('add-manual-btn');
    const syncBtn = document.getElementById('sync-peloton-btn');

    let mockWorkouts = JSON.parse(localStorage.getItem('synced_workouts') || '[]');

    // Default data if empty
    if (mockWorkouts.length === 0) {
        mockWorkouts = [
            { id: 1, date: 'Today', title: '30 min Climb Ride', output: 400 },
            { id: 2, date: 'Yesterday', title: '20 min HIIT', output: 250 },
            { id: 3, date: 'Oct 24', title: '45 min Power Zone', output: 600 }
        ];
    }

    function addManualWorkout() {
        const title = manualTitleInput.value.trim();
        const output = parseInt(manualOutputInput.value);

        if (!title || !output || output <= 0) {
            alert('Please enter a valid title and positive output.');
            return;
        }

        const newWorkout = {
            id: Date.now(),
            date: 'Today', // Simplified for manual entry
            title: title,
            output: output
        };

        mockWorkouts.unshift(newWorkout); // Add to top
        localStorage.setItem('synced_workouts', JSON.stringify(mockWorkouts));
        renderWorkouts();

        // Clear inputs
        manualTitleInput.value = '';
        manualOutputInput.value = '';
    }

    if (addManualBtn) {
        addManualBtn.addEventListener('click', addManualWorkout);

        // Allow Enter key
        [manualTitleInput, manualOutputInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') addManualWorkout();
            });
        });
    }

    // --- Simulated Sync Logic ---
    const possibleRides = [
        { title: '45 min Pop Ride', minOutput: 400, maxOutput: 600 },
        { title: '30 min Tabata', minOutput: 300, maxOutput: 500 },
        { title: '20 min Low Impact', minOutput: 150, maxOutput: 250 },
        { title: '60 min Climb', minOutput: 600, maxOutput: 900 },
        { title: '30 min HIIT & Hills', minOutput: 350, maxOutput: 550 }
    ];

    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            // Animate
            syncBtn.classList.add('spin');

            // Simulate Delay
            setTimeout(() => {
                syncBtn.classList.remove('spin');

                // create random ride
                const template = possibleRides[Math.floor(Math.random() * possibleRides.length)];
                const randomOutput = Math.floor(Math.random() * (template.maxOutput - template.minOutput + 1)) + template.minOutput;

                const newWorkout = {
                    id: Date.now(),
                    date: 'Just now',
                    title: template.title,
                    output: randomOutput
                };

                mockWorkouts.unshift(newWorkout);
                localStorage.setItem('synced_workouts', JSON.stringify(mockWorkouts));
                renderWorkouts();

                alert(`✅ Synced! Found new ride: ${template.title}`);
            }, 1500);
        });
    }

    function renderWorkouts() {
        if (!workoutList) return;
        workoutList.innerHTML = '';

        mockWorkouts.forEach(workout => {
            const item = document.createElement('div');
            item.className = 'workout-item';
            item.innerHTML = `
                <input type="checkbox" class="workout-checkbox" data-output="${workout.output}">
                <div class="workout-info">
                    <span class="workout-title">${workout.title}</span>
                    <span class="workout-meta">${workout.date} • ${workout.output} kJ</span>
                </div>
            `;
            workoutList.appendChild(item);
        });

        // Add Listeners
        document.querySelectorAll('.workout-checkbox').forEach(cb => {
            cb.addEventListener('change', updateChallengeSummary);
        });
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
            const total = updateChallengeSummary();

            // Celebrate
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });

            alert(`🔥 Awesome! Added ${total} kJ to your active challenge!`);

            // Optional: Auto-fill main calculator for fun
            document.getElementById('output-kj').value = total;
            // Switch to Climb tab to show potential
            // document.querySelector('[data-tab="calculator"]').click();
        });
    }

    // --- Init ---
    checkAuth();
    loadSettings();
    loadTheme();
    loadBadges();
    renderWorkouts();
});
