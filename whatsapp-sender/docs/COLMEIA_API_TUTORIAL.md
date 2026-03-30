# Tutorial: Integração com a API Colmeia

## Visão Geral

Este documento explica como o sistema WhatsApp Sender se integra com a API Colmeia para envio de mensagens via WhatsApp Business.

---

## 1. O que é a API Colmeia?

A Colmeia é uma plataforma de comunicação que atua como intermediária entre nossa aplicação e a API oficial do WhatsApp Business (Meta).

### Fluxo de Envio de Mensagem

```
Nossa Aplicação → API Colmeia → WhatsApp Business API (Meta) → WhatsApp do Paciente
```

### Por que usar a Colmeia?

- **Templates aprovados pela Meta**: A Colmeia gerencia os templates que precisam ser aprovados pela Meta
- **Autenticação simplificada**: Token de acesso com refresh automático
- **Múltiplos hospitais**: Cada hospital pode ter sua própria configuração (socialNetworkId)

---

## 2. Conceitos Fundamentais

### 2.1 Social Network ID

Identificador único de cada "conta" na Colmeia. Cada hospital tem o seu próprio:

| Hospital | Social Network ID |
|----------|-------------------|
| HECAD | `oFzvyMeL6e8ALfPc4DPQlCNTwWhuU9` |
| CRER | `K36LwFWX0tIrMjmRm643PqLSziJ9pU` |
| HDS | `SHieySEXmlspZdFQ31Dd7bEuqkSUHr` |
| HUGOL | `riOMRFeqi2QEwz3QT0PVQEK8YbtTle` |

### 2.2 Token ID

Chave de autenticação específica de cada hospital. Usado para gerar tokens de acesso temporários.

### 2.3 Campaign Action ID

Identificador do template/campanha criado na plataforma Colmeia. Cada template de mensagem tem um ID único de 28-32 caracteres.

**Exemplo**: `zKpxC7wd1XY13OmYiRXHei4SjI5IyK`

### 2.4 Parâmetros do Template

Variáveis dinâmicas dentro do template. Por exemplo, um template de confirmação de consulta pode ter:
- `Nome` - Nome do paciente
- `Data` - Data da consulta
- `Especialidade` - Especialidade médica

**IMPORTANTE**: Os nomes dos parâmetros são **case-sensitive** (diferencia maiúsculas/minúsculas).

---

## 3. Fluxo de Autenticação

### 3.1 Geração de Token

```
POST https://api.colmeia.me/v1/rest/generate-token
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "idSocialNetwork": "oFzvyMeL6e8ALfPc4DPQlCNTwWhuU9"
}
```

**Body:**
```json
{
  "idTokenToRefresh": "TOKEN_ID_DO_HOSPITAL",
  "email": "email@configurado.com",
  "password": "HASH_SHA256_DA_SENHA"
}
```

**Resposta (201 Created):**
```json
{
  "token": "DVco0FS0ZDSwOzQhKMUxqy0ntn9ZQZUXSPUYV8jCL3cnXp2iVV"
}
```

### 3.2 Observações sobre o Token

- **Validade**: 1 hora
- **Cache**: Armazenamos por 55 minutos para evitar expiração durante uso
- **Refresh**: Automático quando expira
- **Por hospital**: Cada socialNetworkId tem seu próprio cache de token

---

## 4. Envio de Mensagens

### 4.1 Endpoint de Envio

```
POST https://api.colmeia.me/v1/rest/marketing-send-campaign
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "TOKEN_GERADO",
  "idSocialNetwork": "oFzvyMeL6e8ALfPc4DPQlCNTwWhuU9"
}
```

**Body:**
```json
{
  "idCampaignAction": "zKpxC7wd1XY13OmYiRXHei4SjI5IyK",
  "contactList": [
    {
      "Celular": "5562999999999",
      "Nome": "João Silva",
      "Data": "15/01/2024",
      "Especialidade": "Cardiologia"
    }
  ]
}
```

### 4.2 Resposta de Sucesso (201 Created)

```json
{
  "contactsWithErrors": [],
  "contactsSentSuccessLength": 1
}
```

### 4.3 Resposta com Erros de Parâmetros

