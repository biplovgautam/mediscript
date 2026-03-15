const fs = require('fs');
const _path = '/Users/biplovgautam/Desktop/hackathon/tsn.mediscript/frontend/src/lib/api.ts';
const data = fs.readFileSync(_path, 'utf8');

const updated = data.replace('const response = await fetch(`${API_BASE_URL}${path}`, {', `console.log("Fetching API:", path, "Include JSON:", includeJson);
  const response = await fetch(\`\${API_BASE_URL}\${path}\`, {`);
fs.writeFileSync(_path, updated);
