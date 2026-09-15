import { invertHomography, projectPoint } from '../../src/features/campaignModes/cameraVision/boardHomography.js'
// Independent raster fixture in physical board millimetres.
export function syntheticBoard({width=320,height=480,h=[.65,0,160,0,.75,240,0,0,1],occlusions=[],sectors=true,bull=true,onlyTriple=false}={}) {
 const inverse=invertHomography(h),data=new Uint8ClampedArray(width*height*4)
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=projectPoint(inverse,{x,y}),radius=Math.hypot(p.x,p.y),angle=Math.atan2(p.y,p.x)
  const sector=Math.floor(((angle+Math.PI/2+Math.PI/20+Math.PI*2)%(Math.PI*2))/(Math.PI/10))
  let color=[20,23,25]
  if(radius<170) color=sectors?(sector%2?[220,218,203]:[30,32,35]):[180,180,180]
  if((radius>99&&radius<107)||(!onlyTriple&&radius>162&&radius<170))color=sector%2?[25,180,65]:[205,30,38]
  if(bull&&radius<15.9)color=radius<6.35?[210,25,35]:[20,170,60]
  if(occlusions.some(([cx,cy,r])=>Math.hypot(x-cx,y-cy)<r))color=[90,90,100]
  const i=(y*width+x)*4;data.set([...color,255],i)
 }
 return {width,height,data}
}
