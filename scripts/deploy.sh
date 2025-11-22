#!/bin/bash
set -e  # Exit on any error

echo "🔨 Building project..."
npm run build

echo "📦 Copying GitHub Pages files..."
cp CNAME dist/CNAME
cp 404.html dist/404.html
echo '' > dist/.nojekyll

echo "✅ Verifying required files..."
if [ ! -f "dist/index.html" ]; then
  echo "❌ Error: dist/index.html not found!"
  exit 1
fi
if [ ! -f "dist/CNAME" ]; then
  echo "❌ Error: dist/CNAME not found!"
  exit 1
fi
if [ ! -f "dist/404.html" ]; then
  echo "❌ Error: dist/404.html not found!"
  exit 1
fi
if [ ! -f "dist/.nojekyll" ]; then
  echo "❌ Error: dist/.nojekyll not found!"
  exit 1
fi

echo "🚀 Deploying to GitHub Pages..."
npx gh-pages -d dist

echo "✅ Deployment complete!"

