/**
 * 메인 UI 로직
 */
(function () {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadSection = document.getElementById('upload-section');
    const previewSection = document.getElementById('preview-section');
    const progressSection = document.getElementById('progress-section');
    const downloadSection = document.getElementById('download-section');
    const convertBtn = document.getElementById('convert-btn');
    const downloadBtn = document.getElementById('download-btn');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    let parsedTheme = null; // { manifest, colors, iosImages, cssText }
    let resultBlob = null;
    let resultFilename = null;

    // === 파일 업로드 ===

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    });

    async function handleFile(file) {
        if (!file.name.endsWith('.ktheme')) {
            alert('.ktheme 파일만 지원합니다.');
            return;
        }

        try {
            const zip = await JSZip.loadAsync(file);

            // CSS 파싱
            const cssFile = zip.file('KakaoTalkTheme.css');
            if (!cssFile) {
                alert('유효한 카카오톡 테마 파일이 아닙니다.\nKakaoTalkTheme.css가 없습니다.');
                return;
            }
            const cssText = await cssFile.async('text');
            const blocks = KThemeParser.parseBlocks(cssText);
            const manifest = KThemeParser.extractManifest(blocks);
            const colors = KThemeParser.extractColors(blocks);

            // 이미지 추출
            const iosImages = {};
            const imageFiles = Object.keys(zip.files).filter(f =>
                f.startsWith('Images/') && f.endsWith('.png') && !f.includes('__MACOSX') && !f.includes('.DS_Store')
            );

            for (const imgPath of imageFiles) {
                iosImages[imgPath] = await zip.file(imgPath).async('arraybuffer');
            }

            parsedTheme = { manifest, colors, iosImages, cssText };
            showPreview(manifest, colors, iosImages);
        } catch (e) {
            console.error(e);
            alert('파일 처리 중 오류가 발생했습니다.\n' + e.message);
        }
    }

    // === 미리보기 ===

    function showPreview(manifest, colors, iosImages) {
        uploadSection.classList.add('hidden');
        previewSection.classList.remove('hidden');
        progressSection.classList.add('hidden');
        downloadSection.classList.add('hidden');

        document.getElementById('theme-name').textContent = manifest.name;
        document.getElementById('theme-author').textContent = manifest.version || manifest.author || '-';

        // 색상 미리보기
        const colorPreview = document.getElementById('color-preview');
        colorPreview.innerHTML = '';
        const previewColors = [
            { label: '배경', color: colors._bgColor },
            { label: '텍스트', color: colors._textColor },
            { label: '채팅방', color: colors._chatroomBgColor },
            { label: '입력창', color: colors._inputBgColor },
        ];
        for (const { label, color } of previewColors) {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.innerHTML = `
                <div class="swatch" style="background:${color}"></div>
                <span class="swatch-label">${label}</span>
            `;
            colorPreview.appendChild(swatch);
        }

        // 아이콘 미리보기 (Canvas로 변환하여 Photoshop PNG 문제 해결)
        const iconPreview = document.getElementById('icon-preview');
        iconPreview.innerHTML = '';
        const iconNames = ['maintabIcoFriends', 'maintabIcoChats', 'maintabIcoCall',
                          'maintabIcoMore', 'maintabIcoShopping', 'maintabIcoView'];
        for (const name of iconNames) {
            const key3x = `Images/${name}@3x.png`;
            const key2x = `Images/${name}@2x.png`;
            const data = iosImages[key3x] || iosImages[key2x];
            if (data) {
                const img = document.createElement('img');
                img.alt = name;
                img.title = name;
                iconPreview.appendChild(img);
                // Canvas API로 순수 PNG 변환 후 표시
                KThemeConverter.convertToPurePng(data).then(pureData => {
                    const blob = new Blob([pureData], { type: 'image/png' });
                    img.src = URL.createObjectURL(blob);
                }).catch(() => {
                    // 변환 실패 시 원본 시도
                    const blob = new Blob([data], { type: 'image/png' });
                    img.src = URL.createObjectURL(blob);
                });
            }
        }
    }

    // === 변환 ===

    convertBtn.addEventListener('click', async () => {
        if (!parsedTheme) return;

        previewSection.classList.add('hidden');
        progressSection.classList.remove('hidden');

        try {
            updateProgress(0.1, '이미지 변환 중...');

            // 이미지 변환
            const images = await KThemeConverter.convertImages(
                parsedTheme.iosImages,
                (p) => updateProgress(0.1 + p * 0.4, '이미지 변환 중...')
            );

            updateProgress(0.5, '프로젝트 빌드 중...');

            // 프로젝트 빌드
            const result = await KThemeBuilder.build({
                manifest: parsedTheme.manifest,
                colors: parsedTheme.colors,
                images,
                onProgress: (p, msg) => updateProgress(0.5 + p * 0.5, msg),
            });

            resultBlob = result.blob;
            resultFilename = result.filename;

            progressSection.classList.add('hidden');
            downloadSection.classList.remove('hidden');
        } catch (e) {
            console.error(e);
            alert('변환 중 오류가 발생했습니다.\n' + e.message);
            progressSection.classList.add('hidden');
            previewSection.classList.remove('hidden');
        }
    });

    function updateProgress(value, text) {
        progressFill.style.width = (value * 100) + '%';
        progressText.textContent = text;
    }

    // === 다운로드 ===

    downloadBtn.addEventListener('click', () => {
        if (!resultBlob) return;
        const url = URL.createObjectURL(resultBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = resultFilename;
        a.click();
        URL.revokeObjectURL(url);
    });
})();
