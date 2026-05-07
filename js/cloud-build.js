/**
 * 클라우드 APK 빌드 클라이언트
 * Cloudflare Worker를 통해 GitHub Actions로 APK 빌드
 */
const CloudBuild = {
    WORKER_URL: 'https://ktheme-build-worker.flowtrace.workers.dev',

    async submitBuild(zipBlob) {
        const resp = await fetch(`${this.WORKER_URL}/build`, {
            method: 'POST',
            body: zipBlob,
            headers: { 'Content-Type': 'application/zip' },
        });
        if (!resp.ok) {
            const data = await resp.json().catch(() => ({}));
            throw new Error(data.error || `서버 오류 (${resp.status})`);
        }
        return resp.json();
    },

    async checkStatus(buildId) {
        const resp = await fetch(`${this.WORKER_URL}/status/${buildId}`);
        if (!resp.ok) {
            throw new Error('상태 확인 실패');
        }
        return resp.json();
    },

    getDownloadUrl(buildId) {
        return `${this.WORKER_URL}/download/${buildId}`;
    },

    async pollUntilComplete(buildId, onUpdate) {
        const MAX_POLLS = 60; // 최대 10분 (10초 간격)
        let polls = 0;

        return new Promise((resolve, reject) => {
            const poll = async () => {
                try {
                    polls++;
                    const result = await this.checkStatus(buildId);
                    if (onUpdate) onUpdate(result);

                    if (result.status === 'completed') {
                        resolve(result);
                        return;
                    }
                    if (result.status === 'failed') {
                        reject(new Error('APK 빌드에 실패했습니다.'));
                        return;
                    }
                    if (polls >= MAX_POLLS) {
                        reject(new Error('빌드 시간이 초과되었습니다.'));
                        return;
                    }

                    setTimeout(poll, 10000);
                } catch (e) {
                    if (polls >= MAX_POLLS) {
                        reject(e);
                    } else {
                        setTimeout(poll, 10000);
                    }
                }
            };
            poll();
        });
    },
};
