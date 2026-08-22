import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const shareMigration=readFileSync(new URL('../supabase/migrations/20260822110500_aeon_p2_p7_share_intelligence.sql',import.meta.url),'utf8')
const realityMigration=readFileSync(new URL('../supabase/migrations/20260822112000_aeon_reality_observations.sql',import.meta.url),'utf8')
const matchMigration=readFileSync(new URL('../supabase/migrations/20260822113500_aeon_match_sessions.sql',import.meta.url),'utf8')
const client=readFileSync(new URL('../src/supabaseClient.js',import.meta.url),'utf8')
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8')
const vercel=readFileSync(new URL('../vercel.json',import.meta.url),'utf8')

assert.match(shareMigration,/product_intelligence jsonb/)
assert.match(shareMigration,/aeon_safe_answer_profile/)
assert.match(shareMigration,/aeon_safe_threat_profile/)
assert.match(shareMigration,/'decklist',false,'oracle',false,'evidenceCards',false/)
assert.doesNotMatch(shareMigration,/product_intelligence[^\n]*r\.result/)
assert.match(client,/product_intelligence/)
assert.doesNotMatch(client,/analysis_shares\?select=[^\n]*(?:decklist|oracle_text|cards|result)/)

const realityTable=realityMigration.match(/create table if not exists public\.game_observations \(([\s\S]*?)\n\);/)?.[1]||''
assert.ok(realityTable,'game_observations table contract missing')
for(const forbidden of ['decklist','oracle','card_name','card_list','email','ip_address','user_agent','share_code'])assert.equal(realityTable.toLowerCase().includes(forbidden),false,`game_observations must not store ${forbidden}`)
for(const required of ['pod_fingerprint','pod_model_version','predicted_risk_score','predicted_risk_level','predicted_pod_mismatch','predicted_threat_gap','turn_band','win_type','balance','dominant_event'])assert.ok(realityTable.toLowerCase().includes(required),`game_observations must store ${required}`)
assert.match(realityMigration,/predicted_risk_score between 0 and 100/)
assert.match(realityMigration,/predicted_pod_mismatch between 0 and 100/)
assert.match(realityMigration,/predicted_threat_gap between 0 and 100/)
assert.match(realityMigration,/p_predicted_risk_score is null/)
assert.match(realityMigration,/pg_advisory_xact_lock\(pg_catalog\.hashtext\(p_pod_fingerprint\)\)/)
assert.match(realityMigration,/alter table public\.game_observations enable row level security/)
assert.match(realityMigration,/revoke all on public\.game_observations from public,anon,authenticated/)
assert.doesNotMatch(realityMigration,/grant select on public\.game_observations to (?:anon|authenticated)/)
assert.match(realityMigration,/observation_rate_limited/)
assert.match(realityMigration,/grant execute on function public\.aeon_submit_game_observation/)
assert.match(client,/p_predicted_risk_score/)
assert.match(client,/p_predicted_pod_mismatch/)
assert.match(client,/p_predicted_threat_gap/)

const sessionTable=matchMigration.match(/create table if not exists public\.match_sessions \(([\s\S]*?)\n\);/)?.[1]||''
const entryTable=matchMigration.match(/create table if not exists public\.match_session_entries \(([\s\S]*?)\n\);/)?.[1]||''
assert.ok(sessionTable&&entryTable,'match session tables missing')
for(const block of [sessionTable,entryTable])for(const forbidden of ['decklist','oracle','card_name','card_list','email','ip_address','user_agent'])assert.equal(block.toLowerCase().includes(forbidden),false,`match sessions must not store ${forbidden}`)
assert.match(sessionTable,/organizer_token_hash/)
assert.match(sessionTable,/max_players integer not null default 64 check \(max_players between 4 and 64\)/)
assert.match(sessionTable,/expires_at timestamptz not null default now\(\)\+interval '6 hours'/)
assert.doesNotMatch(sessionTable,/organizer_token\s+text/)
assert.match(matchMigration,/extensions\.digest\(token,'sha256'\)/)
assert.match(matchMigration,/where code=p_code for update/)
assert.match(matchMigration,/alreadyJoined/)
assert.match(matchMigration,/session_full/)
assert.match(matchMigration,/grant execute on function public\.aeon_create_match_session\(integer\) to authenticated/)
assert.doesNotMatch(matchMigration,/grant execute on function public\.aeon_create_match_session\(integer\) to anon/)
assert.match(matchMigration,/grant execute on function public\.aeon_join_match_session\(text,text\) to anon,authenticated/)
assert.match(matchMigration,/revoke all on public\.match_sessions from public,anon,authenticated/)
assert.match(matchMigration,/revoke all on public\.match_session_entries from public,anon,authenticated/)

assert.match(main,/const matchRoute=path==='\/match'/)
assert.match(main,/else if\(matchRoute\)page=<AeonMatchPage\/>/)
assert.match(vercel,/"source": "\/match", "destination": "\/index\.html"/)

console.log('P2-P7 SECURITY/DEPLOYMENT CONTRACT OK — shares sanitized, sessions bounded/idempotent, observations transaction-rate-limited/privacy-bounded, /match directly routable')
