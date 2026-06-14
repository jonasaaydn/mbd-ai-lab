// OGP画像（SNSシェア用 1200×630）を生成するスクリプト
// 実行: node scripts/generate-og.mjs
// 出力: public/og-image.png
// ※ ビルドには組み込まない（生成済みPNGを静的アセットとしてコミットする）
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, '..', 'public', 'og-image.png');

// テキストは全て ASCII + × に限定（フォント依存を避け、どの環境でも鮮明に描画される）
const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <pattern id="stripe" width="48" height="48" patternTransform="rotate(-45)" patternUnits="userSpaceOnUse">
      <rect width="24" height="48" fill="rgba(220,38,38,0.06)"/>
    </pattern>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.5" fill="rgba(255,255,255,0.05)"/>
    </pattern>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <rect x="760" width="440" height="630" fill="url(#stripe)"/>

  <!-- 左の赤アクセントバー -->
  <rect x="0" y="0" width="14" height="630" fill="#dc2626"/>

  <!-- ラベル -->
  <text x="90" y="180" font-family="Arial, sans-serif" font-size="26" font-weight="700"
        letter-spacing="6" fill="#dc2626">RACE ENGINEERING × AI TOOLS</text>

  <!-- ワードマーク -->
  <text x="86" y="320" font-family="Arial, sans-serif" font-size="118" font-weight="800"
        letter-spacing="-3" fill="#ffffff">MBD×AI Lab</text>

  <!-- アクセント下線 -->
  <rect x="92" y="350" width="180" height="6" rx="3" fill="#dc2626"/>

  <!-- タグライン -->
  <text x="92" y="430" font-family="Arial, sans-serif" font-size="38" font-weight="500"
        fill="#94a3b8">AI tools for MBD, Simulink, CAE &amp; vehicle dynamics</text>

  <!-- フッター -->
  <text x="92" y="540" font-family="monospace" font-size="26" font-weight="500"
        fill="#64748b">jonasaaydn.github.io/mbd-ai-lab</text>

  <!-- 右下のギア記号 -->
  <text x="1040" y="560" font-family="Arial, sans-serif" font-size="120" fill="rgba(220,38,38,0.18)">&#9881;</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(out);
console.log('Generated:', out);
