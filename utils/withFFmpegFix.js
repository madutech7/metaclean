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

            // Add the local pod definition at the top if it doesn't exist
            if (!podfileContent.includes('ffmpeg-kit-ios-https')) {
              console.log('Generating local podspec for FFmpegFix...');
              const podspecContent = `
Pod::Spec.new do |s|
  s.name             = 'ffmpeg-kit-ios-https'
  s.version          = '6.0'
  s.summary          = 'Mirror of FFmpegKit for iOS'
  s.homepage         = 'https://github.com/luthviar/ffmpeg-kit-ios-full'
  s.license          = { :type => 'LGPL-3.0' }
  s.authors          = { 'Taner Sener' => 'tanersener@gmail.com' }
  s.platform         = :ios, '12.1'
  s.source           = { :http => 'https://github.com/luthviar/ffmpeg-kit-ios-full/releases/download/6.0/ffmpeg-kit-ios-full.zip' }
  s.vendored_frameworks = 'ffmpeg-kit-ios-full/*.xcframework'
end
`;
              const podspecPath = path.join(config.modRequest.projectRoot, 'ios', 'ffmpeg-kit-ios-https.podspec');
              fs.writeFileSync(podspecPath, podspecContent);

              console.log('Patching Podfile for FFmpegFix...');
              const fix = "\n# FFmpeg Kit 404 Fix\npod 'ffmpeg-kit-ios-https', :path => 'ffmpeg-kit-ios-https.podspec'\n";
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
