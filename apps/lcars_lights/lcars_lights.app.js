{
const TIMER_IDX = "lcars_lights";
const SETTINGS_FILE = "lcars_lights.setting.json";
const locale = require('locale');
const storage = require('Storage');
const widget_utils = require('widget_utils');

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

let color1;
let color2;
let color3;
let cWhite = "#FFFFFF";
let cBlack = "#000000";
let cGrey = "#424242";

// BATTERY SAFETY: Global state management
let lcarsViewPos = 0; // 0=clock, 1=lights, 2=music
let haInterval = null;
let progressUpdateInterval = null;
let drawTimeout = null;
let lightStates = {};
let lastMusicInfo = null;
let haConnectionFailed = false;
let haFailureCount = 0;

// BATTERY SAFETY: Cached display states to avoid unnecessary redraws
let lastTime = "";
let lastDate = "";
let lastBattery = -1;
let lastLightStates = {};

let convert24to16 = function(input) {
  let RGB888 = parseInt(input.replace(/^#/, ''), 16);
  let r = (RGB888 & 0xFF0000) >> 16;
  let g = (RGB888 & 0xFF00) >> 8;
  let b = RGB888 & 0xFF;

  r = (r * 249 + 1014) >> 11;
  g = (g * 253 + 505) >> 10;
  b = (b * 249 + 1014) >> 11;
  let RGB565 = 0;
  RGB565 = RGB565 | (r << 11);
  RGB565 = RGB565 | (g << 5);
  RGB565 = RGB565 | b;

  return "0x"+RGB565.toString(16);
};

let randomColors = function() {
  if (settings.randomColors) {
    do {
      color1 = getRandomColor();
      color2 = getRandomColor();
      color3 = getRandomColor();
    } while (!areColorsDistinct(color1, color2, color3));
  } else {
    color1 = settings.themeColor3BG;
    color2 = settings.themeColor1BG;
    color3 = settings.themeColor2BG;
  }

  color1C = convert24to16(color1);
  color2C = convert24to16(color2);
  color3C = convert24to16(color3);
};

let getRandomColor = function() {
  return bg_code[Math.floor(Math.random() * bg_code.length)];
};

let areColorsDistinct = function(color1, color2, color3) {
  return (
    color1 !== color2 &&
    color2 !== color3 &&
    color1 !== color3 &&
    hasSufficientContrast(color1, color2) &&
    hasSufficientContrast(color2, color3) &&
    hasSufficientContrast(color1, color3)
  );
};

let hasSufficientContrast = function(color1, color2) {
  const contrastThreshold = 0.10;
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);
  const contrastRatio = (Math.max(luminance1, luminance2) + 0.05) / (Math.min(luminance1, luminance2) + 0.05);
  return contrastRatio >= contrastThreshold;
};

let getLuminance = function(hexColor) {
  const rgb = hexToRgb(hexColor);
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
};

let hexToRgb = function(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
};

randomColors();

let colorPalette = new Uint16Array([
  0x0000, color2C, color3C, 0x0000, color1C, 0x0000, 0x0000, 0x0000,
  0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000
], 0, 1);

let bgLeftFullscreen = {
  width : 27, height : 176, bpp : 3,
  transparent : 0,
  buffer : require("heatshrink").decompress(atob("/4AB+VJkmSAQV///+BAtJn//5IIFkmf/4IGyVP/gIGpMnF41PHIImGF4ImHJoQmGJoIdK8hNHNY47C/JNGBIJZGyYJBQA5GCKH5Q/KAQAoUP7y/KH5QGDoQAy0hGF34JB6RGFr4JB9JkFl4JB+gdFy4JB/QdFpYJB/odFkqrCS4xGCWoyDCKH5Q1GShlJChQLCCg5TCHw5TMAD35FAoIIkgJB8hGGv/8Mg8/+QIFp4cB5IRGBIIvI/4IFybyCF4wTCDp5NBHZZiGz4JBLJKAGk4JBO4xQ/KGQA8UP7y/KH5QnAHih/eX5Q/GQ4JCGRJlKCgxTDBAwgCCg5TCHwxTCNA4")),
  palette: colorPalette
};

let bgLeftNotFullscreen = {
  width : 27, height : 152, bpp : 3,
  transparent : 0,
  buffer : require("heatshrink").decompress(atob("/4AB+VJkmSAQV///+BAtJn//5IIFkmf/4IGyVP/gIGpMnF41PHIImGF4ImHJoQmGJoIdK8hNHNY47C/JNGBIJZGyYJBQA5GCKH5Q/KAQAy0hGF34JB6RGFr4JB9JkFl4JB+gdFy4JB/QdFpYJB/odFkqrCS4xGCWoyhCKH5Q1GShlJChQLCCg5TCHw5TMAD35FAoIIkgJB8hGGv/8Mg8/+QIFp4cB5IRGBIIvI/4IFybyCF4wTCDp5NBHZZiGz4JBLJKAGk4JBO4xQ/KGQA8UP7y/KH5QnAHih/eX5Q/GQ4JCGRJlKCgxTDBAwgCCg5TCHwxTCNA4A==")),
  palette: colorPalette
};

let bgRightFullscreen = {
  width : 27, height : 176, bpp : 3,
  transparent : 0,
  buffer : require("heatshrink").decompress(atob("yVJkgCCyf/AAPJBAYCBk4JB8gUFyVP//yBAoCB//5BAwUCAAIUHAAIgGChopGv5TIn5TIz4yLKYxxC/iGI/xxGKH5Q/agwAnUP7y/KH4yGeVYAJ0hGF34JB6RGFr4JB9JkFl4JB+gdFy4JB/QdFpYJB/odFkp4CS4xGCWoyhCKH5QuDoxQCDpI7GDoJZGHYIRGLIQvGO4QvGMQRNJADv+GIqTC/5PGz4JBJ41JBIPJCg2TD4QLGn4JB/gUaHwRTGHwRTHBIRTGNAQyJ8gyI+QdFp4JB/IdFk5lLKH5QvAHih/eX5Q/KE4A8UP7y/KH5QGDpg7HJoxZCCIx3CJowmCF4yACJoyJC/4A==")),
  palette: colorPalette
};

let bgRightNotFullscreen = {
  width : 27, height : 152, bpp : 3,
  transparent : 0,
  buffer : require("heatshrink").decompress(atob("yVJkgCCyf/AAPJBAYCBk4JB8gUFyVP//yBAoCB//5BAwUCAAIUHAAIgGChopGv5TIn5TIz4yLKYxxC/iGI/xxGKH5Q/agwAx0hGF34JB6RGFr4JB9JkFl4JB+gdFy4JB/QdFpYJB/odFkqrCS4xGCWoyhCKH5QuDoxQCDpI7GDoJZGHYIRGLIQvGO4QvGMQRNJADv+GIqTC/5PGz4JBJ41JBIPJCg2TD4QLGn4JB/gUaHwRTGHwRTHBIRTGNAQyJ8gyI+QdFp4JB/IdFk5lLKH5QvAHih/eX5Q/KE4A8UP7y/KH5QGDpg7HJoxZCCIx3CJowmCF4yACJoyJC/4A=")),
  palette: colorPalette
};

let bgLeft = settings.fullscreen ? bgLeftFullscreen : bgLeftNotFullscreen;
let bgRight = settings.fullscreen ? bgRightFullscreen : bgRightNotFullscreen;

// Planet icons (keeping the cool visual elements)
let iconEarth = {
  width : 50, height : 50, bpp : 3,
  buffer : require("heatshrink").decompress(atob("AFtx48ECBsDwU5k/yhARLjgjBjlzAQMQEZcIkOP/fn31IEZgCBnlz58cEpM4geugEgwU/8+WNZJHDuHHvgmBCQ8goEOnVgJoMnyV58mACItHI4X8uAFBuVHnnz4BuGxk4////Egz3IkmWvPgNw8f/prB//BghTC+AjE7848eMjNnzySBwUJkmf/BuGuPDAQIjBiPHhhTCSQnjMo0ITANJn44Dg8MuFBggCCiFBcAJ0Bv5xEh+ITo2OhHkyf/OIQdBWwVHhgjBNwUE+fP/5EEgePMoYLBhMgyVJk/+BQQdC688I4XxOIc8v//NAvr+QEBj/5NwKVBy1/QYUciPBhk1EAJrC+KeC489QYaMBgU/8BNB9+ChEjz1Jkn/QYMBDQIgCcYTCCiP/nlzJQmenMAgV4//uy/9wRaB/1J8iVCcAfHjt9TYYICnhKCgRKBw159/v//r927OIeeoASBDQccvv3791KYVDBYPLJQeCnPnz//AAP6ocEjEkXgMgJQtz79fLAP8KYkccAcJ8Gf/f/xu/cAMQ4eP5MlyQRCMolx40YsOGBAPfnnzU4KVDpKMBvz8Dh0/8me7IICgkxJQXPIgZTD58sEgcJk+eNoONnFBhk4/5uB/pcDg5KD+4mEv4CBXISVDhEn31/8/+mH7x//JQK5CAAMB4JBCnnxJQf/+fJEgkAa4L+CAQOOjMn/1bXIRxDJQXx58f//Hhlz/88EgsChMgz/Zs/+nfkyV/8huDOI6SD498NwoACi1Z8+S/Plz17/+QCI7jC+ZxBmfPnojIAAMDcYWSp//2wRJEwq2GABECjMgNYwAmA="))
};

let iconSaturn = {
  width : 50, height : 50, bpp : 3,
  transparent : 1,
  buffer : require("heatshrink").decompress(atob("AH4A/AEkQuPHCJ0ChEAwARNjAjBjgjOhs06Q2OEYVx4ARMhEggUMkANIDoIgBoEEgEBNxJEC6ZrBAAMwNxAjDNYcHNxIjB7dtEwIHBwRoKj158+cuPEjlwCRAjC23bpu0wRNDAAsHEYWeEwaSJ6YjCAQUNSRQjEzxQBWZMNEYlsmg2JWAIjCz95SoJuJggjDtuw6dMG5JKCz998wFBJRVNEYW0yaVBJRNhJQN9+4pCzhKJmBKC4YpB/fINxIgCzFxSoQ3J4ENm3CAQPb98wbpEcAQMYWwKYBNxMDXgc2/fv3g2IEAOAgAjBjy5CEhEMfYICBgfPnjdLjj+CgMHiC3JknDhhoINw4jCAB0IJQIANR4QjPAH4A/AFA"))
};

let iconMoon = {
  width : 50, height : 50, bpp : 3,
  transparent : 1,
  buffer : require("heatshrink").decompress(atob("AH4AQjlx44CCCZsg8eOkHDwAQKEYgmPhEgEQM48AOIgMHEYoCB4ATI8UAmH/x04JoRuJsImHuBKLn37EwZuIgEQOI8cEpXj/yYBhE8+YNGgkYoJxITBUPnAaC///nC+FjBuIOJZEB8YeCh/8AoYACoMEEAnEjhQDPQJKJ/DCDAoi5DoLdHAoMQgLjFWYPOnngh02IwXzwDjEgPGEYS8BI4MBYoSVG4fP/nghkAgZrDkngJQqSG4gvBg4sBQgkImHihEAWwP8ZBMBEYl5/+cSoVAGQIUFh04weJn///0gj/OEw5KEz45BzhuCTYQAEgePB4IACAoJuBnAQEa4XHjxKB//xFgWHJQsCRgMDEonipwjENwUBDQNx8+evvn/hTDLw3igE+EgZxB8UOXIvEJQUfEYOfv53DEQkgga5BJQvzx84cAj+CDoNh8/eEYJKDuCSEcocnEon+/7xEgFBIIcfB4Mf/IICXI2DgDdBAAn758gCIq5Dv4zBvJuIOIfjEgvP/ARHgwdCB4P3AoTdFAAk4EYk8SQgAFTALaDSQwAGh08//vnDmBABYmEEZYAzA=="))
};

let iconMars = {
  width : 50, height : 50, bpp : 3,
  transparent : 1,
  buffer : require("heatshrink").decompress(atob("AH4ATjlwCJ+Dh0wwAQMg0cuPHjFhCZkDps0yVJkmQCBMEjFx42atOmzQmLhMkEYQCCCREQoOGEYmmzB0IEY4CBkARGoJKBEYQCEzgSGkGSpAjDyYCCphuGiFhJQgCD8ASFgRHGAQKbB6BuHJRGeOIsINxEk6dNmARDgMEjQjHAQPnVQojIyZKB6YSDNwK5FAQt54BuDXJIjBEwK5EgxKKXgq5BJRdgXIojJAQJKMcAM0EwM2JUApDoCVFExa7FkGCgAmIkAREEwUEjAmHCIgABhEggQmFpACBCIojBEwRQCzVhwkQU4YADgQmBwQCCI4IFBCAojFAQojGJQQjDAQgRGEZICBEo4gFyUIkilFJQUYEAZrBAQMYNw5KDSQSbCNwwABgOGEwgCBsPACQ5xGwdNnARJcAVh48evvnCJK8Chs+/fv33gCRcB48cuPHCBYA/ADAA=="))
};

let iconCharging = {
  width : 50, height : 50, bpp : 3,
  transparent : 5,
  buffer : require("heatshrink").decompress(atob("23btugAwUBtoICARG0h048eODQYCJ6P/AAUCCJfbo4SDxYRLtEcuPHjlwgoRJ7RnIloUHoYjDAQfAExEAwUIkACEkSAIEYwCBhZKH6EIJI0CJRFHEY0BJRWBSgf//0AJRYSE4BKLj4SE8BKLv4RD/hK/JS2AXY0gXwRKG4cMmACCJQMAg8csEFJQsBAwfasEAm379u0gFbcBfHzgFBz1xMQZKBjY/D0E2+BOChu26yVEEYdww+cgAFCg+cgIfB6RKF4HbgEIkGChEAthfCJQ0eEAIjBBAMxk6GCJQtgtyVBwRKBAQMbHAJKGXIIFCgACBhl54qVG2E+EAJKBJoWAm0WJQ6SCXgdxFgMLJQvYjeAEAUwFIUitEtJQ14NwUHgEwKYZKGwOwNYX7XgWCg3CJQ5rB4MevPnAoPDJRJrCgEG/ECAoNsJRUwoEesIIBiJKI3CVDti/CJRKVDiJHBSo0YsOGjED8AjBcAcIgdhcAXAPIUAcAYIBcA4dBAQUG8BrBgBuCgOwcBEeXIK2BBAIFBgRqBGoYAChq8CcYUE4FbUYOACQsHzgjDgwFBCIImBAQsDtwYD7cAloRI22B86YBw5QBgoRJ7dAgYEDCJaeBJoMcsARMAQNoJIIRE6A"))
};

let iconWarning = {
  width : 50, height : 50, bpp : 3,
  transparent : 1,
  buffer : require("heatshrink").decompress(atob("kmSpIC/AWMyoQIFsmECJFJhMmA4QXByVICIwODAQ4RRFIQGD5JVLkIGDzJqMyAGDph8MiRKGyApEAoZKFyYIDQwMkSQNkQZABBhIIOOJRuEL5gRIAUKACVQMhmUSNYNDQYJTBBwYFByGTkOE5FJWYNMknCAQKYCiaSCpmGochDoSYBhMwTAZrChILBhmEzKPBF4ImBTAREBDoMmEwJVDoYjBycJFgWEJQRuLJQ1kmQCCjJlCBYbjCagaDBwyDBmBuBF4TjJAUQKINBChCDQxZBcZIIQF4NIgEAgKSDiQmEVQKMBoARBAAMCSQLLBVoxqKL4gaCChVCNwoRKOIo4CJIgABBoSMHpIRFgDdJOIJUBCAUJRgJuEAQb+DIIgRIAX4C/ASOQA"))
};

// Fonts
Graphics.prototype.setFontAntonioMedium = function(scale) {
  g.setFontCustom(atob("AAAAAAAAAAAAAAAAAAAA//mP/5gAAAAAAAAAAAAA/gAMAAAAAA/gAPAAAEIIBP+H/8D+IYBP+H/8D+IABCAAwIAfnwP8+PHh448eP3+B4fAAAAAAAH/AD/4AwGAMBgD/4Af8GAAPgAPgAfgAfAAfAA+AAOP/AH/4BgGAYBgH/4A/8AAAAAAAAAQAA/B+f4/+GMPhjv/4/h8Dg/gAcYwAAPwADgAAAAAAAAB//8///sAAaAACAAAMAAb//+f//AAAAAAAbAAGwAA4AA/wADgABsAAbAAAAAAAgAAMAAPwAD8AAMAADAAAAAAAAAAHAAB/AAOAAAAAAAAMAADAAAwAAMAACAAAAAAAAAABgAAYAAAAAAAAA4AD+AP+A/4A/gAOAAAAAAAAAH//j//8wADMAAz//8f/+AAAAAAAMAADAABgAA//+P//gAAAAAAAAAAAAAfgfP4fzAfswfDP/gx/gMAAAHgPj4D8wMDMHAz//8f3+AAEAAAAADwAH8APzA/AwP//j//4AAwAAAD/Hw/x+MwBjOAYz/+Mf/AAAAAAAH//j//8wYDMGAz9/8fP+AAcDAAAwAAMAfjB/4z/wP+AD4AAwAAAAOB/f4///MHAzBwM///H9/gAAAAAAH/Pj/78wGDMBgz//8f/+AAAAAAADhwA4cAAAAAAAAAAAAAADh/A4fgAAAAOAAHwABsAA7gAccAGDAAAAANgADYAA2AANgADYAA2AAAAAAAABgwAccADuAAbAAHwAA4AAAAHwAD8c4/POMHAD/wAfwAAAAAAAAD/wD//B4B4Y/HMf8zMBMyATMwczP+M4BzHwcgf+AA+AAAAAAD4A/+P/8D+DA/4wH/+AB/4AAeAAAAAAA//+P//jBgYwYGP//j//4PH4AAAAAAAf/+P//zgAcwADP4fz+P4Ph8AAAAAAA//+P//jAAYwAGPADj//4P/4AAAAAAA//+P//jBgYwYGMGBgAAAAAAP//j//4wYAMGADBgAAAAAAAA//w///PAHzAQM4MHP7/x+/8AAAAAAD//4//+AGAABgAAYAP//j//4AAAAAAAAAA//+P//gAAAAAAAAAAAHwAB+AABgAAY//+P//AAAAAAAAAAD//4//+APgAf+Afj8PgPjAAYAAAAAAD//4//+AABgAAYAAGAAAAAAA//+P//j/gAD/wAB/gAP4B/4P/AD//4//+AAAAAAAAAAP//j//4P4AAfwAA/g//+P//gAAAAAAAAAA//g//+PAHjAAY4AOP//h//wAAAAAAD//4//+MDADAwA4cAP/AB/gAAAAAAAA//g//+PAHjAAc4APv//5//yAAAAAAD//4//+MGADBgA48AP//h+f4AAAAAAB+Pw/z+MOBjBwY/P+Hx/AAHgwAAMAAD//4//+MAADAAAAAAP//D//4AAOAABgAA4//+P//AAAAwAAP8AD//AA/+AAfgP/4//gPwAAAAA+AAP/4Af/4AD+A//j/wA/wAD/+AA/4B/+P/+D+AAAAAMADj8P4P/4A/4B//w+A+MABgAAA4AAPwAB/gAB/+A//j/gA+AAMAAAAAYwB+MH/jf+Y/8GPwBjAAAAAAP//7//+wABsAAYAAAAAAPAAD/gAH/gAD/gAD4AACAAADAAGwABv//7//+AAAA=="), 32, atob("BQUHCAgVCQQFBQkHBQcFBwgICAgICAgICAgFBQcHBwgPCQkJCQcHCQoFCQkHDQoJCQkJCAYJCQ0ICAcGBwY="), 20+(scale<<8)+(1<<16));
};

Graphics.prototype.setFontAntonioLarge = function(scale) {
  g.setFontCustom(atob("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB8AAAAAAPgAAAAAB8AAAAAAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgAAAAAD8AAAAAH/gAAAAP/8AAAAf//gAAA///AAAB//+AAAD//8AAAH//4AAAP//wAAAB//gAAAAP/AAAAAB+AAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH///AAAf////8AP/////4B//////Af/////8D8AAAAfgeAAAAA8DwAAAAHgeAAAAA8D//////gf/////8B//////AP/////wAf////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAHgAAAAAA8AAAAAAPgAAAAAB4AAAAAAf/////gP/////8B//////gP/////8B//////gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAAD/+AAP8A//wAP/gP/+AH/8D//wD//gfgAA//8DwAAf+HgeAAP/A8DwAH/gHgfgP/wA8D///4AHgP//+AA8A///AAHgB//AAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4AA/gAD/AAH/gA/4AA/+AP/AAH/4D/4AA//gfgA4AB8DwAPAAHgeAB4AA8DwAPgAHgfAD+AB8D//////gP/////4B//5//+AD/+H//gAH/AH/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP4AAAAAP/AAAAAP/4AAAAP//AAAAP/x4AAAf/wPAAAf/gB4AAf/AAPAAP/AAB4AB//////gP/////8B//////gP/////8AAAAAPAAAAAAB4AAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//wD/AB///Af+AP//4D/4B///Af/gP//4B/8B4D4AAPgPAeAAA8B4DwAAHgPAfAAB8B4D////gPAf///4B4B////APAD///gAAAD//gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB///AAAP////4AH/////wB//////Af/////8D8APAA/geADwAB8DwAeAAHgeADwAA8D4AeAAPgf/j+AH8B/8f///gP/h///4Af8H//+AAPgP//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAPAAAAAAB4AAAABgPAAAA/8B4AAB//gPAAD//8B4AH///gPAH///8B4P//+AAPH//wAAB///gAAAP//AAAAB/+AAAAAP+AAAAAB+AAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/4A/+AAf/w//+AP//v//4B//////Af/////8D4AfwAPgeAB8AA8DwAHAAHgeAB8AA8D4Af4APgf/////8B//////AP//v//4A//4//8AA/4A/+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH/+AAAAD//+D/gB///4f+AP///j/4D///8f/gfAAHgB8DwAA8AHgeAAHgA8DwAA8AHgfgAHgB8D//////gP/////4A/////+AD/////gAD////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwAfgAAB+AD8AAAPwAfgAAB+AD8AAAPwAfgAAAAAAAAAAAAAAAAAAAAAAAA==")), 46, atob("DBATExMTExMTExMTCw=="), 45+(scale<<8)+(1<<16));
};

// BATTERY SAFETY: Home Assistant functions with timeout and retry logic
let fetchWithTimeout = function(url, options, timeout = 5000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
};

// BATTERY SAFETY: Smart HA polling that stops/starts based on screen state
let fetchLightStates = function() {
  if (lcarsViewPos !== 1 || !Bangle.isLCDOn() || haConnectionFailed || !settings.haUrl) {
    return; // Don't poll if not on light screen, screen off, or HA failed
  }

  let headers = {
    "Content-Type": "application/json"
  };
  
  if (settings.haToken) {
    headers["Authorization"] = "Bearer " + settings.haToken;
  }

  fetchWithTimeout(settings.haUrl + "/api/states", {
    method: "GET",
    headers: headers
  }, 5000)
  .then(response => response.json())
  .then(data => {
    haFailureCount = 0; // Reset on success
    haConnectionFailed = false;
    
    // Update light states
    let newStates = {};
    if (Array.isArray(data)) {
      data.forEach(entity => {
        if (settings.haEntities.includes(entity.entity_id)) {
          newStates[entity.entity_id] = {
            state: entity.state,
            brightness: entity.attributes.brightness || 0
          };
        }
      });
    }
    
    lightStates = newStates;
    if (lcarsViewPos === 1) {
      drawLightScreen(); // Only update display if still on light screen
    }
  })
  .catch(err => {
    haFailureCount++;
    if (haFailureCount >= 3) {
      haConnectionFailed = true; // Stop polling after 3 failures
      stopHAPolling();
    }
    
    if (lcarsViewPos === 1) {
      drawLightScreen(); // Show offline status
    }
  });
};

let toggleLight = function(entityId) {
  if (!settings.haUrl || !entityId || haConnectionFailed) return;
  
  let headers = {
    "Content-Type": "application/json"
  };
  
  if (settings.haToken) {
    headers["Authorization"] = "Bearer " + settings.haToken;
  }

  fetchWithTimeout(settings.haUrl + "/api/services/light/toggle", {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      entity_id: entityId
    })
  }, 5000)
  .then(() => {
    // Immediately fetch updated state
    setTimeout(fetchLightStates, 500);
  })
  .catch(err => {
    // Handle toggle error silently
  });
};

