## button-CkK1iDdp.css

```css
.mod_button {
  color: red;
}

.mod_clickable {
  cursor: pointer;

  &:is(:disabled, [aria-disabled]) {
    cursor: not-allowed;
  }
}

@media (hover: hover) {
  .mod_clickable:hover {
    opacity: .5;
  }
}

.mod_buttonExtra {
  color: green;
}

```

## button-CkK1iDdp.mjs

```mjs
// button.module.css
var button_module_default = { "button": "mod_button mod_clickable" };
// button-extra.module.css
var button_extra_module_default = { "buttonExtra": "mod_buttonExtra mod_clickable" };
export { button_module_default as button, button_extra_module_default as extra };

```

## index.mjs

```mjs
// index.ts
const button = () => import("./button-CkK1iDdp.mjs");
const link = () => import("./link-BYsF7oqG.mjs");
export { button, link };

```

## link-BYsF7oqG.css

```css
.mod_link {
  color: #00f;
}

.mod_clickable {
  cursor: pointer;

  &:is(:disabled, [aria-disabled]) {
    cursor: not-allowed;
  }
}

@media (hover: hover) {
  .mod_clickable:hover {
    opacity: .5;
  }
}

.mod_linkExtra {
  color: orange;
}

```

## link-BYsF7oqG.mjs

```mjs
// link.module.css
var link_module_default = { "link": "mod_link mod_clickable" };
// link-extra.module.css
var link_extra_module_default = { "linkExtra": "mod_linkExtra mod_clickable" };
export { link_extra_module_default as extra, link_module_default as link };

```
