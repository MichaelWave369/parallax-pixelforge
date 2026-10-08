// v5.43: metadata validation for browser-private thumbnail files.
// Images are user-selected local files, never fetched from the network.
export const THUMBNAIL_MAX_FILES=400;
export const THUMBNAIL_MAX_FILE_BYTES=2_000_000;
export const THUMBNAIL_MAX_TOTAL_BYTES=64_000_000;
export const THUMBNAIL_MAX_DIMENSION=1600;
const names=/^(ASSET-[0-9]{6})\.(png|jpe?g|webp)$/i;
const MIME={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};
export function validateThumbnailFiles(files,ids) {
  if(!Array.isArray(files)||files.length===0||files.length>THUMBNAIL_MAX_FILES||
    !(ids instanceof Set))throw Error('Choose 1-400 local thumbnails after opening a catalog.');
  const seen=new Set(),result=[];
  let total=0;
  for(const file of files){
    const matched=names.exec(file?.name||'');
    if(!matched)throw Error('Thumbnail names must be ASSET-000000.png/.jpg/.webp.');
    const id=matched[1].toUpperCase(),ext=matched[2].toLowerCase();
    if(!ids.has(id))throw Error('Thumbnail does not match an asset in this catalog: '+id);
    if(seen.has(id))throw Error('Duplicate thumbnail for '+id);
    if(file.type!==MIME[ext]||
       !Number.isSafeInteger(file.size)||file.size<20||file.size>THUMBNAIL_MAX_FILE_BYTES)
      throw Error('Thumbnail MIME or size outside safe bounds: '+id);
    total+=file.size;
    if(total>THUMBNAIL_MAX_TOTAL_BYTES)throw Error('Private thumbnail memory budget exceeded.');
    seen.add(id);
    result.push({id,file});
  }
  return result;
}
export async function loadPrivateThumbnailUrls(files,ids) {
  const pairs=validateThumbnailFiles(files,ids);
  const entries=new Map();
  try {
    for(const {id,file} of pairs) {
      // Actual decode catches mislabeled garbage. Never interpret image source as markup.
      const bitmap=await createImageBitmap(file);
      try {
        if(bitmap.width<1||bitmap.height<1||
          bitmap.width>THUMBNAIL_MAX_DIMENSION||bitmap.height>THUMBNAIL_MAX_DIMENSION)
          throw Error('Decoded thumbnail too large: '+id);
      } finally {bitmap.close?.();}
      entries.set(id,URL.createObjectURL(file));
    }
    return entries;
  }catch(error){
    revokeThumbnailUrls(entries);
    throw error;
  }
}
export function revokeThumbnailUrls(entries){
  if(!(entries instanceof Map))return;
  for(const url of entries.values())URL.revokeObjectURL(url);
  entries.clear();
}