// BATTERY SAFETY: Interval management functions
let startHAPolling = function() {
  if (haInterval || haConnectionFailed) return;
  
  haInterval = setInterval(fetchLightStates, settings.haPollInterval * 1000);
  fetchLightStates(); // Initial fetch
};

let stopHAPolling = function() {
  if (haInterval) {
    clearInterval(haInterval);
    haInterval = null;
  }
};

let startMusicProgressUpdates = function() {
  if (progressUpdateInterval) return;
  
  // Update progress every 10 seconds to save battery
  progressUpdateInterval = setInterval(() => {
    if (lcarsViewPos === 2) {
      updateMusicProgress();
    }
  }, 10000);
};

let stopMusicProgressUpdates = function() {
  if (progressUpdateInterval) {
    clearInterval(progressUpdateInterval);
    progressUpdateInterval = null;
  }
};

// BATTERY SAFETY: Display update functions with caching
let drawHorizontalBgLine = function(color, x1, x2, y, h) {
  g.setColor(color);
  for(let i = 0; i < h; i++) {
    g.drawLine(x1, y + i, x2, y + i);
  }
};

let drawInfo = function() {
  if (lcarsViewPos !== 0 || !settings.fullscreen) {
    return;
  }

  g.setFontAlign(-1, -1, 0);
  g.setFontAntonioMedium();
  g.setColor(color2);
  g.clearRect(120, 10, g.getWidth(), 75);
  g.drawString("LCARS", 128, 13);

  if (NRF.getSecurityStatus().connected) {
    g.drawString("CONN", 128, 33);
  } else {
    g.drawString("NOCON", 128, 33);
  }
  
  if (Bangle.isLocked()) {
    g.setColor(color3);
    g.drawString("LOCK", 128, 53);
  }
};

