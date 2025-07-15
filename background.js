// Background service worker for Focus Timer Extension

class BackgroundTimer {
    constructor() {
        this.state = {
            timeLeft: 0,
            totalTime: 0,
            isRunning: false,
            isPaused: false,
            startTime: null
        };
        this.timerInterval = null;
        this.settings = {
            alarmEnabled: true,
            darkMode: false
        };
        
        this.init();
    }

    async init() {
        console.log('🚀 Focus Timer background service worker initializing...');
        
        try {
            await this.loadSettings();
            await this.loadState();
            this.setupMessageListener();
            this.updateBadge();
            
            // Resume timer if it was running
            if (this.state.isRunning && this.state.startTime) {
                console.log('📋 Resuming timer from previous session...');
                await this.resumeTimer();
            }
            
            console.log('✅ Background service worker initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing background service worker:', error);
        }
    }

    // =====================================
    // 메시지 처리 (Message Handling)
    // =====================================
    
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('📨 Message received:', message.action, message);
            return this.handleMessage(message, sender, sendResponse);
        });
    }

    handleMessage(message, sender, sendResponse) {
        // 메시지 유효성 검사
        if (!message || !message.action) {
            console.warn('⚠️ Invalid message received:', message);
            sendResponse({ error: 'Invalid message format' });
            return false;
        }

        try {
            switch (message.action) {
                case 'getTimerState':
                    console.log('🔍 Timer state requested');
                    sendResponse({ success: true, state: this.state });
                    return false; // 동기 응답
                    
                case 'startTimer':
                    console.log('▶️ 타이머 시작 명령 수신');
                    this.handleStartTimer(message, sendResponse);
                    return true; // 비동기 응답
                    
                case 'pauseTimer':
                    console.log('⏸️ 타이머 일시정지 명령 수신');
                    this.handlePauseTimer(message, sendResponse);
                    return true; // 비동기 응답
                    
                case 'resetTimer':
                    console.log('🔄 타이머 리셋 명령 수신');
                    this.handleResetTimer(message, sendResponse);
                    return true; // 비동기 응답
                    
                case 'timerComplete':
                    console.log('⏰ 타이머 완료 명령 수신');
                    this.handleTimerComplete(message, sendResponse);
                    return true; // 비동기 응답
                    
                case 'getSettings':
                    console.log('⚙️ Settings requested');
                    sendResponse({ success: true, settings: this.settings });
                    return false; // 동기 응답
                    
                case 'updateSettings':
                    console.log('⚙️ Settings update requested');
                    this.handleUpdateSettings(message, sendResponse);
                    return true; // 비동기 응답
                    
                default:
                    console.warn('❓ Unknown action received:', message.action);
                    sendResponse({ error: `Unknown action: ${message.action}` });
                    return false;
            }
        } catch (error) {
            console.error('💥 Error handling message:', error);
            sendResponse({ error: error.message });
            return false;
        }
    }

    // 개별 메시지 핸들러들
    async handleStartTimer(message, sendResponse) {
        try {
            await this.startTimer(message.timeLeft, message.totalTime);
            sendResponse({ success: true, message: 'Timer started successfully' });
        } catch (error) {
            console.error('❌ Error starting timer:', error);
            sendResponse({ error: error.message });
        }
    }

    async handlePauseTimer(message, sendResponse) {
        try {
            await this.pauseTimer(message.timeLeft);
            sendResponse({ success: true, message: 'Timer paused successfully' });
        } catch (error) {
            console.error('❌ Error pausing timer:', error);
            sendResponse({ error: error.message });
        }
    }

    async handleResetTimer(message, sendResponse) {
        try {
            await this.resetTimer();
            sendResponse({ success: true, message: 'Timer reset successfully' });
        } catch (error) {
            console.error('❌ Error resetting timer:', error);
            sendResponse({ error: error.message });
        }
    }

    async handleTimerComplete(message, sendResponse) {
        try {
            await this.onTimerComplete();
            sendResponse({ success: true, message: 'Timer completion handled successfully' });
        } catch (error) {
            console.error('❌ Error handling timer completion:', error);
            sendResponse({ error: error.message });
        }
    }

    async handleUpdateSettings(message, sendResponse) {
        try {
            this.settings = { ...this.settings, ...message.settings };
            await this.saveSettings();
            sendResponse({ success: true, message: 'Settings updated successfully' });
        } catch (error) {
            console.error('❌ Error updating settings:', error);
            sendResponse({ error: error.message });
        }
    }

    // =====================================
    // 타이머 제어 (Timer Control)
    // =====================================

    async startTimer(timeLeft, totalTime) {
        console.log(`🎯 Starting timer: ${timeLeft}s (${Math.floor(timeLeft/60)}m ${timeLeft%60}s)`);
        
        this.state.timeLeft = timeLeft;
        this.state.totalTime = totalTime;
        this.state.isRunning = true;
        this.state.isPaused = false;
        this.state.startTime = Date.now();
        
        await this.saveState();
        this.startBackgroundTimer();
        this.updateBadge();
        
        // 팝업에 상태 알림
        await this.notifyPopups('timerStateChanged', this.state);
        
        console.log('✅ Timer started successfully');
    }

    async pauseTimer(timeLeft) {
        console.log(`⏸️ Pausing timer at ${timeLeft}s`);
        
        this.state.timeLeft = timeLeft;
        this.state.isRunning = false;
        this.state.isPaused = true;
        this.state.startTime = null;
        
        this.stopBackgroundTimer();
        await this.saveState();
        this.updateBadge();
        
        // 팝업에 상태 알림
        await this.notifyPopups('timerStateChanged', this.state);
        
        console.log('✅ Timer paused successfully');
    }

    async resetTimer() {
        console.log('🔄 Resetting timer');
        
        this.state = {
            timeLeft: 0,
            totalTime: 0,
            isRunning: false,
            isPaused: false,
            startTime: null
        };
        
        this.stopBackgroundTimer();
        await this.saveState();
        this.updateBadge();
        
        // 팝업에 상태 알림
        await this.notifyPopups('timerStateChanged', this.state);
        
        console.log('✅ Timer reset successfully');
    }

    startBackgroundTimer() {
        this.stopBackgroundTimer(); // 기존 타이머 정리
        
        console.log('⏰ Background timer started');
        
        this.timerInterval = setInterval(async () => {
            if (this.state.timeLeft > 0) {
                this.state.timeLeft--;
                await this.saveState();
                this.updateBadge();
                
                // 매초마다 팝업에 알림 (성능을 위해 5초마다로 제한할 수도 있음)
                await this.notifyPopups('timerTick', { timeLeft: this.state.timeLeft });
                
                // 타이머 완료 체크
                if (this.state.timeLeft === 0) {
                    console.log('⏰ Timer reached zero - completing');
                    await this.onTimerComplete();
                }
            }
        }, 1000);
    }

    stopBackgroundTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            console.log('⏹️ Background timer stopped');
        }
    }

    async resumeTimer() {
        console.log('📋 Resuming timer from previous session');
        
        // 시작된 이후 경과 시간 계산
        const elapsedTime = Math.floor((Date.now() - this.state.startTime) / 1000);
        this.state.timeLeft = Math.max(0, this.state.timeLeft - elapsedTime);
        
        await this.saveState();
        this.updateBadge();
        
        if (this.state.timeLeft > 0) {
            console.log(`🔄 Resumed with ${this.state.timeLeft}s remaining`);
            this.startBackgroundTimer();
        } else {
            console.log('⏰ Timer had already completed during absence');
            await this.onTimerComplete();
        }
    }

    async onTimerComplete() {
        // 중복 호출 방지
        if (!this.state.isRunning) {
            console.log('⚠️ Timer completion called but timer not running - ignoring');
            return;
        }
        
        console.log('🎉 Timer completed!');
        
        // 타이머 즉시 중지
        this.stopBackgroundTimer();
        
        // 상태 초기화
        this.state.isRunning = false;
        this.state.isPaused = false;
        this.state.timeLeft = 0;
        this.state.startTime = null;
        
        await this.saveState();
        this.updateBadge();
        
        // 알림 표시
        await this.showNotification();
        
        // 알람 재생 (설정에 따라)
        if (this.settings.alarmEnabled) {
            await this.playAlarm();
        }
        
        // 팝업에 완료 알림
        await this.notifyPopups('timerComplete', { message: 'Timer has completed!' });
        
        console.log('✅ Timer completion handled successfully');
    }

    // =====================================
    // 알림 시스템 (Notification System)
    // =====================================

    async showNotification() {
        try {
            console.log('🔔 Showing completion notification');
            
            await chrome.notifications.create('timer-complete', {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
                title: '⏰ Timer Complete!',
                message: 'Your timer has finished. Time for a break!',
                priority: 2,
                requireInteraction: true
            });
            
            // 10초 후 자동 삭제
            setTimeout(() => {
                chrome.notifications.clear('timer-complete').catch(console.warn);
            }, 10000);
            
            console.log('✅ Notification created successfully');
        } catch (error) {
            console.error('❌ Error showing notification:', error);
        }
    }

    async playAlarm() {
        try {
            console.log('🔊 Playing alarm sound');
            
            // 팝업/독립창에 알람 재생 요청
            await this.notifyPopups('playAlarmSound', { volume: 0.5 });
            
            // 백업으로 알림 사운드 생성 (일부 브라우저에서만 작동)
            try {
                await chrome.notifications.create('alarm-sound', {
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
                    title: '🔔 Alarm!',
                    message: 'Timer completed!',
                    priority: 2
                });
                
                // 빠르게 삭제 (소리만 재생)
                setTimeout(() => {
                    chrome.notifications.clear('alarm-sound').catch(console.warn);
                }, 1000);
                
                console.log('✅ Alarm notification created');
            } catch (notificationError) {
                console.warn('⚠️ Could not create alarm notification:', notificationError.message);
            }
            
        } catch (error) {
            console.error('❌ Error playing alarm:', error);
        }
    }

    // =====================================
    // 팝업/독립창 통신 (Popup Communication)
    // =====================================

    async notifyPopups(action, data = {}) {
        try {
            await chrome.runtime.sendMessage({
                action: action,
                ...data
            });
            console.log(`📤 Message sent to popups: ${action}`);
        } catch (error) {
            // 팝업이 열려있지 않으면 정상적인 상황
            console.log(`📭 No popup/standalone window to notify: ${action} (${error.message})`);
        }
    }

    // =====================================
    // UI 업데이트 (UI Updates)
    // =====================================

    updateBadge() {
        try {
            if (this.state.isRunning || this.state.isPaused) {
                const minutes = Math.ceil(this.state.timeLeft / 60);
                const badgeText = minutes > 0 ? minutes.toString() : '!';
                const badgeColor = this.state.isRunning ? '#10b981' : '#f59e0b';
                
                chrome.action.setBadgeText({ text: badgeText });
                chrome.action.setBadgeBackgroundColor({ color: badgeColor });
                
                console.log(`🏷️ Badge updated: ${badgeText} (${badgeColor})`);
            } else {
                chrome.action.setBadgeText({ text: '' });
                console.log('🏷️ Badge cleared');
            }
        } catch (error) {
            console.error('❌ Error updating badge:', error);
        }
    }

    // =====================================
    // 데이터 저장/로드 (Data Persistence)
    // =====================================

    async saveState() {
        try {
            await chrome.storage.local.set({
                timerState: this.state
            });
            console.log('💾 Timer state saved');
        } catch (error) {
            console.error('❌ Error saving timer state:', error);
        }
    }

    async loadState() {
        try {
            const result = await chrome.storage.local.get(['timerState']);
            if (result.timerState) {
                this.state = { ...this.state, ...result.timerState };
                console.log('📂 Timer state loaded:', this.state);
            } else {
                console.log('📂 No previous timer state found');
            }
        } catch (error) {
            console.error('❌ Error loading timer state:', error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.local.set({
                timerSettings: this.settings
            });
            console.log('💾 Settings saved:', this.settings);
        } catch (error) {
            console.error('❌ Error saving settings:', error);
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['timerSettings']);
            if (result.timerSettings) {
                this.settings = { ...this.settings, ...result.timerSettings };
                console.log('📂 Settings loaded:', this.settings);
            } else {
                console.log('📂 No previous settings found, using defaults');
            }
        } catch (error) {
            console.error('❌ Error loading settings:', error);
        }
    }
}

