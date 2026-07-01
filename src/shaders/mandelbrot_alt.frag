precision highp float;

varying vec2 vUv;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoom;
uniform float u_maxIter;
uniform float u_colorOffset;
uniform float u_colorShift;
uniform float u_hueShift;
uniform float u_saturation;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_time;
uniform vec3 u_paletteA;
uniform vec3 u_paletteB;
uniform vec3 u_paletteC;
uniform vec3 u_paletteD;
uniform float u_power;

// === common.glsl functions inlined for standalone compilation ===

float smoothColor(float iter, float zr, float zi, float maxIter) {
    float r2 = zr * zr + zi * zi;
    if (r2 <= 1.0) return iter;
    return iter + 1.0 - log2(log2(r2));
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

// === end common.glsl functions ===

void main() {
    float aspect = u_resolution.x / u_resolution.y;
    float cr = (vUv.x - 0.5) * 3.5 / u_zoom * aspect + u_center.x;
    float ci = (vUv.y - 0.5) * 2.0 / u_zoom + u_center.y;

    float zr = 0.0;
    float zi = 0.0;
    float iter = 0.0;
    float n = u_power;

    for (int i = 0; i < 500; i++) {
        if (i >= int(u_maxIter)) break;
        float r2 = zr * zr + zi * zi;
        if (r2 > 4.0) break;

        float r = sqrt(r2);
        float theta = atan(zi, zr);
        float rn = pow(r, n);
        float cosnt = cos(n * theta);
        float sinnt = sin(n * theta);

        float zrn = rn * cosnt;
        float zin = rn * sinnt;

        zr = zrn + cr;
        zi = zin + ci;
        iter += 1.0;
    }

    float smooth = smoothColor(iter, zr, zi, u_maxIter);

    if (iter >= u_maxIter - 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    float t = smooth / u_maxIter;
    t += u_colorOffset + u_colorShift;
    vec3 color = palette(t, u_paletteA, u_paletteB, u_paletteC, u_paletteD);

    vec3 hsv = rgb2hsv(color);
    hsv.x = fract(hsv.x + u_hueShift);
    hsv.y = clamp(hsv.y * u_saturation, 0.0, 1.0);
    hsv.z = clamp(hsv.z * u_brightness, 0.0, 1.0);
    color = hsv2rgb(hsv);

    color = (color - 0.5) * u_contrast + 0.5;
    color = clamp(color, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
}