let drawState = function() {
  if (lcarsViewPos !== 0) {
    return;
  }

  g.clearRect(20, 93, 75, 170);
  g.setFontAlign(0, 0, 0);
  g.setFontAntonioMedium();

  let bat = E.getBattery();
  let flash = storage.getFree() / process.env.STORAGE;
  let current = new Date();
  let hours = current.getHours();
  let iconMsg =
      Bangle.isCharging() ? { icon: iconCharging, text: "STATUS" } :
      bat < 30 ? { icon: iconWarning, text: "BAT" } :
      flash < 0.1 ? { icon: iconWarning, text: "DISK" } :
      hours % 4 === 0 ? { icon: iconSaturn, text: "STATUS" } :
      hours % 4 === 1 ? { icon: iconMars, text: "STATUS" } :
      hours % 4 === 2 ? { icon: iconMoon, text: "STATUS" } :
      { icon: iconEarth, text: "STATUS" };
  
  g.drawImage(iconMsg.icon, 23, 118);
  g.setColor(cWhite);
  g.drawString(iconMsg.text, 23 + 26, 108);
  g.setFontAlign(-1, -1, 0);
};

// SCREEN 1: Main Clock Face
let drawClockScreen = function() {
  let offset = settings.fullscreen ? 0 : 24;
  g.drawImage(bgLeft, 0, offset);
  drawHorizontalBgLine(color1, 25, 120, offset, 4);
  drawHorizontalBgLine(color1, 130, 176, offset, 4);
  drawHorizontalBgLine(color3, 20, 70, 80, 4);
  drawHorizontalBgLine(color3, 80, 176, 80, 4);
  drawHorizontalBgLine(color2, 35, 110, 87, 4);
  drawHorizontalBgLine(color2, 120, 176, 87, 4);

  // BATTERY SAFETY: Only redraw battery if changed
  let bat = E.getBattery();
  if (bat !== lastBattery) {
    let batPercent = bat / 100.0;
    let batStart = 19;
    let batWidth = 172 - batStart;
    let batX2 = parseInt(batWidth * batPercent + batStart);
    drawHorizontalBgLine(color2, batStart, batX2, 171, 5);
    drawHorizontalBgLine(cGrey, batX2, 172, 171, 5);
    for(let i = 0; i + batStart <= 172; i += parseInt(batWidth/4)) {
      drawHorizontalBgLine(cBlack, batStart + i, batStart + i + 3, 168, 8);
    }
    lastBattery = bat;
  }

  drawInfo();

  // BATTERY SAFETY: Only redraw time if changed
  g.setFontAlign(-1, -1, 0);
  g.setColor(cWhite);
  let currentDate = new Date();
  let timeStr = locale.time(currentDate, 1);
  
  if (timeStr !== lastTime) {
    g.setFontAntonioLarge();
    if (settings.fullscreen) {
      g.clearRect(27, 10, 170, 50); // Clear only time area
      g.drawString(timeStr, 27, 10);
    } else {
      g.clearRect(27, 33, 170, 73); // Clear only time area
      g.drawString(timeStr, 27, 33);
    }
    lastTime = timeStr;
  }

  // BATTERY SAFETY: Only redraw date if changed
  let dayStr = locale.dow(currentDate, true).toUpperCase();
  let dateStr = settings.fullscreen ? 
    dayStr + " " + currentDate.getDate() + " " + locale.month(currentDate, 1).toUpperCase() :
    dayStr;
  
  if (dateStr !== lastDate) {
    g.setColor(cWhite);
    g.setFontAntonioMedium();
    if (settings.fullscreen) {
      g.clearRect(30, 56, 170, 76); // Clear only date area
      g.drawString(dateStr, 30, 56);
    } else {
      g.clearRect(128, 35, 170, 75); // Clear only date area
      g.drawString(dayStr, 128, 35);
      g.drawString(currentDate.getDate(), 128, 55);
    }
    lastDate = dateStr;
  }

  // Weather and light count display
  g.setFontAlign(-1, -1, 0);
  g.setColor(cWhite);
  
  // Top row: Weather
  let weather = getWeather();
  printRow("TEMP", weather.temp, 97, color2);
  
  // Middle row: Light status
  let lightsOn = Object.values(lightStates).filter(light => light.state === 'on').length;
  let totalLights = settings.haEntities.length;
  printRow("LIGHTS", lightsOn + "/" + totalLights, 122, color3);
  
  // Bottom row: Battery
  printRow("BAT", bat + "%", 147, color1);

  drawState();
};