```json
{
  "contactsWithErrors": [
    {
      "errorDescription": "Parameter mismatch",
      "contact": {
        "Celular": "5562999999999",
        "nome": "João"
      },
      "metadata": ["Nome", "Data", "Especialidade"],
      "isEmptyRowOrInvalidFields": true
    }
  ],
  "contactsSentSuccessLength": 0
}
```

---

## 5. Formato do Número de Telefone

### 5.1 Formato Aceito

O número deve estar no formato internacional brasileiro:

```
55 + DDD + Número
```

**Exemplos válidos:**
- `5562999887766` (13 dígitos - celular com 9)
- `556299887766` (12 dígitos - celular antigo ou fixo)

### 5.2 Validações Implementadas

| Validação | Resultado |
|-----------|-----------|
| DDD inválido (ex: 00, 30) | Bloqueado |
| Dígitos repetidos (ex: 111111111) | Bloqueado |
| Sequência numérica (ex: 123456789) | Bloqueado |
| Celular 9 dígitos sem começar com 9 | Aviso (enviado com ressalva) |
| Tamanho incorreto | Bloqueado |

---

## 6. Configuração de Variáveis de Ambiente

```env
# Credenciais gerais (usadas para autenticação)
VITE_COLMEIA_EMAIL=email@empresa.com
VITE_COLMEIA_PASSWORD=senha_em_texto_plano

# Token ID padrão (HECAD)
VITE_COLMEIA_TOKEN_ID=cwbChwILZ6y8OAg9h0bdrZcNADELcrs6

# Social Network ID padrão (HECAD)
VITE_COLMEIA_SOCIAL_NETWORK_ID=oFzvyMeL6e8ALfPc4DPQlCNTwWhuU9

# Campaign Action ID padrão
VITE_COLMEIA_CAMPAIGN_ACTION_ID=id_da_campanha_padrao
```

**Nota**: Os Token IDs dos outros hospitais estão configurados diretamente no código em `src/types/index.ts`.

---

## 7. Estrutura do Código

### 7.1 Arquivos Principais

```
src/
├── services/
│   └── whatsappService.ts    # Integração com API Colmeia
├── types/
│   └── index.ts              # Configuração dos hospitais (HOSPITALS)
├── pages/
│   ├── IndividualSendingPage.tsx  # Envio individual
│   └── BulkSendingPage.tsx        # Envio em massa
└── utils/
    └── csvParser.ts          # Parser de CSV para envio em massa
```

### 7.2 Fluxo de Código Simplificado

```typescript
// 1. Usuário preenche o formulário
const phone = "62999887766";
const parameters = { Nome: "João", Data: "15/01" };

// 2. Validação do telefone
const validation = whatsappService.validatePhone(phone);

// 3. Envio via serviço
const result = await whatsappService.sendIndividual({
  phone,
  templateId: "uuid-do-template",
  parameters,
  hospitalId: "hecad",
  campaignActionId: "zKpxC7wd1XY13OmYiRXHei4SjI5IyK"
});

// 4. Verificação do resultado
if (result.success) {
  // Salvar no histórico
} else {
  // Mostrar erro: result.message
}
```

---

## 8. Tratamento de Erros

### 8.1 Tipos de Erro

| Tipo | Descrição | Ação |
|------|-----------|------|
| `invalid_campaign` | ID da campanha inválido | Verificar configuração do template |
| `parameter_mismatch` | Nomes dos parâmetros não correspondem | Corrigir case-sensitivity |
| `missing_parameter` | Parâmetro obrigatório faltando | Adicionar parâmetro no template |
| `invalid_phone` | Número de telefone inválido | Corrigir formato do número |
| `api_error` | Erro genérico da API | Verificar logs |
| `network_error` | Erro de conexão | Verificar internet/firewall |

### 8.2 Exemplo de Tratamento

```typescript
if (result.errorType === 'parameter_mismatch') {
  console.log('Esperados:', result.errorDetails?.expectedParams);
  console.log('Recebidos:', result.errorDetails?.receivedParams);
}
```

---

## 9. Adicionando um Novo Hospital

### Passo 1: Adicionar configuração em `src/types/index.ts`

