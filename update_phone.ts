import * as fs from 'fs';
import * as path from 'path';

const files = [
  'client/src/pages/legal/AboutUs.tsx',
  'client/src/pages/legal/ContactUs.tsx',
  'client/src/pages/legal/PrivacyPolicy.tsx',
  'client/src/pages/legal/RefundPolicy.tsx',
  'client/src/pages/legal/TermsOfService.tsx'
];

files.forEach(f => {
  const p = path.resolve(process.cwd(), f);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/72048(\s*)08334/g, '77608$107137');
    fs.writeFileSync(p, content, 'utf8');
    console.log('Updated ' + f);
  }
});