// Helper function for LCARS-styled data rows
let printRow = function(text, value, y, c) {
  g.setFontAntonioMedium();
  g.setFontAlign(-1, -1, 0);

  // Print background
  g.setColor(c);
  g.fillRect(80, y - 2, 165, y + 18);
  g.fillCircle(163, y + 8, 10);
  g.setColor(cBlack);
  g.drawString(text, 135, y);

  // Plot value
  let width = g.stringWidth(value);
  g.setColor(cBlack);
  g.fillRect(130 - width - 8, y - 2, 130, y + 18);
  g.setColor(c);
  g.setFontAlign(1, -1, 0);
  g.drawString(value, 126, y);
};

// SCREEN 2: Light Control
let drawLightScreen = function() {
  let offset = settings.fullscreen ? 0 : 24;
  g.drawImage(bgRight, 149, offset);
  
  if (settings.fullscreen) {
    drawHorizontalBgLine(color1, 0, 140, offset, 4);
  }
  drawHorizontalBgLine(color3, 0, 80, 80, 4);
  drawHorizontalBgLine(color3, 90, 150, 80, 4);
  drawHorizontalBgLine(color2, 0, 50, 87, 4);
  drawHorizontalBgLine(color2, 60, 140, 87, 4);
  drawHorizontalBgLine(color2, 0, 150, 171, 5);

  g.setFontAntonioMedium();
  g.setColor(cWhite);
  g.setFontAlign(-1, -1, 0);
  
  // Title
  g.drawString("ILLUMINATION", 10, 20);
  g.drawString("SYSTEMS", 10, 38);

  // Connection status
  g.setFontAlign(1, -1, 0);
  if (haConnectionFailed || !settings.haUrl) {
    g.setColor("#FF0000");
    g.drawString("OFFLINE", 145, 20);
  } else {
    g.setColor("#00FF00");
    g.drawString("ONLINE", 145, 20);
  }

  // Draw up to 6 lights
  let startY = 60;
  let lightHeight = 18;
  let maxLights = Math.min(6, settings.haEntities.length);
  
  for (let i = 0; i < maxLights; i++) {
    let entityId = settings.haEntities[i];
    let y = startY + (i * lightHeight);
    let state = lightStates[entityId];
    
    // Extract room name from entity_id
    let roomName = entityId.replace('light.', '').replace('_', ' ').toUpperCase();
    if (roomName.length > 8) roomName = roomName.substring(0, 8);
    
    // BATTERY SAFETY: Only redraw if state changed
    let stateKey = entityId + "_" + (state ? state.state : 'unknown');
    if (lastLightStates[entityId] !== stateKey) {
      g.clearRect(5, y - 2, 145, y + 16); // Clear this light's area
      
      if (state) {
        let isOn = state.state === 'on';
        let brightness = Math.round((state.brightness || 0) / 255 * 100);
        
        // Light name and status
        g.setFontAlign(-1, -1, 0);
        g.setColor(cWhite);
        g.drawString(roomName, 10, y);
        
        // Status indicator
        g.setColor(isOn ? "#00FF00" : "#808080");
        g.fillRect(75, y + 2, 85, y + 12);
        g.setColor(cBlack);
        g.setFontAlign(0, -1, 0);
        g.drawString(isOn ? "ON" : "OFF", 80, y + 2);
        
        // Brightness bar
        g.setColor(isOn ? color1 : cGrey);
        let barWidth = 45;
        let brightnessWidth = Math.round(barWidth * brightness / 100);
        g.fillRect(95, y + 4, 95 + brightnessWidth, y + 10);
        g.setColor(cGrey);
        g.fillRect(95 + brightnessWidth, y + 4, 95 + barWidth, y + 10);
        
        // Percentage
        g.setColor(cWhite);
        g.setFontAlign(1, -1, 0);
        g.drawString(brightness + "%", 145, y);
      } else {
        // Unknown state
        g.setFontAlign(-1, -1, 0);
        g.setColor(cGrey);
        g.drawString(roomName, 10, y);
        g.drawString("?", 80, y);
      }
      
      lastLightStates[entityId] = stateKey;
    }
  }
  
  // Instructions
  g.setFontAlign(0, -1, 0);
  g.setColor(cGrey);
  g.drawString("TAP ROOM TO TOGGLE", 88, 155);
};

