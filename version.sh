#!/bin/bash

# Script de versionamento automático
# Uso: ./version.sh [tipo]
# tipo: patch (1.0.1), minor (1.1.0), major (2.0.0)

TIPO=${1:-patch}  # Default: patch

# Arquivo de versão
VERSION_FILE="version.json"
HTML_FILE="index.html"

# Ler versão atual
if [ -f "$VERSION_FILE" ]; then
    VERSION=$(cat $VERSION_FILE)
else
    VERSION="1.0.0"
fi

# Separar versão
IFS='.' read -ra PARTS <<< "$VERSION"
MAJOR=${PARTS[0]}
MINOR=${PARTS[1]}
PATCH=${PARTS[2]}

# Incrementar versão
case $TIPO in
    "patch")
        PATCH=$((PATCH + 1))
        ;;
    "minor")
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    "major")
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    *)
        echo "Uso: $0 [patch|minor|major]"
        exit 1
        ;;
esac

# Nova versão
NEW_VERSION="$MAJOR.$MINOR.$PATCH"

# Atualizar arquivo de versão
echo $NEW_VERSION > $VERSION_FILE

# Atualizar HTML
sed -i "s/v[0-9]\+\.[0-9]\+\.[0-9]\+/v$NEW_VERSION/g" $HTML_FILE

# Git commit e push
git add .
git commit -m "v$NEW_VERSION: Atualização automática de versão"
git push origin main

echo "✅ Versão atualizada: v$NEW_VERSION"
echo "📝 Commit criado e push enviado"
