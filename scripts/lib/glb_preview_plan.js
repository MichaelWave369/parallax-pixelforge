export function buildGlbPreviewPlan(inspection) {
  if (!inspection?.valid) throw new Error('A valid GLB inspection is required.');
  const s=inspection.summary || {};
  const warnings=[];
  if (!(s.meshes > 0)) warnings.push('NO_MESHES');
  if ((s.animations || 0) > 0) warnings.push('ANIMATION_PRESENT_PREVIEW_STATIC_ONLY');
  if ((s.skins || 0) > 0) warnings.push('SKINNING_PRESENT_PREVIEW_STATIC_ONLY');
  if ((s.cameras || 0) > 0) warnings.push('EMBEDDED_CAMERAS_IGNORED');
  if ((inspection.extensions_required || []).length) warnings.push('REQUIRED_EXTENSIONS_MAY_BE_UNSUPPORTED');
  return {
    schema:'pixelforge.glb-preview-plan.v1',
    eligible:(s.meshes || 0) > 0,
    renderer:'NATIVE_WEBGL2_STATIC_GLTF2',
    supported:[
      'TRIANGLES',
      'POSITION',
      'NORMAL_OPTIONAL',
      'TEXCOORD_0_OPTIONAL',
      'INDICES_OPTIONAL',
      'PBR_BASE_COLOR_FACTOR',
      'PBR_BASE_COLOR_TEXTURE_EMBEDDED',
      'NODE_TRS_OR_MATRIX',
    ],
    warnings,
    structural_summary:{...s},
    boundary:'Preview eligibility means PixelForge has enough supported structure to attempt a local WebGL2 render. It is not visual, performance, license, collision, or compatibility approval.',
  };
}

export function buildPreviewReceipt(plan, runtimeReport) {
  const rendered=plan?.eligible === true && runtimeReport?.status === 'RENDERED' && Number(runtimeReport?.drawn_primitives || 0) > 0;
  return {
    schema:'pixelforge.native-3d-preview-receipt.v1',
    rendered,
    status:rendered?'PREVIEW_RENDERED_VISUAL_REVIEW_PENDING':'PREVIEW_RENDER_FAIL',
    renderer:plan?.renderer || null,
    drawn_primitives:Number(runtimeReport?.drawn_primitives || 0),
    skipped_primitives:Number(runtimeReport?.skipped_primitives || 0),
    warnings:[...(plan?.warnings || []),...(runtimeReport?.warnings || [])],
    boundary:'A rendered preview proves supported geometry reached the PixelForge WebGL2 viewport. It does not grant source compatibility PASS, material parity, collision, performance, license, or commercial approval.',
  };
}
