const fs = require('fs');

const files = [
  '../api/src/admin/admin-ai-usage.controller.ts',
  '../api/src/admin/admin.controller.ts',
  '../api/src/admin/knowledge-point-atomicity.controller.ts',
  '../api/src/admin/ontology-resolution.controller.ts',
  '../api/src/admin/unresolved-hints/unresolved-hints.controller.ts',
  '../api/src/concept/concept.controller.ts',
  '../api/src/knowledge-extraction/knowledge-extraction.controller.ts',
  '../api/src/vision/vision.controller.ts',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Remove @UseGuards(AdminAuthGuard)
  content = content.replace(/@UseGuards\(AdminAuthGuard\)\n/g, '');
  
  // Remove AdminAuthGuard import
  content = content.replace(/import \{.*?AdminAuthGuard.*?\} from [^\n]+\n/g, '');
  
  // Clean up unused UseGuards import if there are no other @UseGuards
  if (!content.includes('@UseGuards(')) {
    content = content.replace(/UseGuards,?\s*/g, '');
  }
  
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Fixed ${file}`);
}
