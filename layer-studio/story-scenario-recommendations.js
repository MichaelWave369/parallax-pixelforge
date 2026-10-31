// PixelForge Rung 20 / Scenario Recommendations and Minimum Coverage Set.
// Pure, read-only analysis of already verified hypothetical scenario receipts.
// Exact minimum set is feasible because Rung 17 caps the catalog at 16 entries.
// Nothing here executes gameplay, changes saves, or certifies physical playtests.
import {analyzeRouteCoverage} from './story-route-coverage.js';

export const SCENARIO_RECOMMENDATIONS_SCHEMA=
  'pixelforge.layer-scenario-recommendations.v1';
export const MAX_EXACT_SCENARIOS=16;
const PRIORITY={choice:0,discovery:1,portal:2,flag:3,room:4,source:5};
const safeName=value=>String(value??'').slice(0,80);
function popcount(value){
  let count=0;
  while(value){value&=value-1;count++}
  return count;
}
function rowMasks(coverage,verified){
  const indices=new Map(verified.map((s,i)=>[s.id,i]));
  return coverage.rows.filter(row=>row.status==='verified').map(row=>{
    let mask=0;
    for(const cell of row.cells||[]){
      const index=indices.get(cell.scenarioId);
      if(index!=null&&cell.status==='verified')mask|=1<<index;
    }
    return {row,mask};
  });
}
export function minimumScenarioSet(coverage){
  if(!coverage||!Array.isArray(coverage.scenarios)||!Array.isArray(coverage.rows))
    throw Error('A Route Coverage Matrix is required.');
  const all=coverage.scenarios,verified=all.filter(s=>s.status==='verified');
  if(verified.length>MAX_EXACT_SCENARIOS)
    throw Error('Exact selection supports at most 16 verified scenarios.');
  const masks=rowMasks(coverage,verified);
  if(masks.some(item=>item.mask===0))
    throw Error('Verified coverage contains a target with no verified scenario evidence.');
  // Remove identical row constraints to speed up the exact subset search.
  const requirements=[...new Set(masks.map(item=>item.mask))];
  let bestMask=0,bestCount=Infinity,bestSteps=Infinity;
  // Exhaustive 2^16 bound is 65,536 subsets, so this is an EXACT minimum
  // cardinality set for the currently verified coverage, not greedy marketing.
  for(let subset=0;subset<(1<<verified.length);subset++){
    const count=popcount(subset);
    if(count>bestCount||count===0&&requirements.length)continue;
    const coversAll=requirements.every(mask=>(subset&mask)!==0);
    if(!coversAll)continue;
    let steps=0;
    for(let i=0;i<verified.length;i++)
      if(subset&(1<<i))steps+=verified[i].stepCount||0;
    if(count<bestCount||count===bestCount&&steps<bestSteps){
      bestMask=subset;bestCount=count;bestSteps=steps;
    }
  }
  if(!Number.isFinite(bestCount))throw Error('Cannot cover verified targets.');
  const selected=verified.filter((_,i)=>(bestMask&(1<<i))!==0);
  const selectedIds=selected.map(s=>s.id);
  const selectedSet=new Set(selectedIds);
  const scenarios=all.map(s=>{
    const isVerified=s.status==='verified';
    const unique=masks.filter(m=>m.mask!==0&&popcount(m.mask)===1&&
      m.row.verifiedBy.includes(s.id)).length;
    const selectedHere=selectedSet.has(s.id);
    return {id:s.id,name:s.name,status:s.status,stepCount:s.stepCount,
      selected:selectedHere,uniqueTargetCount:unique,
      disposition:!isVerified?'not-verified':
        selectedHere?'keep':'overlap',
      explanation:!isVerified?'Not eligible: route receipt is not verified against this world.':
        selectedHere?'Included in the smallest scenario set preserving all current verified target coverage.':
        'Overlapping hypothetical coverage is already preserved by the selected scenarios.'};
  });
  const coveredTargets=masks.length;
  return {
    algorithm:'exact-minimum-cardinality-then-fewest-steps',
    selectedIds,selectedCount:selected.length,
    eligibleCount:verified.length,omittedCount:verified.length-selected.length,
    excludedCount:all.length-verified.length,
    verifiedTargetsPreserved:coveredTargets,
    totalAuthoredTargets:coverage.rows.length,
    remainingUncoveredTargets:coverage.rows.filter(r=>r.status==='uncovered').length,
    remainingReviewTargets:coverage.rows.filter(r=>r.status==='needs-review').length,
    selectedTotalSteps:Number.isFinite(bestSteps)?bestSteps:0,
    scenarios
  };
}
function roomCoverage(coverage){
  const map=new Map();
  for(const row of coverage.rows){
    if(!row.roomId)continue;
    const data=map.get(row.roomId)||{total:0,uncovered:0,review:0};
    data.total++;
    if(row.status==='uncovered')data.uncovered++;
    if(row.status==='needs-review')data.review++;
    map.set(row.roomId,data);
  }
  return map;
}
export function recommendScenarioTargets(coverage,{limit=8}={}){
  if(!coverage?.rows||!Array.isArray(coverage.rows))return [];
  const bounds=Math.max(0,Math.min(24,Number.isFinite(limit)?Math.floor(limit):8));
  const byRoom=roomCoverage(coverage);
  const targets=coverage.rows.filter(row=>
    row.status==='uncovered'||row.status==='needs-review').map(row=>{
    const room=byRoom.get(row.roomId);
    const roomGaps=room?.uncovered||0;
    // Ranking is a HEURISTIC about what to try next, not a proof that the
    // next test will be physically playable or cover more than one target.
    const score=(6-(PRIORITY[row.kind]??6))*100+
      (row.status==='uncovered'?40:0)+Math.min(roomGaps,20);
    const reason=row.status==='needs-review'?
      'Existing historical scenario evidence needs an updated, verified hypothetical replay.':
      row.kind==='choice'?
        'This exact authored answer has no verified hypothetical scenario. Explore it separately from other exclusive choices.':
      row.kind==='discovery'?
        'This authored discovery has not been explicitly completed in a verified hypothetical scenario.':
      row.kind==='portal'?
        'No verified scenario explicitly travels through this authored passage.':
      row.kind==='flag'?
        'No verified scenario has earned this authored world flag through a recorded action.':
      row.kind==='source'?
        'No verified scenario explicitly assumes this authored NPC, boss or world event.':
        'No verified hypothetical scenario visits this authored room.';
    return {id:row.id,kind:row.kind,label:row.label,roomId:row.roomId,
      status:row.status,score,reason,
      suggestedName:safeName('Coverage / '+row.label),
      mapNodeId:row.mapNodeId||null};
  });
  targets.sort((a,b)=>b.score-a.score||
    (PRIORITY[a.kind]??9)-(PRIORITY[b.kind]??9)||
    a.label.localeCompare(b.label)||a.id.localeCompare(b.id));
  return targets.slice(0,bounds);
}
export function analyzeScenarioRecommendations(coverage,{limit=8}={}){
  const minimum=minimumScenarioSet(coverage);
  const nextTargets=recommendScenarioTargets(coverage,{limit});
  return {
    schema:SCENARIO_RECOMMENDATIONS_SCHEMA,
    reportType:'hypothetical-scenario-optimization',
    minimum,nextTargets,
    summary:{
      verifiedTargets:minimum.verifiedTargetsPreserved,
      authoredTargets:minimum.totalAuthoredTargets,
      selectedScenarios:minimum.selectedCount,
      eligibleScenarios:minimum.eligibleCount,
      staleOrInvalidScenarios:minimum.excludedCount,
      uncoveredTargets:minimum.remainingUncoveredTargets,
      needsReviewTargets:minimum.remainingReviewTargets,
      nextRecommendations:nextTargets.length
    },
    caution:'Exact minimum preserves existing verified HYPOTHETICAL narrative receipt coverage only. It is not a minimal gameplay test suite, proof of physical reachability, or an instruction to delete other saved scenarios.'
  };
}
export function suggestScenariosFromAtlas(atlas,catalog,options){
  return analyzeScenarioRecommendations(analyzeRouteCoverage(atlas,catalog),options);
}
