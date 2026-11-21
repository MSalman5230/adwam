const fs = require('node:fs/promises');
const path = require('node:path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const header = '<?xml version="1.0" encoding="utf-8"?>';
const exclude = [
  '<exclude domain="file" path="mmkv/adwam-session" />',
  '<exclude domain="file" path="mmkv/adwam-session.crc" />',
];

module.exports = (config) => {
  config = withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    application.$['android:fullBackupContent'] = '@xml/adwam_full_backup';
    application.$['android:dataExtractionRules'] = '@xml/adwam_data_extraction';
    return mod;
  });
  return withDangerousMod(config, ['android', async (mod) => {
    const directory = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
    await fs.mkdir(directory, { recursive: true });
    const legacy = [header, '<full-backup-content>', ...exclude.map((line) => `  ${line}`), '</full-backup-content>', ''];
    const modern = [header, '<data-extraction-rules>'];
    for (const type of ['cloud-backup', 'device-transfer']) {
      modern.push(`  <${type}>`, ...exclude.map((line) => `    ${line}`), `  </${type}>`);
    }
    modern.push('</data-extraction-rules>', '');
    await Promise.all([
      fs.writeFile(path.join(directory, 'adwam_full_backup.xml'), legacy.join('\n')),
      fs.writeFile(path.join(directory, 'adwam_data_extraction.xml'), modern.join('\n')),
    ]);
    return mod;
  }]);
};