```typescript
export const HOSPITALS: HospitalConfig[] = [
  // ... hospitais existentes
  {
    id: "novo_hospital",
    name: "Novo Hospital",
    socialNetworkId: "ID_FORNECIDO_PELA_COLMEIA",
    tokenId: "TOKEN_ID_FORNECIDO",
  },
];
```

### Passo 2: Testar autenticação

Verificar no console se o token é gerado corretamente para o novo hospital.

### Passo 3: Criar templates

Criar templates na interface e associar ao novo hospital com o Campaign Action ID correto.

---

## 10. Logs e Debug

### Logs no Console

O serviço emite logs detalhados:

```
[Colmeia] Sending message to: 5562999887766 with params: {...}
[Colmeia] Sending campaign to 1 contacts
[Colmeia] Using socialNetworkId: oFzvyMeL6e8ALfPc4DPQlCNTwWhuU9
[Colmeia] Using campaignActionId: zKpxC7wd1XY13OmYiRXHei4SjI5IyK
[Colmeia] Response: 201 {"contactsWithErrors":[],"contactsSentSuccessLength":1}
```

### Forçar Refresh de Token

```typescript
await whatsappService.refreshToken("hecad");
```

---

# 10 Perguntas Frequentes da Equipe

## Nível Básico

### 1. O que acontece quando envio uma mensagem?

**Resposta**: O fluxo é:
1. Validamos o número de telefone localmente
2. Geramos/recuperamos um token de autenticação para o hospital
3. Enviamos a requisição POST para `marketing-send-campaign`
4. A Colmeia enfileira a mensagem e envia para a API do WhatsApp
5. A mensagem chega no celular do destinatário

**Importante**: A resposta "201 Success" da API não garante que a mensagem foi entregue - apenas que foi aceita para processamento. Se o número não existir no WhatsApp, a mensagem simplesmente não será entregue, mas não receberemos erro.

---

### 2. Por que preciso de um Campaign Action ID para cada template?

**Resposta**: O Campaign Action ID é o identificador do template na plataforma Colmeia. Cada template:
- Tem texto e parâmetros específicos
- Precisa ser aprovado pela Meta (WhatsApp)
- Tem um ID único gerado pela Colmeia

Você cria o template na interface da Colmeia, aguarda aprovação da Meta, e então usa o ID no nosso sistema.

---

### 3. O que significa "Sucesso com ressalva" no histórico?

**Resposta**: Significa que a mensagem foi enviada para a API, mas há indícios de que pode não ser entregue. Exemplos:
- Número de celular com 9 dígitos que não começa com 9
- DDD que não reconhecemos como padrão

A mensagem foi aceita pela Colmeia, mas pode falhar na entrega final se o número não existir no WhatsApp.

---

## Nível Intermediário

### 4. Como funciona a autenticação com múltiplos hospitais?

**Resposta**: Cada hospital tem:
- **socialNetworkId**: Identifica a "conta" do hospital na Colmeia
- **tokenId**: Chave para gerar tokens de acesso

O sistema mantém um cache de tokens por hospital:

```typescript
const tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();
```

Quando enviamos para o HECAD, usamos o token do HECAD. Quando enviamos para o CRER, usamos outro token. Cada um é independente.

---

### 5. Por que os parâmetros são case-sensitive?

**Resposta**: A API da Colmeia faz match exato dos nomes dos parâmetros. Se o template espera `Nome` e você envia `nome`, a API retorna erro.

O erro vem assim:
```json
{
  "metadata": ["Nome", "Data"],  // Esperados (do template Colmeia)
  "contact": { "nome": "João", "data": "15/01" }  // Enviados (errado!)
}
```

Por isso salvamos o nome exato do parâmetro no cadastro do template e usamos esse nome ao enviar.

---

### 6. Como adicionar suporte para mais de 12 parâmetros?

**Resposta**: Atualmente o sistema suporta até 12 parâmetros. Para aumentar:

1. **Tipos** (`src/types/index.ts`):
   - Adicionar `parameter_13`, `parameter_14`, etc. nas interfaces

2. **Formulário** (`src/components/templates/TemplateForm.tsx`):
   - Expandir `PARAMETER_LABELS` array
   - Expandir `parameterFields` array
   - Atualizar `getVisibleParameters()`

