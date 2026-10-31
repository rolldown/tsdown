## index.mjs

```mjs
// button.module.css
const _key0 = "mod_button mod_clickable";
var button_module_default = { "button": "mod_button mod_clickable" };
// link.module.css
const _key0$1 = "mod_link mod_clickable";
var link_module_default = { "link": "mod_link mod_clickable" };
export { button_module_default as button, _key0 as buttonClass, link_module_default as link, _key0$1 as linkClass };

```

## style.css

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

.mod_link {
  color: #00f;
}

```
