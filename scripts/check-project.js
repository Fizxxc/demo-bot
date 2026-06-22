import fs from 'node:fs';

const required = [
  'src/app/page.js',
  'src/app/app/layout.js',
  'src/app/console/layout.js',
  'src/app/globals.css',
  'design.md',
  'skill.md',
  'public/assets/mascots/support-laptop.webp',
  'public/assets/mascots/products-run-box.webp',
  'public/assets/mascots/celebrate-jump.webp',
  'public/assets/mascots/profile-thumbs-up.webp',
  'public/assets/mascots/presenter-point.webp',
  'public/assets/mascots/wave-hello.webp',
  'src/components/HelpWidget.js',
  'src/app/api/web/chat/widget/route.js',
  'src/lib/paymentNormalize.js'
];

const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error('Missing files:', missing.join(', '));
  process.exit(1);
}
console.log('Kograph project check passed.');
