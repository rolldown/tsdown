## index.mjs

```mjs
// app.module.css
var app_module_default = { "fade": "scoped_fade" };
export { app_module_default as styles };

```

## style.css

```css
.global{color:red}:root{--fade-animation:fade-out 2s ease-in-out}.scoped_fade{animation:var(--fade-animation)}@keyframes fade-out{0%{opacity:1}to{opacity:0}}

```
