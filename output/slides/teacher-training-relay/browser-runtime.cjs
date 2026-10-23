// 검증 도구가 요구하는 Chromium 대신 이미 설치된 Chrome으로 로컬 슬라이드를 렌더링한다.
const { chromium } = require('/opt/homebrew/lib/node_modules/slides-grab/node_modules/playwright');
const launch = chromium.launch.bind(chromium);
chromium.launch = (options = {}) => launch({ ...options, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
