# Sistema de Versionamento Automático

## Como usar:

### Windows (recomendado):
```bash
# Pequenas correções (1.0.1 -> 1.0.2)
.\version.bat patch

# Novas funcionalidades (1.0.2 -> 1.1.0)
.\version.bat minor

# Grandes mudanças (1.1.0 -> 2.0.0)
.\version.bat major
```

### Linux/Mac:
```bash
# Pequenas correções (1.0.1 -> 1.0.2)
./version.sh patch

# Novas funcionalidades (1.0.2 -> 1.1.0)
./version.sh minor

# Grandes mudanças (1.1.0 -> 2.0.0)
./version.sh major
```

## O que o script faz:

1. ✅ Lê a versão atual do `version.json`
2. ✅ Incrementa automaticamente (patch/minor/major)
3. ✅ Atualiza o `index.html` com nova versão
4. ✅ Faz `git add .`
5. ✅ Faz `git commit` com mensagem formatada
6. ✅ Faz `git push origin main`

## Exemplo de saída:
```
✅ Versão atualizada: v1.0.2
📝 Commit criado e push enviado
```

## Tipos de versão:

- **patch**: Correções de bugs (1.0.1 → 1.0.2)
- **minor**: Novas funcionalidades (1.0.2 → 1.1.0)
- **major**: Mudanças quebram compatibilidade (1.1.0 → 2.0.0)

## Arquivos criados:

- `version.json` - Armazena versão atual
- `version.bat` - Script para Windows
- `version.sh` - Script para Linux/Mac
- `index.html` - Atualizado automaticamente

## Versão atual:
**v1.0.1**
