const fs = require('fs');

const data = fs.readFileSync('/Users/biplovgautam/Desktop/hackathon/tsn.mediscript/backend/controllers/auth.controller.ts', 'utf8');

const updated = data.replace('export const enrollVoice = async (req: Request, res: Response) => {\n  try {\n    if (!req.user) {', `export const enrollVoice = async (req: Request, res: Response) => {
  console.log('--- ENROLL VOICE HIT ---');
  console.log('User:', req.user ? req.user.id : 'No user');
  console.log('File:', req.file ? req.file.path : 'No file');
  try {
    if (!req.user) {`);

fs.writeFileSync('/Users/biplovgautam/Desktop/hackathon/tsn.mediscript/backend/controllers/auth.controller.ts', updated);
