// Shared QA helpers. Paths are configurable so the scripts run from any checkout or worktree:
//   QA_PLAYWRIGHT  path to the playwright-core module (default: the shared box copy)
//   QA_CHROME      Chrome/Chromium executable (default /usr/bin/google-chrome)
const PW = process.env.QA_PLAYWRIGHT || '/home/box/games/engine/qa/node_modules/playwright-core';
let pw; try { pw = require(PW); } catch (e) { pw = require('playwright-core'); }
const CHROME = process.env.QA_CHROME || '/usr/bin/google-chrome';
const VP = {
  phone: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  ipad: { width: 1024, height: 1366, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { width: 1280, height: 800, isMobile: false, hasTouch: false, deviceScaleFactor: 1 }
};
const launch = (extra) => pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'].concat(extra || []) });
module.exports = { chromium: pw.chromium, CHROME, VP, launch };