// SCREEN 3: Music Control
let drawMusicScreen = function() {
  let offset = settings.fullscreen ? 0 : 24;
  g.drawImage(bgLeft, 0, offset);
  drawHorizontalBgLine(color1, 25, 120, offset, 4);
  drawHorizontalBgLine(color1, 130, 176, offset, 4);
  drawHorizontalBgLine(color3, 20, 70, 80, 4);
  drawHorizontalBgLine(color3, 80, 176, 80, 4);
  drawHorizontalBgLine(color2, 35, 110, 87, 4);
  drawHorizontalBgLine(color2, 120, 176, 87, 4);

  g.setFontAntonioMedium();
  g.setColor(cWhite);
  g.setFontAlign(-1, -1, 0);
  
  // Title
  g.drawString("AUDIO CONTROL", 30, 20);

  // Music info (if available)
  if (lastMusicInfo) {
    // Artist
    g.setColor(color2);
    g.drawString("ARTIST:", 30, 45);
    g.setColor(cWhite);
    let artist = lastMusicInfo.artist || "Unknown";
    if (artist.length > 15) artist = artist.substring(0, 15) + "...";
    g.drawString(artist, 30, 62);
    
    // Track
    g.setColor(color3);
    g.drawString("TRACK:", 30, 85);
    g.setColor(cWhite);
    let track = lastMusicInfo.track || "Unknown";
    if (track.length > 15) track = track.substring(0, 15) + "...";
    g.drawString(track, 30, 102);
    
    // Progress bar (if duration available)
    if (lastMusicInfo.dur && lastMusicInfo.c) {
      let progress = lastMusicInfo.c / lastMusicInfo.dur;
      g.setColor(color1);
      g.fillRect(30, 125, 30 + Math.round(progress * 100), 135);
      g.setColor(cGrey);
      g.fillRect(30 + Math.round(progress * 100), 125, 130, 135);
      
      // Time display
      g.setColor(cWhite);
      let currentTime = Math.floor(lastMusicInfo.c / 60) + ":" + 
                       ("0" + Math.floor(lastMusicInfo.c % 60)).substr(-2);
      let totalTime = Math.floor(lastMusicInfo.dur / 60) + ":" + 
                     ("0" + Math.floor(lastMusicInfo.dur % 60)).substr(-2);
      g.setFontAlign(0, -1, 0);
      g.drawString(currentTime + "/" + totalTime, 80, 140);
    }
  } else {
    g.setColor(cGrey);
    g.drawString("NO MUSIC PLAYING", 30, 70);
  }
  
  // Control instructions
  g.setColor(cGrey);
  g.setFontAlign(0, -1, 0);
  g.drawString("TAP TOP: PLAY/PAUSE", 88, 155);
  g.drawString("SWIPE: NEXT/PREV", 88, 170);
};

