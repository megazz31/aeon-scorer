import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const shareMigration=readFileSync(new URL('../supabase/migrations/20260822110500_aeon_p2_p7_share_intelligence.sql',import.meta.url),'utf8')
const realityMigration=readFileSync(new URL('../supabase/migrations/20260822112000_aeon_reality_observations.sql',import.meta.url),'utf8')
const matchMigration=readFileSync(new URL('../supabase/migrations/20260822113500_aeon_match_sessions.sql',import.meta.url),'utf8')
const client=readFileSync(new URL('../src/supabaseClient.js',import.meta.url),'utf8')

assert.match(shareMigration,/product_intelligence jsonb/)
assert.match(shareMigration,/aeon_safe_answer_profile/)
assert.match(shareMigration,/aeon_safe_threat_profile/)
assert.match(shareMigration,/'decklist',false,'oracle',false,'evidenceCards',false/)
assert.doesNotMatch(shareMigration,/product_intelligence[^\n]*r\.result/)
assert.match(client,/product_intelligence/)
assert.doesNotMatch(client,/analysis_shares\?select=[^\n]*(?:decklist|oracle_text|cards|result)/)

const realityTable=realityMigration.match(/create table if not exists public\.game_observations \(([\s\S]*?)\n\);/)?.[1]||''
assert.ok(realityTable,'game_observations table contract missing')
for(const forbidden of ['decklist','oracle','card_name','card_list','email','ip_address','user_agent'])assert.equal(realityTable.toLowerCase().includes(forbidden),false,`game_observations must not store ${forbidden}`)
assert.match(realityMigration,/alter table public\.game_observations enable row level security/)
assert.match(realityMigration,/revoke all on public\.game_observations from public,anon,authenticated/)
assert.doesNotMatch(realityMigration,/grant select on public\.game_observations to (?:anon|authenticated)/)
assert.match(realityMigration,/observation_rate_limited/)
assert.match(realityMigration,/grant execute on function public\.aeon_submit_game_observation/)

const sessionTable=matchMigration.match(/create table if not exists public\.match_sessions \(([\s\S]*?)\n\);/)?.[1]||''
const entryTable=matchMigration.match(/create table if not exists public\.match_session_entries \(([\s\S]*?)\n\);/)?.[1]||''
assert.ok(sessionTable&&entryTable,'match session tables missing')
for(const block of [sessionTable,entryTable])for(const forbidden of ['decklist','oracle','card_name','card_list','email','ip_address','user_agent'])assert.equal(block.toLowerCase().includes(forbidden),false,`match sessions must not store ${forbidden}`)
assert.match(sessionTable,/organizer_token_hash/)
assert.doesNotMatch(sessionTable,/organizer_token\s+text/)
assert.match(matchMigration,/extensions\.digest\(token,'sha256'\)/)
assert.match(matchMigration,/where code=p_code for update/)
assert.match(matchMigration,/alreadyJoined/)
assert.match(matchMigration,/grant execute on function public\.aeon_create_match_session\(integer\) to authenticated/)
assert.doesNotMatch(matchMigration,/grant execute on function public\.aeon_create_match_session\(integer\) to anon/)
assert.match(matchMigration,/grant execute on function public\.aeon_join_match_session\(text,text\) to anon,authenticated/)
assert.match(matchMigration,/revoke all on public\.match_sessions from public,anon,authenticated/)
assert.match(matchMigration,/revoke all on public\.match_session_entries from public,anon,authenticated/)

console.log('P2-P7 SECURITY CONTRACT OK — shares sanitized, sessions bounded, observations privacy-bounded')
