// Observation only. Does not modify zoom, permissions, media, or browser APIs.
export async function observeSurfaces() {
  const out={ua:navigator.userAgent,platform:navigator.platform,language:navigator.language,
    languages:Array.from(navigator.languages || []),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset:new Date().getTimezoneOffset(),webdriver:navigator.webdriver,
    touch:navigator.maxTouchPoints,hardwareConcurrency:navigator.hardwareConcurrency,
    deviceMemory:navigator.deviceMemory,screen:{width:screen.width,height:screen.height},
    viewport:{width:innerWidth,height:innerHeight},dpr:devicePixelRatio,
    visualViewport:globalThis.visualViewport ? {width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale}:null};
  try {
    const canvas=document.createElement('canvas');canvas.width=120;canvas.height=40;
    const c=canvas.getContext('2d');
    if(!c)throw new Error('Canvas context unavailable');
    c.fillStyle='#2563eb';c.fillRect(0,0,120,40);c.fillStyle='white';c.font='14px sans-serif';c.fillText('DOPPEL-X',10,24);
    const first=canvas.toDataURL(),second=canvas.toDataURL();
    out.canvas={status:'OK',stable:first===second && first.length>100,note:'Stability only, not authenticity.'};
  } catch(e){out.canvas={status:'UNKNOWN',errorType:e.name};}
  try {
    const c=document.createElement('canvas');const gl=c.getContext('webgl');const ext=gl?.getExtension('WEBGL_debug_renderer_info');
    out.graphics=gl && ext ? {status:'OK',vendor:gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),renderer:gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)}:{status:'UNKNOWN'};
  } catch(e){out.graphics={status:'UNKNOWN',errorType:e.name};}
  out.webrtc={status:'UNKNOWN',reason:'No comprehensive ICE or packet-level leak test in this measurement.'};
  return out;
}
