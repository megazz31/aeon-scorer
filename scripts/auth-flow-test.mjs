import fs from 'node:fs'
import assert from 'node:assert/strict'

const client=fs.readFileSync(new URL('../src/supabaseClient.js',import.meta.url),'utf8')
const ui=fs.readFileSync(new URL('../src/CloudWorkspace.jsx',import.meta.url),'utf8')
assert.match(client,/export async function consumeAuthRedirect\(\)/,'confirmation/recovery callbacks must be consumed')
assert.match(client,/access_token/)
assert.match(client,/refresh_token/)
assert.match(client,/\/auth\/v1\/recover\?redirect_to=/,'password recovery endpoint must be wired')
assert.match(client,/export async function updatePassword\(/,'recovery callback must be able to set a new password')
assert.match(client,/export function signInWithOAuth\(/,'OAuth login must be available')
assert.match(client,/\/auth\/v1\/authorize\?provider=/,'OAuth authorization endpoint must be wired')
assert.match(ui,/Forgot password\?/,'sign-in UI must expose recovery')
assert.match(ui,/Mot de passe oublié \?/,'French sign-in UI must expose recovery')
assert.match(ui,/RecoveryPanel/,'password recovery callback must have a completion UI')
assert.match(ui,/Continue with Google/,'OAuth Google login button must be present in UI')
assert.match(ui,/Continuer avec Google/,'French OAuth Google login button must be present in UI')
assert.doesNotMatch(ui,/Compte créé\. Confirme-le/,'signup must not falsely assert account creation on repeated signup responses')
console.log('AUTH FLOW CONTRACT OK')
