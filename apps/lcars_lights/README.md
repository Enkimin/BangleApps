# LCARS Lights Control

A battery-optimized LCARS-themed watch face for Bangle.js 2 that combines the iconic Star Trek LCARS aesthetic with practical smart home light control and music management.

![LCARS Lights](screenshot_1.png)

## Features

### ⚡ BATTERY SAFETY FIRST
This app is designed with **aggressive battery optimization** to ensure your Bangle.js 2 lasts all day:

- **Smart Polling**: Home Assistant requests ONLY when light screen is active and watch screen is on
- **Auto-Stop**: All network activity stops when screen turns off or switching away from light control
- **Failure Protection**: Automatically stops polling after connection failures (3 strikes)
- **Efficient Updates**: Only redraws screen elements that have actually changed
- **Configurable Intervals**: Poll every 30-300 seconds (default: 120 seconds)

### 🖥️ Three Screens

**Screen 1: Main Clock Face**
- Large time display in LCARS style
- Weather information (temperature, humidity from Gadgetbridge)
- Light status summary (X/Y lights on)
- Battery indicator with visual bar
- Random planet icons (Earth, Mars, Moon, Saturn)
- Date display

**Screen 2: Light Control**
- Control up to 6 Home Assistant lights
- Real-time on/off status with color indicators  
- Brightness levels shown as LCARS-style progress bars
- Connection status indicator (ONLINE/OFFLINE)
- Tap any light to toggle on/off
- LCARS-themed "ILLUMINATION SYSTEMS" interface

**Screen 3: Music Control** (optional)
- Current track info (artist, song, album)
- Playback progress bar with time display
- Touch controls:
  - Tap top: Play/Pause
  - Tap bottom left: Previous track  
  - Tap bottom right: Next track
- Works with any music app via Gadgetbridge (Spotify, YouTube Music, etc.)

### 🎨 LCARS Authentic Design
- True-to-series rounded end caps and segmented displays
- Configurable color themes (35+ colors available)
- Random color mode for variety
- Classic LCARS fonts and typography
- Fullscreen mode to hide widgets

### 🏠 Home Assistant Integration
- Secure REST API communication with authentication tokens
- HTTP/HTTPS support for local and cloud Home Assistant
- Automatic entity discovery from your HA instance
- Graceful error handling with offline mode
- Configurable light entity IDs (up to 6 lights)

## Setup Instructions

### 1. Home Assistant Configuration

**Create Long-Lived Access Token:**
1. Open Home Assistant web interface
2. Go to your Profile (click your username)
3. Scroll to "Long-Lived Access Tokens"
4. Click "Create Token" and give it a name like "Bangle Watch"
5. **IMPORTANT**: Copy the token immediately - you won't see it again!

**Find Your Light Entity IDs:**
1. In Home Assistant, go to Developer Tools > States
2. Look for entities starting with `light.`
3. Note the entity IDs (e.g., `light.living_room_main`, `light.kitchen_overhead`)

### 2. Watch Configuration

**Install the App:**
1. Open the Bangle.js App Loader
2. Search for "LCARS Lights Control" 
3. Click Install

**Configure Settings:**
1. On your watch, go to Settings > Apps > LCARS Lights
2. Set "HA Server URL" to your Home Assistant address:
   - Local: `http://192.168.1.100:8123` (replace with your HA IP)
   - Cloud: `https://your-ha-domain.duckdns.org:8123`
3. Set "HA Auth Token" to the long-lived token from step 1
4. Set "Light Entity IDs" to your lights (comma-separated):
   - Example: `light.living_room, light.kitchen, light.bedroom, light.office`

**Test Connection:**
1. Open the LCARS Lights app on your watch
2. Swipe right to go to the light control screen
3. Check if it shows "ONLINE" in the top right
4. Try tapping a light to toggle it

### 3. Optional: Music Setup
Music control works automatically with any music app that supports Gadgetbridge:
- Spotify
- YouTube Music  
- Apple Music (via phone)
- Local music players
- Podcasts apps

No additional setup required - just play music on your phone!

## Usage

### Navigation
- **Swipe left/right**: Switch between screens
- **Clock Screen**: Main time display with weather and light status
- **Light Screen**: Tap any room name to toggle that light
- **Music Screen**: Tap top for play/pause, tap bottom corners for next/prev

### Screen States
- **Clock Screen**: Shows time, weather, light count, battery
- **Light Screen**: Shows up to 6 lights with on/off status and brightness
- **Music Screen**: Shows current track with playback controls

### Battery Optimization Tips
1. **Use longer poll intervals**: 120+ seconds recommended
2. **The app automatically stops polling when**:
   - Screen is turned off
   - You switch away from light control screen
   - Home Assistant connection fails repeatedly
3. **Network activity only occurs**:
   - When light control screen is active AND visible
   - When screen is on
   - When connection is working

## Troubleshooting

### "OFFLINE" Status
1. **Check Home Assistant URL**: Must include `http://` or `https://`
2. **Verify token**: Create a new long-lived token if needed
3. **Test network**: Ensure watch can reach your HA server
4. **Check entity IDs**: Verify light entity names are correct
5. **Tap on OFFLINE**: Resets connection and tries again

### No Lights Showing
1. Verify entity IDs are in correct format: `light.room_name`
2. Check that entities exist in Home Assistant
3. Ensure entities are actually light entities (not switches)

### Battery Draining Fast
1. Increase poll interval to 180+ seconds
2. Check that polling stops when screen is off
3. Verify you're not seeing "OFFLINE" repeatedly (causes retry attempts)
4. Consider disabling music screen if not needed

### Music Not Working
1. Ensure Gadgetbridge is connected to your phone
2. Play music on your phone first
3. Check that Gadgetbridge music integration is enabled
4. Try different music apps

## Battery Performance

**Expected battery usage with default settings:**
- **Clock screen only**: ~2% per hour
- **With periodic light control use**: ~3-4% per hour  
- **Heavy light control use**: ~5-6% per hour

**Battery optimization is aggressive:**
- Zero network activity when screen off
- Zero network activity on clock/music screens
- Smart caching prevents unnecessary updates
- Failed connections stop trying automatically

## Technical Details

### Home Assistant API
- Uses REST API with Bearer token authentication
- HTTP timeout: 5 seconds maximum
- Supports both local and cloud Home Assistant instances
- Exponential backoff on failures

### Network Behavior
- **Poll Interval**: 30-300 seconds (configurable)
- **Request Timeout**: 5 seconds maximum
- **Failure Handling**: Stops after 3 consecutive failures
- **Smart Resumption**: Retry when switching back to light screen

### Memory Usage
- Efficient display caching
- Minimal memory allocations
- Proper cleanup on app exit
- No memory leaks from intervals/timers

## Credits

Based on the original LCARS clock face by [David Peer](https://github.com/peerdavid) and contributors:
- [Adam Schmalhofer](https://github.com/adamschmalhofer)
- [Jon Warrington](https://github.com/BartokW)
- [Ronin Stegner](https://github.com/Ronin0000)

Enhanced with Home Assistant integration and battery-safe networking.

## License

Same as original LCARS app - check original repository for licensing terms.

---

## Quick Start Checklist

- [ ] Install app from App Loader
- [ ] Create Home Assistant long-lived token  
- [ ] Configure HA URL and token in watch settings
- [ ] Add your light entity IDs (max 6)
- [ ] Test connection on light control screen
- [ ] Verify lights toggle when tapped
- [ ] Check battery usage after first day
- [ ] Adjust poll interval if needed (120+ seconds recommended)

**Remember**: This app prioritizes battery life over features. All smart home functionality gracefully degrades to preserve your watch battery!
