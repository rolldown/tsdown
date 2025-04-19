# docs:generate

echo "📚 Generating reference..."

# Generate API documentation
./node_modules/.bin/typedoc --tsconfig tsconfig.json > /dev/null 2>&1

echo "✅ Reference generated successfully!"

echo "📚 Beautifying reference structure..."

# Move Options.md to ./docs/reference
mv ./docs/reference/api/interfaces/Options.md ./docs/reference/config-options.md

# Remove the api folder
rm -rf ./docs/reference/api

# in config-options.md, remove 6 first lines
sed -i '' '1,6d' ./docs/reference/config-options.md

echo "✅ Reference structure beautified successfully!"
