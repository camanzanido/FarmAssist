const fs = require('fs');
const path = require('path');
const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');

// Debug builds get their own package id and launcher name so they install beside the signed release APK.
const SUFFIX = '.debug';
const DEBUG_NAME = 'FarmAssist Dev';

const withDebugSuffix = (config) =>
  withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(`applicationIdSuffix "${SUFFIX}"`)) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /buildTypes\s*\{\s*debug\s*\{/,
        (match) => `${match}\n            applicationIdSuffix "${SUFFIX}"`,
      );
    }
    return cfg;
  });

const withDebugName = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/debug/res/values');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'strings.xml'),
        `<resources>\n  <string name="app_name">${DEBUG_NAME}</string>\n</resources>\n`,
      );
      return cfg;
    },
  ]);

module.exports = (config) => withDebugName(withDebugSuffix(config));
