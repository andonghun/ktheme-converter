# KTheme Converter

카카오톡 iOS 테마(`.ktheme`)를 Android 테마 프로젝트로 변환하는 웹앱입니다.

**https://ktheme.flowtrace.xyz**

## 사용법

1. 위 사이트에 접속
2. `.ktheme` 파일을 드래그 앤 드롭 (또는 파일 선택)
3. 미리보기에서 색상/아이콘 확인
4. "Android 테마로 변환" 클릭
5. ZIP 다운로드 → Android Studio에서 열기 → APK 빌드
6. APK를 폰에 설치 후 카카오톡 설정 → 테마에서 적용

## 특징

- **100% 브라우저 처리** — 파일이 서버로 전송되지 않음
- **PSD 자동 변환** — Adobe Photoshop 형식으로 저장된 iOS 테마 이미지를 자동 감지/변환
- **44개 색상 매핑** — iOS CSS 속성을 Android colors.xml로 변환
- **밀도별 이미지 생성** — @3x → xxhdpi, sw600dp 자동 배치

## 변환 항목

| 구분 | 내용 |
|---|---|
| 탭 아이콘 | 친구, 채팅, 통화, 더보기, 쇼핑, 피코마, 뷰 (일반 + 선택) |
| 배경 | 메인, 채팅방, 패스코드, 스플래시 |
| 프로필 | 기본 프로필 이미지 |
| 패스코드 | 입력 아이콘 4종 (일반 + 선택) |
| 말풍선 | 보내기/받기 각 2종 |
| 색상 | 배경색, 텍스트색, 버튼색, 셀색 등 44개 |

## 기술 스택

- 순수 HTML / CSS / JavaScript (프레임워크 없음)
- [JSZip](https://stuk.github.io/jszip/) — ZIP 압축/해제
- Canvas API — 이미지 변환
- 자체 PSD 파서 — Photoshop 바이너리 포맷 디코딩

## 프로젝트 구조

```
├── index.html          # 메인 페이지
├── css/style.css       # 스타일
├── js/
│   ├── main.js         # UI 로직
│   ├── parser.js       # iOS CSS 파싱 + 색상 매핑
│   ├── converter.js    # 이미지 변환 + 파일명 매핑
│   ├── builder.js      # Android 프로젝트 ZIP 생성
│   └── psd-reader.js   # PSD 바이너리 파서
├── template/           # Android 프로젝트 템플릿
└── lib/jszip.min.js    # JSZip 라이브러리
```

## 로컬 실행

정적 파일이므로 아무 HTTP 서버로 실행 가능합니다.

```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .
```

## 라이선스

MIT
