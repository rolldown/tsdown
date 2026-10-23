## index.mjs

```mjs
// app.module.css
var app_module_default = { "fade": "custom_fade" };
export { app_module_default as styles };

```

## style.css

```css
:root {
  --fade-animation: fade-out 2s ease-in-out;
}

.custom_fade {
  animation: var(--fade-animation);
}

@keyframes fade-out {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}

```
