const fs = require('fs');
const _path = '/Users/biplovgautam/Desktop/hackathon/tsn.mediscript/frontend/src/components/OtherViews.tsx';
const data = fs.readFileSync(_path, 'utf8');

const updated = data.replace('const file = new File([audioBlob], "enrollment.webm", { type: "audio/webm" });', `const file = new File([audioBlob], "enrollment.webm", { type: "audio/webm" });
        console.log('Sending file of size:', file.size, 'type:', file.type);`);
fs.writeFileSync(_path, updated);
