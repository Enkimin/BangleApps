(function(back) {
  const SETTINGS_FILE = "lcars_lights.setting.json";

  const storage = require('Storage');
  let settings = {
    fullscreen: false,
    themeColor1BG: "#FF9900",
    themeColor2BG: "#FF00DC", 
    themeColor3BG: "#0094FF",
    randomColors: false,
    haUrl: "",
    haToken: "",
    haEntities: ["light.living_room", "light.kitchen", "light.bedroom", "light.office"],
    haPollInterval: 120,
    enableMusic: true
  };
  
  let saved_settings = storage.readJSON(SETTINGS_FILE, 1) || settings;
  for (const key in saved_settings) {
    settings[key] = saved_settings[key];
  }

  function save() {
    storage.write(SETTINGS_FILE, settings);
  }

  var color_options = [
    'Green', 'Orange', 'Cyan', 'Purple', 'Red', 'Blue', 'Yellow', 'White',
    'Purple', 'Pink', 'Light Green', 'Brown', 'Turquoise', 'Magenta', 'Lime',
    'Gold', 'Sky Blue', 'Rose', 'Lavender', 'Amber', 'Indigo', 'Teal',
    'Crimson', 'Maroon', 'Firebrick', 'Dark Red', 'Aqua', 'Emerald', 'Royal Blue',
    'Sunset Orange', 'Turquoise Blue', 'Hot Pink', 'Goldenrod', 'Deep Sky Blue'
  ];

  var bg_code = [
    '#00ff00', '#FF9900', '#0094FF', '#FF00DC', '#ff0000', '#0000ff', '#ffef00', '#FFFFFF',
    '#FF00FF', '#6C00FF', '#99FF00', '#8B4513', '#40E0D0', '#FF00FF', '#00FF00', '#FFD700',
    '#87CEEB', '#FF007F', '#E6E6FA', '#FFBF00', '#4B0082', '#008080', '#DC143C', '#800000',
    '#B22222', '#8B0000', '#00FFFF', '#008000', '#4169E1', '#FF4500', '#40E0D0', '#FF69B4',
    '#DAA520', '#00BFFF'
  ];

  // Helper function to set up entity input
  function setupEntityInput() {
    return {
      title: "Light Entities",
      type: "text",
      value: settings.haEntities.join(", "),
      onchange: (value) => {
        if (value && value.trim()) {
          // Split by comma and clean up whitespace
          settings.haEntities = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
          // Limit to 6 entities for screen space
          if (settings.haEntities.length > 6) {
            settings.haEntities = settings.haEntities.slice(0, 6);
          }
        } else {
          settings.haEntities = [];
        }
        save();
      }
    };
  }

  E.showMenu({
    '': { 'title': 'LCARS Lights' },
    '< Back': back,
    
    // Home Assistant Configuration
    'HA Server URL': {
      title: "HA URL (e.g. http://192.168.1.100:8123)",
      type: "text", 
      value: settings.haUrl,
      onchange: (value) => {
        settings.haUrl = value || "";
        save();
      }
    },
    
    'HA Auth Token': {
      title: "Long-lived Access Token",
      type: "text",
      value: settings.haToken,
      onchange: (value) => {
        settings.haToken = value || "";
        save();
      }
    },
    
    'Light Entity IDs': {
      title: "Comma-separated light entity IDs (max 6)",
      type: "text",
      value: settings.haEntities.join(", "),
      onchange: (value) => {
        if (value && value.trim()) {
          settings.haEntities = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
          if (settings.haEntities.length > 6) {
            settings.haEntities = settings.haEntities.slice(0, 6);
          }
        } else {
          settings.haEntities = [];
        }
        save();
      }
    },
    
    'HA Poll Interval': {
      title: "Seconds between updates (30-300, default: 120)",
      value: settings.haPollInterval,
      min: 30,
      max: 300,
      step: 30,
      onchange: (value) => {
        settings.haPollInterval = value;
        save();
      }
    },

    // UI Configuration
    'Full Screen': {
      value: settings.fullscreen,
      onchange: () => {
        settings.fullscreen = !settings.fullscreen;
        save();
      },
    },
    
    'Enable Music Screen': {
      value: settings.enableMusic,
      onchange: () => {
        settings.enableMusic = !settings.enableMusic;
        save();
      },
    },
    
    // Color Theme Configuration
    'Theme Color 1': {
      value: 0 | bg_code.indexOf(settings.themeColor1BG),
      min: 0, 
      max: 34,
      format: v => color_options[v],
      onchange: v => {
        settings.themeColor1BG = bg_code[v];
        save();
      },
    },
    
    'Theme Color 2': {
      value: 0 | bg_code.indexOf(settings.themeColor2BG),
      min: 0, 
      max: 34,
      format: v => color_options[v],
      onchange: v => {
        settings.themeColor2BG = bg_code[v];
        save();
      },
    },
    
    'Theme Color 3': {
      value: 0 | bg_code.indexOf(settings.themeColor3BG),
      min: 0, 
      max: 34,
      format: v => color_options[v],
      onchange: v => {
        settings.themeColor3BG = bg_code[v];
        save();
      },
    },
    
    'Random Colors': {
      title: "Use random colors on app start",
      value: settings.randomColors,
      onchange: () => {
        settings.randomColors = !settings.randomColors;
        save();
      },
    },

    // Quick Setup Examples
    '-- Quick Setup --': {},
    
    'Example: Living Room': () => {
      settings.haEntities = [
        "light.living_room_main",
        "light.living_room_lamp",
        "light.kitchen_overhead", 
        "light.dining_room"
      ];
      settings.haUrl = "http://192.168.1.100:8123";
      save();
      E.showMessage("Example entities set!\nDon't forget to set your\nHA URL and token.", "Setup");
      setTimeout(() => {
        // Refresh the menu to show updated values
        E.showMenu({
          '': { 'title': 'LCARS Lights' },
          '< Back': back,
        });
      }, 2000);
    },
    
    'Reset to Defaults': () => {
      E.showPrompt("Reset all settings?", {
        title: "Confirm Reset"
      }).then((result) => {
        if (result) {
          settings = {
            fullscreen: false,
            themeColor1BG: "#FF9900",
            themeColor2BG: "#FF00DC", 
            themeColor3BG: "#0094FF",
            randomColors: false,
            haUrl: "",
            haToken: "",
            haEntities: ["light.living_room", "light.kitchen", "light.bedroom", "light.office"],
            haPollInterval: 120,
            enableMusic: true
          };
          save();
          E.showMessage("Settings reset!", "Reset Complete");
          setTimeout(back, 1500);
        }
      });
    },
    
    // Help & Info
    '-- Help --': {},
    
    'Battery Tips': () => {
      E.showMessage(
        "BATTERY OPTIMIZATION:\n\n" +
        "• Polling only occurs when\n  light screen is active\n" +
        "• All polling stops when\n  screen turns off\n" +
        "• Longer poll intervals\n  save more battery\n" +
        "• Failed connections stop\n  polling automatically\n\n" +
        "Recommended: 120+ seconds", 
        "Battery Safety"
      );
    },
    
    'HA Setup Help': () => {
      E.showMessage(
        "HOME ASSISTANT SETUP:\n\n" +
        "1. Get your HA local IP\n" +
        "2. Create Long-lived token\n   (Profile > Security)\n" +
        "3. Find light entity IDs\n   (Developer Tools > States)\n" +
        "4. Test connection on\n   light control screen\n\n" +
        "Format: light.room_name",
        "Setup Guide"
      );
    }
  });
})