let updateMusicProgress = function() {
  if (lcarsViewPos !== 2 || !lastMusicInfo) return;
  
  // Update current position (rough estimate)
  if (lastMusicInfo.c && lastMusicInfo.dur) {
    lastMusicInfo.c += 10; // Add 10 seconds (update interval)
    if (lastMusicInfo.c > lastMusicInfo.dur) {
      lastMusicInfo.c = lastMusicInfo.dur;
    }
    
    // Redraw only progress area
    drawMusicScreen();
  }
};

// Weather function (keeping from original)
let getWeather = function() {
  let weatherJson;
  try {
    weatherJson = storage.readJSON('weather.json');
    let weather = weatherJson.weather;
    weather.temp = locale.temp(weather.temp - 273.15).replace('°', '\'');
    weather.hum = weather.hum + "%";
    const wind = locale.speed(weather.wind).match(/^(\D*\d*)(.*)$/);
    weather.wind = Math.round(wind[1]);
    return weather;
  } catch(ex) {
    return {
      temp: " ? ",
      hum: " ? ",
      txt: " ? ",
      wind: " ? "
    };
  }
};

// BATTERY SAFETY: Draw timer with efficient updates
let queueDraw = function() {
  let timeout = 60000; // Update every minute
  
  if (drawTimeout) clearTimeout(drawTimeout);
  drawTimeout = setTimeout(function() {
    drawTimeout = undefined;
    draw();
  }, timeout - (Date.now() % timeout));
};

