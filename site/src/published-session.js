// Rung 16: pure, zero-side-effect restoration of a validated published run.
// Caller must first verify the SHA-256 against the actual world (title picker).
import {validatePlayableWorld} from './playable-world.js';
import {validatePlaytestSave,replayPlaytestTrace} from './playtest-save.js';

export function preparePublishedRun(world,save){
  if(!save||typeof save.world_sha256!=='string')
    throw Error('Cannot start Continue without a verified save.');
  const manifest=validatePlayableWorld(world);
  const valid=validatePlaytestSave(save,manifest,save.world_sha256);
  const replay=replayPlaytestTrace(manifest,valid.frames);
  return {
    position:[...valid.position],
    progress:replay.progress,
    frames:valid.frames.map(frame=>({
      position:[...frame.position],interact:frame.interact,
      event_ids:[...frame.event_ids]
    })),
    activity:replay.timeline.flatMap(item=>item.events).slice(-8).reverse()
  };
}
