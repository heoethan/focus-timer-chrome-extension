// Timer state management
class TimerState {
    constructor() {
        this.timeLeft = 0; // seconds
        this.totalTime = 0; // seconds
        this.isRunning = false;
        this.isPaused = false;
        this.timerInterval = null;
    }

    reset() {
        this.timeLeft = 0;
        this.totalTime = 0;
        this.isRunning = false;
        this.isPaused = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    setTime(minutes) {
        this.totalTime = minutes * 60;
        this.timeLeft = this.totalTime;
    }

    start() {
        this.isRunning = true;
        this.isPaused = false;
    }

    pause() {
        this.isRunning = false;
        this.isPaused = true;
    }

    stop() {
        this.isRunning = false;
        this.isPaused = false;
    }
}

// Main Timer class
class MyFocusTimer {
    constructor() {
        this.state = new TimerState();
        this.elements = this.getElements();
        this.settings = {
            alarmEnabled: true,
            darkMode: false
        };
        
        this.init();
    }

    getElements() {
        return {
            // Main view elements
            mainView: document.getElementById('mainView'),
            settingsView: document.getElementById('settingsView'),
            
            // Timer elements
            progressCircle: document.getElementById('progressCircle'),
            timeDisplay: document.getElementById('timeDisplay'),
            statusText: document.getElementById('statusText'),
            
            // Control elements
            startBtn: document.getElementById('startBtn'),
            pauseBtn: document.getElementById('pauseBtn'),
            resetBtn: document.getElementById('resetBtn'),
            
            // Preset buttons
            presetBtns: document.querySelectorAll('.preset-btn'),
            
            // Slider elements
            timeSlider: document.getElementById('timeSlider'),
            sliderValue: document.getElementById('sliderValue'),
            
            // Settings elements
            settingsBtn: document.getElementById('settingsBtn'),
            openWindowBtn: document.getElementById('openWindowBtn'),
            backBtn: document.getElementById('backBtn'),
            soundToggle: document.getElementById('soundToggle'),
            themeToggle: document.getElementById('themeToggle')
        };
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.updateUI();
        this.syncWithBackground();
        
        // Apply theme
        this.applyTheme();
    }

