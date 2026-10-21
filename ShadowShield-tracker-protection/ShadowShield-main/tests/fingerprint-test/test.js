console.log("Fingerprint test started.");

console.log("Screen:", {
    width: screen.width,
    height: screen.height,
    colorDepth: screen.colorDepth
});

console.log("Navigator:", {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory
});

console.log(
    "Timezone:",
    Intl.DateTimeFormat().resolvedOptions().timeZone
);

// Canvas fingerprinting
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

ctx.textBaseline = "top";
ctx.font = "16px Arial";
ctx.fillText("ShadowShield fingerprint test", 10, 10);

console.log("Canvas fingerprint:", canvas.toDataURL());

// WebGL fingerprinting
const gl = document.createElement("canvas").getContext("webgl");

if (gl) {
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");

    console.log("WebGL vendor:", debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
        : "Unavailable");

    console.log("WebGL renderer:", debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        : "Unavailable");
}
// Audio fingerprinting
const audioContext = new AudioContext();

console.log("AudioContext created:", audioContext.state);

const oscillator = audioContext.createOscillator();
const analyser = audioContext.createAnalyser();

oscillator.connect(analyser);

console.log("Audio analyser created:", analyser);

oscillator.start();
oscillator.stop();

audioContext.close();