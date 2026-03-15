const fs = require('fs');

const pathStr = '/Users/biplovgautam/Desktop/hackathon/tsn.mediscript/frontend/src/components/ConsultationView.tsx';
let code = fs.readFileSync(pathStr, 'utf8');

const targetStr = `const response = await api.uploadSessionAudio(createdSessionId, file) as any;
            if (response && response.segments) {
               setTranscript(response.segments);
               // Also auto generate text notes based on transcript
               await api.generateNoteDraft({`;
               
const replacementStr = `const response = await api.uploadSessionAudio(createdSessionId, file) as any;
            if (response && response.segments) {
               const formattedSegments = response.segments.map((seg: any) => ({
                  speaker: seg.speakerRole,
                  text: seg.text
               }));
               setTranscript(formattedSegments);
               
               // Also auto generate text notes based on transcript
               await api.generateNoteDraft({`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync(pathStr, code);
