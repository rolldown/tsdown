## index.cjs

```cjs
var cac = require("cac");
Object.keys(cac).forEach(function(k) {
	if (k !== "default" && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
		enumerable: true,
		get: function() {
			return cac[k];
		}
	});
});

```