// Main draw function
let draw = function() {
  queueDraw(); // Queue next update
  
  g.reset();
  g.clearRect(0, 0, g.getWidth(), g.getHeight());

  if (lcarsViewPos === 0) {
    drawClockScreen();
  } else if (lcarsViewPos === 1) {
    drawLightScreen();
  } else if (lcarsViewPos === 2 && settings.enableMusic) {
    drawMusicScreen();
  }

  // Draw widgets
  if (settings.fullscreen) {
    widget_utils.hide();
  } else {
    Bangle.drawWidgets();
  }
};

// BATTERY SAFETY: Screen power management
let onLcdPower = function(on) {
  if (on) {
    // Screen turned on - resume appropriate polling
    if (lcarsViewPos === 1) {
      startHAPolling();
    } else if (lcarsViewPos === 2) {
      startMusicProgressUpdates();
    }
    
    // Partial redraw for efficiency
    drawInfo();
    drawState();
  } else {
    // Screen turned off - stop ALL polling
    stopHAPolling();
    stopMusicProgressUpdates();
    
    if (drawTimeout) {
      clearTimeout(drawTimeout);
      drawTimeout = undefined;
    }
  }
};

// Touch handling with buzzer feedback
let feedback = function() {
  Bangle.buzz(40, 0.3);
};

