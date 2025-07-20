# My Focus Timer Chrome Extension

An intuitive circular focus timer Chrome extension to help you stay concentrated on your work.

## 🎯 Key Features

### ⏰ Visual Circular Timer
- SVG-based circular pie chart for intuitive time flow display
- Circle gradually decreases as time passes
- Remaining time (minutes:seconds) displayed in center
- Color changes based on progress (Green → Yellow → Red)

### ⚙ Convenient Settings
- **Preset buttons**: One-click setup for 5, 10, 15, 25, 50 minutes
- **Slider**: Custom setting from 1~60 minutes
- **Controls**: Start/Pause/Reset buttons

### 🔔 Notification Features
- Chrome toolbar icon shows remaining time (minutes)
- System notification when timer completes
- Continues running in background even when popup is closed

### 🗗 Standalone Window Mode
- **Open in separate window** button launches standalone window
- 400x500 sized popup-style standalone window
- Continuous monitoring without auto-closing
- Works independently from browser tabs

### 🎨 User Settings
- **Dark Mode/Light Mode** support
- **Alarm Sound ON/OFF** setting (actual MP3 playback)
- Settings automatically saved

## 📁 Project Structure

```
my-focus-timer-extension/
├── manifest.json       # Chrome Extension configuration
├── popup.html          # Main popup UI
├── popup.js           # Popup timer logic and UI controls
├── standalone.html     # Standalone window UI 
├── standalone.js      # Standalone window timer logic
├── style.css          # Common styles (light/dark theme)
├── background.js      # Service worker (state management, notifications)
├── sounds/            # Alarm sound files
│   ├── alarm.mp3      # Timer completion alarm (around 2 seconds)
│   └── README.md      # Alarm sound file guide
├── icons/             # Extension icons
└── README.md          # This file
```

## 🚀 Installation and Usage

### Installation
1. Open Chrome browser and go to `chrome://extensions/`
2. Enable **Developer mode** in the top right
3. Click **Load unpacked**
4. Select the `my-focus-timer-extension` folder
5. **Prepare alarm sound file**: Add a 2-second alarm sound file to `sounds/alarm.mp3`

### How to Use
1. Click the timer icon in Chrome toolbar
2. Set time using preset buttons or slider
3. Click **Start** button
4. Timer continues running even when popup is closed
5. Get notified when time is up and take a break!

### Standalone Window Usage
1. Click **🗗 Open in separate window** button in popup
2. 400x500 sized standalone window opens
3. Set and run timer in the standalone window
4. Window stays open until manually closed
5. Multiple standalone windows can be opened simultaneously

## 💡 Usage Tips

- **Badge Display**: Remaining time (minutes) shown on toolbar icon
- **Color Changes**: 
  - 🟢 Green: 50%+ remaining
  - 🟡 Yellow: 25-50% remaining  
  - 🔴 Red: Less than 25% remaining
- **Settings**: Access theme and notification settings via ⚙️ icon in top right
- **Standalone Window**: Use 🗗 button to open separate window for continuous monitoring
- **Alarm Sound**: Actual MP3 alarm plays when timer completes (50% volume)

## 🎯 Target Users
- Remote workers
- Students  
- Freelancers
- ADHD/ADD users
- Anyone who wants to improve work focus

## 🔧 Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript ES6
- **Graphics**: SVG
- **Audio**: HTML5 Audio API (MP3 playback)
- **Storage**: Chrome Storage API
- **Notifications**: Chrome Notifications API
- **Windows**: Chrome Windows API (standalone window)
- **Architecture**: Chrome Extension Manifest v3

## 📝 Development Log

### Implemented Features
- ✅ Circular focus timer (SVG)
- ✅ Preset and custom time settings
- ✅ Start/Pause/Reset controls
- ✅ Background timer persistence
- ✅ Toolbar badge display
- ✅ System notifications
- ✅ Dark/Light mode
- ✅ Settings save/load
- ✅ Standalone window mode
- ✅ Actual MP3 alarm sound playback

### Future Improvements
- 🔄 Pomodoro mode (25-5-25-5 auto loop)
- 📊 Usage statistics and history
- 🎵 Additional alarm sound files
- 🎨 Custom color themes
- 📱 Repeat timer functionality

## 📄 License
MIT License

## 👨‍💻 Developer
My Focus Timer Extension - An intuitive timer for work focus

---

**💡 Core Concept**: "Intuitive circular focus timer + minimal distraction + gentle notifications only when needed - Chrome Extension" 