    setupEventListeners() {
        // Control buttons
        this.elements.startBtn.addEventListener('click', () => this.startTimer());
        this.elements.pauseBtn.addEventListener('click', () => this.pauseTimer());
        this.elements.resetBtn.addEventListener('click', () => this.resetTimer());
        
        // Preset buttons
        this.elements.presetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const minutes = parseInt(e.target.dataset.minutes);
                this.setPresetTime(minutes);
            });
        });
        
        // Time slider
        this.elements.timeSlider.addEventListener('input', (e) => {
            const minutes = parseInt(e.target.value);
            this.elements.sliderValue.textContent = minutes;
            this.setCustomTime(minutes);
        });
        
        // Settings navigation
        this.elements.settingsBtn.addEventListener('click', () => this.showSettings());
        this.elements.openWindowBtn.addEventListener('click', () => this.openStandaloneWindow());
        this.elements.backBtn.addEventListener('click', () => this.showMain());
        
        // Settings toggles
        this.elements.soundToggle.addEventListener('change', (e) => {
            this.settings.alarmEnabled = e.target.checked;
            this.saveSettings();
        });
        
        this.elements.themeToggle.addEventListener('change', (e) => {
            this.settings.darkMode = e.target.checked;
            this.applyTheme();
            this.saveSettings();
        });
        
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleBackgroundMessage(message);
            // Don't return true unless we're actually sending an async response
        });
    }

    async syncWithBackground() {
        try {
            const response = await chrome.runtime.sendMessage({action: 'getTimerState'});
            if (response && response.state) {
                this.updateFromBackgroundState(response.state);
            }
        } catch (error) {
            console.log('Background script not ready yet:', error.message);
        }
    }

    updateFromBackgroundState(bgState) {
        if (bgState.isRunning || bgState.isPaused) {
            this.state.timeLeft = bgState.timeLeft;
            this.state.totalTime = bgState.totalTime;
            this.state.isRunning = bgState.isRunning;
            this.state.isPaused = bgState.isPaused;
            
            if (this.state.isRunning) {
                this.startLocalTimer();
            }
            
            this.updateUI();
            this.updateProgressCircle();
        }
    }

    setPresetTime(minutes) {
        if (this.state.isRunning) return;
        
        this.state.setTime(minutes);
        this.updateActivePreset(minutes);
        this.updateUI();
        this.updateProgressCircle();
        
        // Update slider to match preset
        this.elements.timeSlider.value = minutes;
        this.elements.sliderValue.textContent = minutes;
    }

    setCustomTime(minutes) {
        if (this.state.isRunning) return;
        
        this.state.setTime(minutes);
        this.clearActivePresets();
        this.updateUI();
        this.updateProgressCircle();
    }

    updateActivePreset(minutes) {
        this.elements.presetBtns.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.minutes) === minutes);
        });
    }

    clearActivePresets() {
        this.elements.presetBtns.forEach(btn => {
            btn.classList.remove('active');
        });
    }

    async startTimer() {
        if (this.state.timeLeft === 0) return;
        
        this.state.start();
        this.startLocalTimer();
        this.updateUI();
        
        // Notify background script
        try {
            await chrome.runtime.sendMessage({
                action: 'startTimer',
                timeLeft: this.state.timeLeft,
                totalTime: this.state.totalTime
            });
        } catch (error) {
            console.log('Could not notify background script:', error.message);
        }
    }

    async pauseTimer() {
        this.state.pause();
        this.stopLocalTimer();
        this.updateUI();
        
        // Notify background script
        try {
            await chrome.runtime.sendMessage({
                action: 'pauseTimer',
                timeLeft: this.state.timeLeft
            });
        } catch (error) {
            console.log('Could not notify background script:', error.message);
        }
    }

    async resetTimer() {
        this.state.reset();
        this.stopLocalTimer();
        this.updateUI();
        this.updateProgressCircle();
        
        // Notify background script
        try {
            await chrome.runtime.sendMessage({action: 'resetTimer'});
        } catch (error) {
            console.log('Could not notify background script:', error.message);
        }
    }

    startLocalTimer() {
        this.stopLocalTimer(); // Clear any existing interval
        
        this.state.timerInterval = setInterval(() => {
            if (this.state.timeLeft > 0) {
                this.state.timeLeft--;
                this.updateUI();
                this.updateProgressCircle();
                
                // Check if timer just completed
                if (this.state.timeLeft === 0) {
                    this.onTimerComplete();
                }
            }
        }, 1000);
    }

    stopLocalTimer() {
        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval);
            this.state.timerInterval = null;
        }
    }

    onTimerComplete() {
        // Prevent multiple calls
        if (!this.state.isRunning) {
            return;
        }
        
        this.stopLocalTimer();
        this.state.stop();
        this.updateUI();
        
        // The background script will handle notifications
        try {
            chrome.runtime.sendMessage({action: 'timerComplete'});
        } catch (error) {
            console.log('Could not notify background script of timer completion:', error.message);
        }
    }

    handleBackgroundMessage(message) {
        switch (message.action) {
            case 'timerTick':
                this.state.timeLeft = message.timeLeft;
                this.updateUI();
                this.updateProgressCircle();
                break;
            case 'timerComplete':
                this.onTimerComplete();
                break;
            case 'timerUpdate':
                this.updateFromBackgroundState(message.state);
                break;
            case 'playAlarmSound':
                this.playAlarmSound();
                break;
        }
    }

    async playAlarmSound() {
        try {
            console.log('Playing alarm sound in popup...');
            
            // Try to play the WAV file first
            const alarmUrl = chrome.runtime.getURL('sounds/alarm.wav');
            const audio = new Audio(alarmUrl);
            audio.volume = 0.5; // 50% volume
            
            // Add event listeners
            audio.addEventListener('canplay', () => {
                console.log('Alarm audio can play');
            });
            audio.addEventListener('ended', () => {
                console.log('Alarm audio playback ended');
            });
            audio.addEventListener('error', (e) => {
                console.error('Alarm audio error:', e);
                // Fallback to generated sound
                this.generateAlarmBeep();
            });
            
            await audio.play();
            console.log('Alarm sound played successfully');
            
        } catch (error) {
            console.error('Error playing alarm sound:', error);
            // Fallback to generated beep sound
            this.generateAlarmBeep();
        }
    }

    generateAlarmBeep() {
        try {
            console.log('Generating alarm beep sound...');
            
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create a simple two-tone alarm
            const createTone = (frequency, startTime, duration) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = frequency;
                oscillator.type = 'sine';
                
                // Fade in and out
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
                gainNode.gain.linearRampToValueAtTime(0.3, startTime + duration - 0.05);
                gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
                
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            };
            
            const now = audioContext.currentTime;
            
            // First tone: 800Hz for 0.3 seconds
            createTone(800, now, 0.3);
            
            // Brief pause
            
            // Second tone: 600Hz for 0.3 seconds
            createTone(600, now + 0.4, 0.3);
            
            console.log('Generated alarm beep');
            
        } catch (error) {
            console.error('Error generating alarm beep:', error);
        }
    }

    updateUI() {
        // Update time display
        const minutes = Math.floor(this.state.timeLeft / 60);
        const seconds = this.state.timeLeft % 60;
        this.elements.timeDisplay.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update status text
        if (this.state.isRunning) {
            this.elements.statusText.textContent = 'Running';
            document.body.classList.add('timer-running');
        } else if (this.state.isPaused) {
            this.elements.statusText.textContent = 'Paused';
            document.body.classList.remove('timer-running');
        } else if (this.state.timeLeft === 0) {
            this.elements.statusText.textContent = 'Set timer';
            document.body.classList.remove('timer-running');
        } else {
            this.elements.statusText.textContent = 'Ready';
            document.body.classList.remove('timer-running');
        }
        
        // Update button states
        const hasTime = this.state.timeLeft > 0;
        const isRunning = this.state.isRunning;
        const isPaused = this.state.isPaused;
        
        this.elements.startBtn.disabled = !hasTime || isRunning;
        this.elements.pauseBtn.disabled = !isRunning;
        this.elements.resetBtn.disabled = !hasTime && !isPaused;
        
        // Update button text
        if (isPaused) {
            this.elements.startBtn.textContent = 'Resume';
        } else {
            this.elements.startBtn.textContent = 'Start';
        }
    }

    updateProgressCircle() {
        const circle = this.elements.progressCircle;
        const radius = 90;
        const circumference = 2 * Math.PI * radius;
        
        let progress;
        if (this.state.totalTime === 0) {
            progress = 0;
        } else {
            progress = (this.state.totalTime - this.state.timeLeft) / this.state.totalTime;
        }
        
        const offset = circumference * progress;
        circle.style.strokeDashoffset = offset;
        
        // Update circle color based on progress
        const remaining = this.state.timeLeft / this.state.totalTime;
        if (remaining > 0.5) {
            circle.style.stroke = '#10b981'; // Green
        } else if (remaining > 0.25) {
            circle.style.stroke = '#f59e0b'; // Yellow
        } else {
            circle.style.stroke = '#ef4444'; // Red
        }
    }

    showSettings() {
        this.elements.mainView.classList.add('hidden');
        this.elements.settingsView.classList.remove('hidden');
    }

    showMain() {
        this.elements.settingsView.classList.add('hidden');
        this.elements.mainView.classList.remove('hidden');
    }

    async openStandaloneWindow() {
        try {
            const standaloneUrl = chrome.runtime.getURL('standalone.html');
            await chrome.windows.create({
                url: standaloneUrl,
                type: 'popup',
                width: 360,
                height: 555,
                focused: true
            });
            
            // Close the current popup if the window was opened successfully
            window.close();
        } catch (error) {
            console.error('Error opening standalone window:', error);
        }
    }

    applyTheme() {
        if (this.settings.darkMode) {
            document.body.setAttribute('data-theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['timerSettings']);
            if (result.timerSettings) {
                this.settings = { ...this.settings, ...result.timerSettings };
            }
            
            // Update UI elements
            this.elements.soundToggle.checked = this.settings.alarmEnabled;
            this.elements.themeToggle.checked = this.settings.darkMode;
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.local.set({
                timerSettings: this.settings
            });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
}

// Initialize the timer when the popup loads
document.addEventListener('DOMContentLoaded', () => {
    window.myFocusTimer = new MyFocusTimer();
}); 