// =====================================
// 확장 프로그램 이벤트 핸들러
// =====================================

// 확장 프로그램 설치/업데이트
chrome.runtime.onInstalled.addListener((details) => {
    console.log('🚀 Focus Timer extension installed/updated:', details.reason);
    
    if (details.reason === 'install') {
        console.log('🎉 First time installation - setting up defaults');
        // 기본 설정 저장
        chrome.storage.local.set({
            timerSettings: {
                alarmEnabled: true,
                darkMode: false
            }
        }).catch(console.error);
    }
});

// 확장 프로그램 시작
chrome.runtime.onStartup.addListener(() => {
    console.log('🌅 Focus Timer extension started');
});

// 백그라운드 타이머 인스턴스 생성
console.log('🏗️ Creating background timer instance...');
const backgroundTimer = new BackgroundTimer();

// 알림 클릭 핸들러
chrome.notifications.onClicked.addListener((notificationId) => {
    console.log('🔔 Notification clicked:', notificationId);
    
    if (notificationId === 'timer-complete') {
        // 팝업 열기 시도
        chrome.action.openPopup().catch((error) => {
            console.log('📝 Could not open popup:', error.message);
        });
        
        // 알림 정리
        chrome.notifications.clear(notificationId).catch(console.warn);
    }
});

// 스토리지 변경 감지 (설정 동기화)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.timerSettings) {
        console.log('⚙️ Settings changed externally, updating...');
        backgroundTimer.settings = { 
            ...backgroundTimer.settings, 
            ...changes.timerSettings.newValue 
        };
        console.log('✅ Settings synchronized:', backgroundTimer.settings);
    }
});

// 서비스 워커 연결 유지
chrome.runtime.onConnect.addListener((port) => {
    console.log('🔌 Port connected:', port.name);
    
    port.onDisconnect.addListener(() => {
        console.log('🔌 Port disconnected:', port.name);
    });
});

// 서비스 워커 종료 시 정리
self.addEventListener('beforeunload', () => {
    console.log('🧹 Service worker shutting down, cleaning up...');
    if (backgroundTimer && backgroundTimer.timerInterval) {
        clearInterval(backgroundTimer.timerInterval);
    }
});

// 전역 에러 핸들러
self.addEventListener('error', (event) => {
    console.error('🚨 Global error in service worker:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled promise rejection in service worker:', event.reason);
});

console.log('✅ Background service worker setup complete'); 