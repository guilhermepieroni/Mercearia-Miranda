# Mercearia Miranda — Site de Pedidos Online

Plataforma completa de pedidos para a Mercearia Miranda, com página de cervejas e painel admin integrado ao Firebase.

## Estrutura de arquivos

```
mercearia-miranda/
├── index.html          ← Mercearia geral (todos os produtos)
├── cervejas.html       ← Página de cervejas com promoções
├── admin.html          ← Painel admin (gerenciar produtos)
├── css/
│   ├── style.css       ← Estilos da mercearia geral
│   ├── cervejas.css    ← Estilos da página de cervejas
│   └── admin.css       ← Estilos do painel admin
├── js/
│   ├── data.js         ← Produtos e configurações padrão
│   ├── app.js          ← Lógica da mercearia geral
│   ├── cervejas.js     ← Lógica da página de cervejas
│   └── admin.js        ← Lógica do painel admin
└── img/
    └── logo.png        ← Logo da Mercearia Miranda
```

## Configuração inicial

### 1. Número do WhatsApp

Abra `js/app.js` e altere:
```js
const WHATSAPP_MERCEARIA = "5534999990000"; // 55 + DDD + número
```

Abra `js/cervejas.js` e altere:
```js
const WHATSAPP = "5534999990000";
```

### 2. Senha do painel admin

Abra `js/admin.js` e altere:
```js
const ADMIN_PASSWORD = "sua_senha_aqui";
```

### 3. Produtos da mercearia geral

Edite o array `DEFAULT_PRODUCTS` em `js/data.js`.

## Painel Admin (admin.html)

Acesse `admin.html` e entre com a senha configurada.

**Funcionalidades:**
- Adicionar, editar e excluir cervejas
- Upload de foto por produto
- Toggle disponível/indisponível (some do site instantaneamente)
- Estatísticas rápidas
- Integração Firebase (opcional)

## Firebase — sincronização em tempo real

Sem Firebase: alterações ficam salvas no navegador (localStorage).
Com Firebase: qualquer alteração no admin aparece no site dos clientes em tempo real.

**Para configurar:**
1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Crie um projeto → ative o **Firestore Database** em modo de teste
3. Acesse Configurações → Seus aplicativos → Web → copie as chaves
4. Abra `admin.html`, faça login e clique em **Configurar Firebase**
5. Cole as chaves e salve — pronto!

## Promoção Relâmpago (cervejas.html)

Funciona automaticamente:
- **Sexta e sábado**: 10% de desconto em todas as cervejas, preços atualizados automaticamente
- **Outros dias**: contador regressivo até a próxima promoção
- O desconto aparece no carrinho e na mensagem enviada ao WhatsApp

Para alterar o desconto, edite em `js/cervejas.js`:
```js
const FLASH_DISCOUNT = 0.10; // 10%
const FLASH_DAYS = [5, 6];   // 5=sexta, 6=sábado
```

## Como publicar no GitHub Pages

```bash
git init
git add .
git commit -m "primeiro commit"
git remote add origin https://github.com/SEU_USUARIO/mercearia-miranda.git
git push -u origin main
```

Em seguida: **Settings → Pages → Source: main → Save**

Site disponível em: `https://SEU_USUARIO.github.io/mercearia-miranda/`
