const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to fix the FFmpegKit 404 error on iOS.
 * It replaces the broken 'ffmpeg-kit-ios-https' dependency with a working community mirror 'ffmpeg-kit-ios-full'.
 */
const withFFmpegFix = (config) => {
  return withPlugins(config, [
    // 1. Patch the Podfile during generation to use the working mirror
    (config) => {
      return withDangerousMod(config, [
        'ios',
        async (config) => {
          const podfilePath = path.join(config.modRequest.projectRoot, 'ios', 'Podfile');
          if (fs.existsSync(podfilePath)) {
            let podfileContent = fs.readFileSync(podfilePath, 'utf8');

            if (!podfileContent.includes('ffmpeg-kit-ios-full')) {
              console.log('Patching node_modules podspecs to use ffmpeg-kit-ios-full...');
              // Manually find and replace in the relevant podspecs
              const nodeModulesPath = path.join(config.modRequest.projectRoot, 'node_modules', 'ffmpeg-kit-react-native');
              if (fs.existsSync(nodeModulesPath)) {
                const podspecFiles = fs.readdirSync(nodeModulesPath).filter(file => file.endsWith('.podspec'));
                podspecFiles.forEach(file => {
                  const filePath = path.join(nodeModulesPath, file);
                  let content = fs.readFileSync(filePath, 'utf8');
                  if (content.includes('ffmpeg-kit-ios-https')) {
                    content = content.replace(/ffmpeg-kit-ios-https/g, 'ffmpeg-kit-ios-full');
                    fs.writeFileSync(filePath, content);
                  }
                });
              }

              console.log('Patching Podfile for FFmpegFix...');
              // Replace any existing reference
              podfileContent = podfileContent.replace(/ffmpeg-kit-ios-https/g, 'ffmpeg-kit-ios-full');

              // Inject the working mirror at the top
              const fix = "\n# FFmpeg Kit 404 Fix\npod 'ffmpeg-kit-ios-full', :podspec => 'https://raw.githubusercontent.com/luthviar/ffmpeg-kit-ios-full/main/ffmpeg-kit-ios-full.podspec'\n";
              podfileContent = fix + podfileContent;
              
              fs.writeFileSync(podfilePath, podfileContent);
            }
          }
          return config;
        },
      ]);
    },
    // 2. Patch the node_modules podspec to point to 'full' instead of 'https'
    (config) => {
      // In a real automated plugin, we'd use a postinstall script, but here we can do a local patch too.
      // However, config plugins only run during prebuild.
      return config;
    }
  ]);
};

module.exports = withFFmpegFix;
