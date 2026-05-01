/**
 * 최소 PSD 리더
 * Adobe Photoshop 형식 이미지에서 픽셀 데이터를 추출하여 Canvas에 그리기
 * 카카오톡 테마 아이콘(114x114 등 작은 이미지) 용도
 */
const PsdReader = {
    /**
     * ArrayBuffer가 PSD 형식인지 확인
     */
    isPsd(buffer) {
        const view = new DataView(buffer);
        // PSD magic: "8BPS" (0x38425053)
        return view.getUint32(0) === 0x38425053;
    },

    /**
     * ArrayBuffer가 표준 PNG인지 확인
     */
    isPng(buffer) {
        const view = new DataView(buffer);
        // PNG magic: 0x89504E47
        return view.getUint32(0) === 0x89504E47;
    },

    /**
     * PSD 파일에서 픽셀 데이터를 추출하여 PNG ArrayBuffer로 변환
     */
    async psdToPng(buffer) {
        const view = new DataView(buffer);
        let offset = 0;

        // === Header (26 bytes) ===
        // Signature: "8BPS" (4 bytes)
        offset += 4;
        // Version: 1 (2 bytes)
        const version = view.getUint16(offset); offset += 2;
        if (version !== 1) throw new Error('Unsupported PSD version: ' + version);
        // Reserved (6 bytes)
        offset += 6;
        // Channels (2 bytes)
        const channels = view.getUint16(offset); offset += 2;
        // Height (4 bytes)
        const height = view.getUint32(offset); offset += 4;
        // Width (4 bytes)
        const width = view.getUint32(offset); offset += 4;
        // Depth (2 bytes) - bits per channel
        const depth = view.getUint16(offset); offset += 2;
        // Color Mode (2 bytes) - 3 = RGB
        const colorMode = view.getUint16(offset); offset += 2;

        if (depth !== 8) throw new Error('Unsupported bit depth: ' + depth);
        if (colorMode !== 3) throw new Error('Unsupported color mode: ' + colorMode);

        // === Color Mode Data ===
        const colorModeDataLen = view.getUint32(offset); offset += 4;
        offset += colorModeDataLen;

        // === Image Resources ===
        const imageResourcesLen = view.getUint32(offset); offset += 4;
        offset += imageResourcesLen;

        // === Layer and Mask Information ===
        const layerMaskLen = view.getUint32(offset); offset += 4;
        offset += layerMaskLen;

        // === Image Data (composite/flattened image) ===
        const compression = view.getUint16(offset); offset += 2;

        const pixelCount = width * height;
        let channelData;

        if (compression === 0) {
            // Raw data - channels stored sequentially
            channelData = [];
            for (let ch = 0; ch < channels; ch++) {
                channelData.push(new Uint8Array(buffer, offset, pixelCount));
                offset += pixelCount;
            }
        } else if (compression === 1) {
            // RLE compressed
            // First: 2 bytes per scanline per channel (byte counts)
            const scanlineCounts = [];
            for (let ch = 0; ch < channels; ch++) {
                const counts = [];
                for (let y = 0; y < height; y++) {
                    counts.push(view.getUint16(offset)); offset += 2;
                }
                scanlineCounts.push(counts);
            }

            // Then: compressed data for each channel
            channelData = [];
            for (let ch = 0; ch < channels; ch++) {
                const decoded = new Uint8Array(pixelCount);
                let dstOffset = 0;

                for (let y = 0; y < height; y++) {
                    const lineEnd = offset + scanlineCounts[ch][y];
                    while (offset < lineEnd && dstOffset < pixelCount) {
                        const n = view.getInt8(offset); offset += 1;
                        if (n >= 0) {
                            // Copy next n+1 bytes literally
                            const count = n + 1;
                            for (let i = 0; i < count && dstOffset < pixelCount; i++) {
                                decoded[dstOffset++] = view.getUint8(offset); offset += 1;
                            }
                        } else if (n > -128) {
                            // Repeat next byte 1-n+1 times
                            const count = 1 - n;
                            const value = view.getUint8(offset); offset += 1;
                            for (let i = 0; i < count && dstOffset < pixelCount; i++) {
                                decoded[dstOffset++] = value;
                            }
                        }
                        // n === -128: no-op
                    }
                    offset = lineEnd; // ensure alignment
                }

                channelData.push(decoded);
            }
        } else {
            throw new Error('Unsupported compression: ' + compression);
        }

        // === Canvas에 그리기 ===
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(width, height);
        const pixels = imageData.data;

        for (let i = 0; i < pixelCount; i++) {
            pixels[i * 4 + 0] = channelData[0][i]; // R
            pixels[i * 4 + 1] = channelData[1] ? channelData[1][i] : channelData[0][i]; // G
            pixels[i * 4 + 2] = channelData[2] ? channelData[2][i] : channelData[0][i]; // B
            pixels[i * 4 + 3] = channels >= 4 ? channelData[3][i] : 255; // A
        }

        ctx.putImageData(imageData, 0, 0);

        // PNG로 export
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    blob.arrayBuffer().then(resolve).catch(reject);
                } else {
                    reject(new Error('Canvas toBlob failed'));
                }
            }, 'image/png');
        });
    },
};
