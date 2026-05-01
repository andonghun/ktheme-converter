/**
 * Android 프로젝트 빌더
 * 템플릿 + 변환된 리소스 → ZIP
 */
const KThemeBuilder = {
    /**
     * 템플릿 파일 로드 (fetch로 가져오기)
     */
    async loadTemplate() {
        const templateFiles = {};

        // 템플릿 파일 목록 (정적으로 정의)
        const files = [
            'build.gradle.kts',
            'gradle.properties',
            'gradle/wrapper/gradle-wrapper.properties',
            'gradle/wrapper/gradle-wrapper.jar',
            'gradlew',
            'gradlew.bat',
            'src/main/AndroidManifest.xml',
            'src/main/ic_launcher-web.png',
            'src/main/java/com/kakao/talk/theme/converted/MainActivity.kt',
            'src/main/res/drawable/btn_action.xml',
            'src/main/res/layout/main_activity.xml',
            'src/main/res/values/colors.xml',
            'src/main/res/values/strings.xml',
            'src/main/res/values/styles.xml',
            // theme-adv color selectors
            'src/main/theme-adv/color/theme_description_color_selector.xml',
            'src/main/theme-adv/color/theme_feature_gift_color_selector.xml',
            'src/main/theme-adv/color/theme_feature_music_color_selector.xml',
            'src/main/theme-adv/color/theme_feature_primary_color_selector.xml',
            'src/main/theme-adv/color/theme_paragraph_color_selector.xml',
            'src/main/theme-adv/color/theme_passcode_keypad_color_selector.xml',
            'src/main/theme-adv/color/theme_title_color_selector.xml',
            // theme-adv drawable selectors
            'src/main/theme-adv/drawable/theme_background_image.xml',
            'src/main/theme-adv/drawable/theme_body_cell_color_selector.xml',
            'src/main/theme-adv/drawable/theme_find_add_friend_button_image_selector.xml',
            'src/main/theme-adv/drawable/theme_notification_background.xml',
            'src/main/theme-adv/drawable/theme_passcode_keypad_background_color_land.xml',
            'src/main/theme-adv/drawable/theme_passcode_keypad_pressed_background_color_selector.xml',
            'src/main/theme-adv/drawable/theme_tab_call_icon.xml',
            'src/main/theme-adv/drawable/theme_tab_chats_icon.xml',
            'src/main/theme-adv/drawable/theme_tab_friend_icon.xml',
            'src/main/theme-adv/drawable/theme_tab_more_icon.xml',
            'src/main/theme-adv/drawable/theme_tab_now_icon.xml',
            'src/main/theme-adv/drawable/theme_tab_piccoma_icon.xml',
            'src/main/theme-adv/drawable/theme_tab_shopping_icon.xml',
            // theme images (template defaults)
            'src/main/theme/drawable-xxhdpi/theme_maintab_cell_image.9.png',
            'src/main/theme/drawable-xxhdpi/theme_find_add_friend_button_image.png',
            'src/main/theme/drawable-xxhdpi/theme_find_add_friend_button_pressed_image.png',
            'src/main/theme/drawable-sw600dp/theme_maintab_cell_image.9.png',
        ];

        // mipmap 파일들
        const densities = ['hdpi', 'mdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
        const launcherFiles = ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_background.png', 'ic_launcher_foreground.png'];
        for (const d of densities) {
            for (const f of launcherFiles) {
                files.push(`src/main/res/mipmap-${d}/${f}`);
            }
        }
        files.push('src/main/res/mipmap-anydpi-v26/ic_launcher.xml');
        files.push('src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml');

        for (const file of files) {
            try {
                const resp = await fetch(`template/${file}`);
                if (resp.ok) {
                    const isBinary = file.endsWith('.png') || file.endsWith('.jar') || file.endsWith('.9.png');
                    templateFiles[file] = isBinary
                        ? await resp.arrayBuffer()
                        : await resp.text();
                }
            } catch (e) {
                console.warn(`Template file not found: ${file}`);
            }
        }

        return templateFiles;
    },

    /**
     * 템플릿 파일 내용에서 패키지명 치환
     */
    replacePackageName(content, packageSuffix) {
        if (typeof content !== 'string') return content;
        return content
            .replace(/com\.kakao\.talk\.theme\.converted/g, `com.kakao.talk.theme.${packageSuffix}`)
            .replace(/com\.kakao\.talk\.theme\.template/g, `com.kakao.talk.theme.${packageSuffix}`)
            .replace(/com\.kakao\.talk\.theme\.apeach/g, `com.kakao.talk.theme.${packageSuffix}`);
    },

    /**
     * Android 프로젝트 ZIP 빌드
     */
    async build({ manifest, colors, images, onProgress }) {
        const zip = new JSZip();
        const packageSuffix = KThemeConverter.toPackageName(manifest.id);
        const projectName = manifest.name.replace(/[^a-zA-Z0-9가-힣\s]/g, '').trim() || 'KakaoTheme';

        onProgress && onProgress(0.1, '템플릿 파일 로드 중...');

        // 1. 템플릿 파일 로드
        const templateFiles = await this.loadTemplate();

        onProgress && onProgress(0.3, '프로젝트 파일 생성 중...');

        // 2. 템플릿 파일을 ZIP에 추가 (패키지명 치환)
        for (const [path, content] of Object.entries(templateFiles)) {
            let targetPath = path;

            // Java 소스 패키지 경로 변경
            if (path.includes('/theme/converted/')) {
                targetPath = path.replace('/theme/converted/', `/theme/${packageSuffix}/`);
            }

            const finalContent = this.replacePackageName(content, packageSuffix);
            zip.file(targetPath, finalContent);
        }

        onProgress && onProgress(0.4, '색상 파일 생성 중...');

        // 3. 테마 colors.xml 추가
        zip.file('src/main/theme/values/colors.xml',
            KThemeConverter.generateColorsXml(colors));

        // 4. strings.xml 추가 (다국어)
        zip.file('src/main/theme/values/strings.xml',
            KThemeConverter.generateStringsXml(manifest.name, 'en'));
        zip.file('src/main/theme/values-ko/strings.xml',
            KThemeConverter.generateStringsXml(manifest.name, 'ko'));
        zip.file('src/main/theme/values-ja/strings.xml',
            KThemeConverter.generateStringsXml(manifest.name, 'ja'));

        // 5. res/values/colors.xml (상태바 색상)
        const statusBarColor = colors.theme_background_color || '#FFE5E8';
        zip.file('src/main/res/values/colors.xml',
            `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="statusBarColor">${statusBarColor}</color>
    <color name="actionButtonBorderColor">#24000000</color>
    <color name="actionButtonPressedColor">#F6F6F6</color>
</resources>
`);

        onProgress && onProgress(0.5, '이미지 변환 중...');

        // 6. 변환된 이미지 추가
        for (const [path, data] of Object.entries(images)) {
            zip.file(path, data);
        }

        onProgress && onProgress(0.8, 'ZIP 파일 생성 중...');

        // 7. ZIP 생성
        const blob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
        });

        onProgress && onProgress(1.0, '완료!');

        return { blob, filename: `${projectName}-android-theme.zip` };
    },
};
