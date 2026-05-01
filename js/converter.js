/**
 * 이미지 변환기
 * iOS 이미지를 Android 파일명으로 매핑 + Photoshop PNG를 순수 PNG로 변환
 */
const KThemeConverter = {
    /**
     * iOS → Android 이미지 파일명 매핑
     * @3x → xxhdpi, sw600dp
     */
    IMAGE_MAP: {
        // 탭 아이콘 (normal)
        'maintabIcoFriends': 'theme_maintab_ico_friends_image',
        'maintabIcoChats': 'theme_maintab_ico_chats_image',
        'maintabIcoCall': 'theme_maintab_ico_call_image',
        'maintabIcoMore': 'theme_maintab_ico_more_image',
        'maintabIcoShopping': 'theme_maintab_ico_shopping_image',
        'maintabIcoPiccoma': 'theme_maintab_ico_piccoma_image',
        'maintabIcoView': 'theme_maintab_ico_now_image',
        'maintabIcoHome': 'theme_maintab_ico_more_image',
        // 탭 아이콘 (selected/focused)
        'maintabIcoFriendsSelected': 'theme_maintab_ico_friends_focused_image',
        'maintabIcoChatsSelected': 'theme_maintab_ico_chats_focused_image',
        'maintabIcoCallSelected': 'theme_maintab_ico_call_focused_image',
        'maintabIcoMoreSelected': 'theme_maintab_ico_more_focused_image',
        'maintabIcoShoppingSelected': 'theme_maintab_ico_shopping_focused_image',
        'maintabIcoPiccomaSelected': 'theme_maintab_ico_piccoma_focused_image',
        'maintabIcoViewSelected': 'theme_maintab_ico_now_focused_image',
        'maintabIcoHomeSelected': 'theme_maintab_ico_more_focused_image',
        // 배경
        'mainBgImage': 'theme_background_image',
        'chatroomBgImage': 'theme_chatroom_background_image',
        'passcodeBgImage': 'theme_passcode_background_image',
        // 프로필
        'profileImg01': 'theme_profile_01_image',
        // 패스코드
        'passcodeImgCode01': 'theme_passcode_01_image',
        'passcodeImgCode02': 'theme_passcode_02_image',
        'passcodeImgCode03': 'theme_passcode_03_image',
        'passcodeImgCode04': 'theme_passcode_04_image',
        'passcodeImgCode01Selected': 'theme_passcode_01_checked_image',
        'passcodeImgCode02Selected': 'theme_passcode_02_checked_image',
        'passcodeImgCode03Selected': 'theme_passcode_03_checked_image',
        'passcodeImgCode04Selected': 'theme_passcode_04_checked_image',
        // 말풍선 (iOS 이미지는 9-patch가 아니므로 일반 png로 저장)
        'chatroomBubbleSend01': 'theme_chatroom_bubble_me_01_image',
        'chatroomBubbleSend02': 'theme_chatroom_bubble_me_02_image',
        'chatroomBubbleReceive01': 'theme_chatroom_bubble_you_01_image',
        'chatroomBubbleReceive02': 'theme_chatroom_bubble_you_02_image',
        'chatroomBubbleSend01Selected': 'theme_chatroom_bubble_me_01_image',
        'chatroomBubbleSend02Selected': 'theme_chatroom_bubble_me_02_image',
        'chatroomBubbleReceive01Selected': 'theme_chatroom_bubble_you_01_image',
        'chatroomBubbleReceive02Selected': 'theme_chatroom_bubble_you_02_image',
    },

    /**
     * 스플래시 이미지로도 사용되는 배경 이미지 목록
     */
    SPLASH_FOLDERS: [
        'drawable-xxhdpi',
        'drawable-xhdpi',
        'drawable-land-xxhdpi',
        'drawable-land-xhdpi',
        'drawable-sw600dp',
        'drawable-sw600dp-land',
    ],

    /**
     * iOS 이미지 파일명에서 기본 이름 추출
     * 예: maintabIcoFriends@3x.png → maintabIcoFriends
     */
    extractBaseName(filename) {
        return filename.replace(/^Images\//, '')
                       .replace(/@[23]x\.png$/i, '')
                       .replace(/\.png$/i, '');
    },

    /**
     * iOS 이미지를 순수 PNG로 변환
     * PSD 형식 → PsdReader로 변환
     * 일반 PNG → Canvas로 re-encode (메타데이터 정리)
     */
    async convertToPurePng(imageData) {
        // PSD 형식인지 확인
        if (PsdReader.isPsd(imageData)) {
            try {
                return await PsdReader.psdToPng(imageData);
            } catch (e) {
                console.warn('PSD 변환 실패:', e);
                return imageData;
            }
        }

        // 일반 PNG → Canvas로 re-encode
        return new Promise((resolve) => {
            const blob = new Blob([imageData], { type: 'image/png' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((resultBlob) => {
                    URL.revokeObjectURL(url);
                    if (resultBlob) {
                        resultBlob.arrayBuffer().then(resolve).catch(() => resolve(imageData));
                    } else {
                        resolve(imageData);
                    }
                }, 'image/png');
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(imageData);
            };
            img.src = url;
        });
    },

    /**
     * 이미지를 변환하고 Android 경로로 매핑
     * @returns {Object} { 'path/to/android/image.png': ArrayBuffer }
     */
    async convertImages(iosImages, onProgress) {
        const result = {};
        const entries = Object.entries(iosImages);
        let processed = 0;

        for (const [filename, data] of entries) {
            const baseName = this.extractBaseName(filename);
            const androidName = this.IMAGE_MAP[baseName];

            if (!androidName) {
                processed++;
                continue;
            }

            // 순수 PNG로 변환
            const pureData = await this.convertToPurePng(data);

            // @3x → xxhdpi, sw600dp
            if (filename.includes('@3x') || !filename.includes('@')) {
                result[`src/main/theme/drawable-xxhdpi/${androidName}.png`] = pureData;
                result[`src/main/theme/drawable-sw600dp/${androidName}.png`] = pureData;

                // 배경 이미지는 스플래시로도 사용
                if (baseName === 'mainBgImage') {
                    for (const folder of this.SPLASH_FOLDERS) {
                        result[`src/main/theme/${folder}/theme_splash_image.png`] = pureData;
                    }
                }
            }

            processed++;
            if (onProgress) {
                onProgress(processed / entries.length);
            }
        }

        return result;
    },

    /**
     * colors.xml 생성
     */
    generateColorsXml(colors) {
        let xml = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n';

        const colorEntries = Object.entries(colors)
            .filter(([key]) => !key.startsWith('_'));

        for (const [name, value] of colorEntries) {
            xml += `    <color name="${name}">${value}</color>\n`;
        }

        xml += '</resources>\n';
        return xml;
    },

    /**
     * strings.xml 생성 (테마 이름)
     */
    generateStringsXml(themeName, lang) {
        return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="theme_title">${themeName}</string>
    <string name="app_name">${themeName}</string>
</resources>`;
    },

    /**
     * 테마 ID를 Android 패키지명으로 변환
     */
    toPackageName(themeId) {
        // tenny.미소의세상 → miso
        // 한글/특수문자 제거, 소문자 영문만
        const clean = themeId
            .replace(/[^a-zA-Z0-9.]/g, '')
            .toLowerCase()
            .replace(/^\.+|\.+$/g, '');
        return clean || 'custom';
    },
};