let onTouch = function(btn, e) {
  let left = parseInt(g.getWidth() * 0.2);
  let right = g.getWidth() - left;
  let upper = parseInt(g.getHeight() * 0.2);
  let lower = g.getHeight() - upper;

  let is_left = e.x < left;
  let is_right = e.x > right;
  let is_upper = e.y < upper;
  let is_lower = e.y > lower;

  // Screen navigation
  if (is_left && lcarsViewPos > 0) {
    feedback();
    stopHAPolling();
    stopMusicProgressUpdates();
    lcarsViewPos--;
    
    // Start appropriate polling for new screen
    if (lcarsViewPos === 1) {
      startHAPolling();
    } else if (lcarsViewPos === 2) {
      startMusicProgressUpdates();
    }
    
    draw();
    return;
  } else if (is_right && lcarsViewPos < (settings.enableMusic ? 2 : 1)) {
    feedback();
    stopHAPolling();
    stopMusicProgressUpdates();
    lcarsViewPos++;
    
    // Start appropriate polling for new screen
    if (lcarsViewPos === 1) {
      startHAPolling();
    } else if (lcarsViewPos === 2) {
      startMusicProgressUpdates();
    }
    
    draw();
    return;
  }

  // Screen-specific actions
  if (lcarsViewPos === 1) {
    // Light control screen - tap on lights to toggle
    let startY = 60;
    let lightHeight = 18;
    let maxLights = Math.min(6, settings.haEntities.length);
    
    for (let i = 0; i < maxLights; i++) {
      let y = startY + (i * lightHeight);
      if (e.y >= y - 2 && e.y <= y + 16) {
        feedback();
        toggleLight(settings.haEntities[i]);
        return;
      }
    }
    
    // Reset connection if tapping on status
    if (e.x > 100 && e.y < 40 && haConnectionFailed) {
      feedback();
      haConnectionFailed = false;
      haFailureCount = 0;
      startHAPolling();
      return;
    }
    
  } else if (lcarsViewPos === 2) {
    // Music control screen
    if (is_upper) {
      feedback();
      Bangle.musicControl("play"); // Toggle play/pause
      return;
    } else if (is_lower) {
      feedback();
      if (e.x < g.getWidth() / 2) {
        Bangle.musicControl("previous");
      } else {
        Bangle.musicControl("next");
      }
      return;
    }
  }
};

// Music event handlers
let onMusicState = function(state) {
  if (!lastMusicInfo) lastMusicInfo = {};
  lastMusicInfo.state = state;
  
  if (lcarsViewPos === 2) {
    drawMusicScreen();
  }
};

let onMusicTrack = function(track) {
  // BATTERY SAFETY: Only update if track actually changed
  if (!lastMusicInfo || 
      lastMusicInfo.track !== track.track ||
      lastMusicInfo.artist !== track.artist) {
    
    lastMusicInfo = track;
    if (lcarsViewPos === 2) {
      drawMusicScreen();
    }
  }
};

// Event listeners
Bangle.on('lcdPower', onLcdPower);
Bangle.on('touch', onTouch);

if (settings.enableMusic) {
  Bangle.on('musicstate', onMusicState);
  Bangle.on('musictrack', onMusicTrack);
}

// Cleanup function for app exit
let cleanup = function() {
  // BATTERY SAFETY: Clear ALL intervals and timers
  stopHAPolling();
  stopMusicProgressUpdates();
  
  if (drawTimeout) {
    clearTimeout(drawTimeout);
    drawTimeout = undefined;
  }
  
  // Clean up event listeners
  Bangle.removeListener("lcdPower", onLcdPower);
  Bangle.removeListener("touch", onTouch);
  
  if (settings.enableMusic) {
    Bangle.removeListener("musicstate", onMusicState);
    Bangle.removeListener("musictrack", onMusicTrack);
  }
  
  // Clean up fonts
  delete Graphics.prototype.setFontAntonioMedium;
  delete Graphics.prototype.setFontAntonioLarge;
  
  widget_utils.cleanup();
};

// UI setup
Bangle.setUI({mode: "clock", remove: cleanup});
Bangle.loadWidgets();

// Initialize display
g.setTheme({bg: "#000", fg: "#fff", dark: true}).clear();
draw();

// BATTERY SAFETY: App exit handler
E.on('kill', cleanup);
}