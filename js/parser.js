/**
 * KakaoTalkTheme.css 파서
 * iOS 테마 CSS에서 색상값과 테마 정보를 추출
 */
const KThemeParser = {
    /**
     * CSS 텍스트를 파싱하여 블록별로 분리
     */
    parseBlocks(cssText) {
        const blocks = {};
        const blockRegex = /(\S+)\s*\{([^}]*)\}/g;
        let match;
        while ((match = blockRegex.exec(cssText)) !== null) {
            const name = match[1].trim();
            const body = match[2].trim();
            blocks[name] = this.parseProperties(body);
        }
        return blocks;
    },

    /**
     * CSS 블록 내 속성들을 파싱
     */
    parseProperties(body) {
        const props = {};
        const lines = body.split('\n');
        for (const line of lines) {
            const cleaned = line.replace(/\/\*.*?\*\//g, '').trim();
            if (!cleaned || cleaned.startsWith('/*')) continue;

            const colonIdx = cleaned.indexOf(':');
            if (colonIdx === -1) continue;

            const key = cleaned.substring(0, colonIdx).trim();
            let value = cleaned.substring(colonIdx + 1).trim();
            value = value.replace(/;$/, '').trim();
            // 이미지 참조에서 파일명만 추출
            if (value.startsWith("'") && value.includes("'")) {
                value = value.split("'")[1];
            }
            props[key] = value;
        }
        return props;
    },

    /**
     * 테마 메타정보 추출
     */
    extractManifest(blocks) {
        const manifest = blocks['ManifestStyle'] || {};
        return {
            name: manifest['-kakaotalk-theme-name'] || 'Unknown Theme',
            version: manifest['-kakaotalk-theme-version'] || '',
            author: manifest['-kakaotalk-author-name'] || '',
            url: manifest['-kakaotalk-theme-url'] || '',
            id: manifest['-kakaotalk-theme-id'] || 'custom.theme',
        };
    },

    /**
     * iOS CSS에서 색상값 추출
     */
    extractColors(blocks) {
        const tabBar = blocks['TabBarStyle-Main'] || {};
        const header = blocks['HeaderStyle-Main'] || {};
        const mainPrimary = blocks['MainViewStyle-Primary'] || {};
        const mainSecondary = blocks['MainViewStyle-Secondary'] || {};
        const sectionTitle = blocks['SectionTitleStyle-Main'] || {};
        const feature = blocks['FeatureStyle-Primary'] || {};
        const chatBg = blocks['BackgroundStyle-ChatRoom'] || {};
        const inputBar = blocks['InputBarStyle-Chat'] || {};
        const msgSend = blocks['MessageCellStyle-Send'] || {};
        const msgRecv = blocks['MessageCellStyle-Receive'] || {};
        const passcodeBg = blocks['BackgroundStyle-Passcode'] || {};
        const passcodeLabel = blocks['LabelStyle-PasscodeTitle'] || {};
        const passcodeStyle = blocks['PasscodeStyle'] || {};
        const notifBg = blocks['BackgroundStyle-MessageNotificationBar'] || {};
        const notifName = blocks['LabelStyle-MessageNotificationBarName'] || {};
        const directShareBg = blocks['BackgroundStyle-DirectShareBar'] || {};
        const directShareName = blocks['LabelStyle-DirectShareBarName'] || {};
        const bottomBanner = blocks['BottomBannerStyle'] || {};

        // 기본 배경색
        const bgColor = this.normalizeColor(
            mainPrimary['background-color'] || tabBar['background-color'] || '#FFE5E8'
        );

        // 기본 텍스트색
        const textColor = this.normalizeColor(
            mainPrimary['-ios-text-color'] || header['-ios-text-color'] || '#333333'
        );

        // 눌림 텍스트색 (없으면 텍스트색에서 파생)
        const textPressedColor = this.normalizeColor(
            mainPrimary['-ios-highlighted-text-color'] || this.lightenColor(textColor, 30)
        );

        // 설명 텍스트색
        const descColor = this.normalizeColor(
            mainPrimary['-ios-description-text-color'] || textColor
        );
        const descPressedColor = this.normalizeColor(
            mainPrimary['-ios-description-highlighted-text-color'] || textPressedColor
        );

        // 문단(라스트메세지) 텍스트색
        const paraColor = this.normalizeColor(
            mainPrimary['-ios-paragraph-text-color'] || textColor
        );
        const paraPressedColor = this.normalizeColor(
            mainPrimary['-ios-paragraph-highlighted-text-color'] || textPressedColor
        );

        // 채팅방 배경색
        const chatroomBgColor = this.normalizeColor(
            chatBg['background-color'] || bgColor
        );

        // 입력창
        const inputBgColor = this.normalizeColor(
            inputBar['background-color'] || '#FFFFFF'
        );
        const sendBtnBgColor = this.normalizeColor(
            inputBar['-ios-send-normal-background-color'] || bgColor
        );
        const sendBtnFgColor = this.normalizeColor(
            inputBar['-ios-send-normal-foreground-color'] || textColor
        );
        const menuIconColor = this.normalizeColor(
            inputBar['-ios-button-normal-foreground-color'] || textColor
        );
        const inputTextColor = this.normalizeColor(
            inputBar['-ios-button-text-color'] || textColor
        );

        // 말풍선 텍스트
        const bubbleMeColor = this.normalizeColor(
            msgSend['-ios-text-color'] || textColor
        );
        const bubbleYouColor = this.normalizeColor(
            msgRecv['-ios-text-color'] || textColor
        );
        const unreadColor = this.normalizeColor(
            msgSend['-ios-unread-text-color'] || '#655E5F'
        );

        // 패스코드
        const passcodeBgColor = this.normalizeColor(
            passcodeBg['background-color'] || bgColor
        );
        const passcodeTextColor = this.normalizeColor(
            passcodeLabel['-ios-text-color'] || textColor
        );
        const passcodeKeypadColor = this.normalizeColor(
            passcodeStyle['-ios-keypad-text-normal-color'] || textColor
        );
        const passcodeKeypadBgColor = this.normalizeColor(
            passcodeStyle['-ios-keypad-background-color'] || bgColor
        );

        // 알림
        const notifBgColor = this.normalizeColor(
            notifBg['background-color'] || '#FFFFFF'
        );
        const notifTextColor = this.normalizeColor(
            notifName['-ios-text-color'] || textColor
        );

        // 다이렉트 공유
        const directShareBgColor = this.normalizeColor(
            directShareBg['background-color'] || '#FFFFFF'
        );
        const directShareTextColor = this.normalizeColor(
            directShareName['-ios-text-color'] || textColor
        );

        // 셀 배경 (alpha 적용)
        const cellAlpha = parseFloat(mainPrimary['-ios-normal-background-alpha'] || '0');
        const cellPressedAlpha = parseFloat(mainPrimary['-ios-selected-background-alpha'] || '0.05');
        const cellColor = mainPrimary['-ios-normal-background-color'] || textColor;
        const cellPressedColor = mainPrimary['-ios-selected-background-color'] || textColor;

        // 섹션 border
        const borderAlpha = parseFloat(sectionTitle['border-alpha'] || '0.09');
        const borderColor = this.normalizeColor(sectionTitle['border-color'] || textColor);

        return {
            // 주요 색상 (미리보기용)
            _bgColor: bgColor,
            _textColor: textColor,
            _chatroomBgColor: chatroomBgColor,
            _inputBgColor: inputBgColor,

            // Android colors.xml 매핑
            theme_header_color: textColor,
            theme_section_title_color: textColor,
            theme_title_color: textColor,
            theme_title_pressed_color: textPressedColor,
            theme_paragraph_color: paraColor,
            theme_paragraph_pressed_color: paraPressedColor,
            theme_description_color: descColor,
            theme_description_pressed_color: descPressedColor,
            theme_feature_primary_color: textColor,
            theme_feature_primary_pressed_color: textPressedColor,
            theme_feature_browse_tab_color: this.lightenColor(textColor, 60),
            theme_feature_browse_tab_focused_color: textColor,

            theme_background_color: bgColor,
            theme_chatroom_background_color: chatroomBgColor,
            theme_passcode_background_color: passcodeBgColor,

            theme_header_cell_color: bgColor,
            theme_body_cell_color: this.applyAlpha(this.normalizeColor(cellColor), cellAlpha),
            theme_body_cell_pressed_color: this.darkenColor(bgColor, 15),
            theme_body_cell_border_color: this.applyAlpha(borderColor, borderAlpha),
            theme_body_secondary_cell_color: this.normalizeColor(mainSecondary['background-color'] || bgColor),
            theme_maintab_cell_color: '#00FFFFFF',
            theme_tab_lightbannerbadge_background_color: textColor,
            theme_tab_bannerbadge_background_color: textColor,

            theme_direct_share_color: directShareTextColor,
            theme_direct_share_button_color: bgColor,
            theme_direct_share_background_color: directShareBgColor,
            theme_notification_color: notifTextColor,
            theme_notification_background_color: notifBgColor,
            theme_notification_background_pressed_color: this.darkenColor(bgColor, 15),

            theme_passcode_color: passcodeTextColor,
            theme_passcode_keypad_color: passcodeKeypadColor,
            theme_passcode_keypad_pressed_color: this.lightenColor(passcodeKeypadColor, 50),
            theme_passcode_keypad_background_color: passcodeKeypadBgColor,
            theme_passcode_keypad_pressed_background_color: this.applyAlpha(bgColor, 0.6),
            theme_passcode_pattern_line_color: bgColor,

            theme_chatroom_bubble_me_color: bubbleMeColor,
            theme_chatroom_bubble_you_color: bubbleYouColor,
            theme_chatroom_unread_count_color: unreadColor,
            theme_chatroom_input_bar_color: inputTextColor,
            theme_chatroom_input_bar_background_color: inputBgColor,
            theme_chatroom_input_bar_menu_icon_color: menuIconColor,
            theme_chatroom_input_bar_menu_button_color: this.applyAlpha(textColor, 0.03),
            theme_chatroom_input_bar_send_icon_color: sendBtnFgColor,
            theme_chatroom_input_bar_send_button_color: sendBtnBgColor,
        };
    },

    /**
     * 색상값 정규화 (#RGB → #RRGGBB, 소문자 → 대문자)
     */
    normalizeColor(color) {
        if (!color) return '#333333';
        color = color.trim().toUpperCase();
        if (!color.startsWith('#')) color = '#' + color;

        // #RGB → #RRGGBB
        if (color.length === 4) {
            color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        }
        // #FFF → #FFFFFF
        if (color.length === 4) {
            color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        }
        return color;
    },

    /**
     * alpha 값을 hex로 변환하여 색상에 적용
     */
    applyAlpha(color, alpha) {
        const hex = Math.round(alpha * 255).toString(16).toUpperCase().padStart(2, '0');
        const rgb = color.replace('#', '').substring(0, 6);
        return '#' + hex + rgb;
    },

    /**
     * 색상을 밝게
     */
    lightenColor(color, amount) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;
        const r = Math.min(255, rgb.r + amount);
        const g = Math.min(255, rgb.g + amount);
        const b = Math.min(255, rgb.b + amount);
        return this.rgbToHex(r, g, b);
    },

    /**
     * 색상을 어둡게
     */
    darkenColor(color, amount) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;
        const r = Math.max(0, rgb.r - amount);
        const g = Math.max(0, rgb.g - amount);
        const b = Math.max(0, rgb.b - amount);
        return this.rgbToHex(r, g, b);
    },

    hexToRgb(hex) {
        hex = hex.replace('#', '');
        // #AARRGGBB → skip alpha
        if (hex.length === 8) hex = hex.substring(2);
        if (hex.length !== 6) return null;
        return {
            r: parseInt(hex.substring(0, 2), 16),
            g: parseInt(hex.substring(2, 4), 16),
            b: parseInt(hex.substring(4, 6), 16),
        };
    },

    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(v =>
            Math.round(v).toString(16).toUpperCase().padStart(2, '0')
        ).join('');
    },
};
