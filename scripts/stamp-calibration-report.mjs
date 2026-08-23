import fs from 'node:fs/promises'
import { AEON_LABEL,ENGINE_VERSION,MODEL_ID,SEMANTIC_VERSION } from '../src/version.js'

const jsonPath='calibration/latest.json'
const markdownPath='calibration/latest.md'

const report=JSON.parse(await fs.readFile(jsonPath,'utf8'))
report.engineVersion=ENGINE_VERSION
report.semanticVersion=SEMANTIC_VERSION
report.model=MODEL_ID
await fs.writeFile(jsonPath,JSON.stringify(report,null,2))

let markdown=await fs.readFile(markdownPath,'utf8')
markdown=markdown.replace(/^# Aeon Scorer v[^\n]+ calibration report/m,`# Aeon Scorer ${AEON_LABEL} calibration report`)
markdown=markdown.replace(/^Model:.*$/m,`Engine: ${ENGINE_VERSION}\nSemantic: ${SEMANTIC_VERSION}\nModel: ${MODEL_ID}`)
await fs.writeFile(markdownPath,markdown)

console.log('CALIBRATION REPORT STAMPED', {engine:ENGINE_VERSION,semantic:SEMANTIC_VERSION,model:MODEL_ID})