3. **Serviços** (`src/services/templateService.ts`):
   - Adicionar nos métodos `create()`, `update()`, `getParameters()`

4. **Páginas de Envio**:
   - Atualizar mapeamento de parâmetros no envio

5. **CSV Parser** (`src/utils/csvParser.ts`):
   - Adicionar parsing das colunas extras

6. **Banco de Dados**:
   - Criar migration para adicionar colunas

---

## Nível Avançado

### 7. Como funciona a validação de telefone e por que não bloqueamos números inexistentes?

**Resposta**:

**O que validamos localmente:**
- Formato (DDI 55 + DDD + número)
- DDD válido (lista da ANATEL)
- Padrões obviamente falsos (111111111, 123456789)

**O que NÃO conseguimos validar:**
- Se o número existe no WhatsApp

A API do WhatsApp/Colmeia **não oferece** endpoint de validação de número. O fluxo é:
1. Enviamos a mensagem
2. A Colmeia aceita (retorna 201)
3. A Colmeia tenta entregar ao WhatsApp
4. Se o número não existir, a mensagem "morre" silenciosamente

**Por que é assim?** Privacidade. A Meta não permite consultar se um número está no WhatsApp sem enviar mensagem.

---

### 8. Como implementar webhook para receber status de entrega?

**Resposta**: A Colmeia suporta webhooks, mas não está implementado no sistema atual. Para implementar:

1. **Criar endpoint no backend** (precisaria de um servidor Node.js/API):
```typescript
app.post('/webhook/colmeia', (req, res) => {
  const { messageId, status, phone } = req.body;
  // Atualizar status no banco de dados
});
```

2. **Configurar webhook na Colmeia**:
   - Acessar painel administrativo da Colmeia
   - Configurar URL de callback

3. **Atualizar modelo de dados**:
   - Adicionar campo `delivery_status` na tabela `sending_history`
   - Criar nova tabela para eventos de delivery

**Nota**: Isso requer infraestrutura de backend. O sistema atual é frontend-only com Supabase.

---

### 9. Como funciona o hash SHA-256 da senha?

**Resposta**: A API Colmeia exige que a senha seja enviada como hash SHA-256 em hexadecimal maiúsculo.

```typescript
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex.toUpperCase();  // IMPORTANTE: maiúsculo
}
```

**Exemplo:**
- Senha: `minhasenha123`
- Hash: `A1B2C3D4E5F6...` (64 caracteres hexadecimais)

Usamos `crypto.subtle` que é nativo do browser (Web Crypto API).

---

### 10. Como escalar o sistema para enviar milhares de mensagens?

**Resposta**: O sistema atual envia uma mensagem por vez. Para escalar:

**Opção A - Batch na API Colmeia:**
A API aceita múltiplos contatos em `contactList`. Podemos enviar até ~100 por request:
```typescript
const result = await sendCampaign([
  { Celular: "5562999999999", Nome: "João" },
  { Celular: "5562888888888", Nome: "Maria" },
  // ... até ~100
]);
```

**Opção B - Processamento em background:**
1. Criar tabela de fila no Supabase
2. Usar Supabase Edge Functions para processar
3. Worker processa em batches de 100

**Opção C - Rate limiting:**
Implementar controle de rate:
```typescript
const RATE_LIMIT = 100; // mensagens por minuto
const BATCH_SIZE = 10;
const DELAY_MS = 600; // 100ms entre mensagens
```

**Limitações conhecidas:**
- WhatsApp Business tem limite de ~1000 mensagens/dia por número novo
- Templates de marketing têm limites mais restritivos
- A Colmeia pode ter rate limits próprios (verificar contrato)

**Recomendação atual:** Para disparos grandes (>200), dividir em lotes e processar ao longo do dia.

---

## Resumo de Boas Práticas

1. **Sempre validar telefone** antes de enviar
2. **Usar nomes de parâmetros exatos** (case-sensitive)
3. **Verificar configuração do template** antes de usar
4. **Monitorar logs** durante testes
5. **Testar com número próprio** antes de disparos em massa
6. **Não confiar apenas no 201** - a entrega é assíncrona
7. **Manter Token IDs seguros** - são credenciais de acesso
