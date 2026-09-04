-- Reexibição do link/QR de acesso do convite (docs/PRODUCT.md, seção 5.2:
-- "gerar link/QR de acesso e reenviar sem invalidar o já compartilhado").
--
-- Até aqui só o `codigo_hash` (SHA-256) era gravado, então o código em texto
-- plano existia apenas na resposta do POST que o criou. Consequência: para
-- reenviar um convite, o casal precisava gerar um novo link — e gerar revoga
-- o anterior (índice único parcial credenciais_acesso_convite_convite_ativo_key),
-- o que inutiliza silenciosamente um QR já impresso e despachado, ou a cópia
-- do link que outro convidado do mesmo convite ainda tinha.
--
-- Esta coluna guarda o mesmo código cifrado (AES-256-GCM, chave só no
-- ambiente do servidor — server/utils/token-cipher.ts), exclusivamente para
-- o painel reexibir o link/QR ao membro autenticado do casamento. O
-- `codigo_hash` continua sendo a única coisa consultada para AUTENTICAR o
-- convidado (resolveGuestToken) — a cifra nunca autentica.
--
-- Fica nula nas credenciais criadas antes desta migration: elas continuam
-- válidas e funcionando, só não são reexibíveis (a API devolve `code: null` e
-- o painel explica que é preciso gerar um novo link).

alter table credenciais_acesso_convite
  add column codigo_cifrado text;

comment on column credenciais_acesso_convite.codigo_cifrado is
  'Código de acesso cifrado (AES-256-GCM; formato iv:tag:ciphertext em base64) para reexibição do link/QR no painel. Nulo em credenciais anteriores à coluna. Nunca usado para autenticar — a comparação é sempre por codigo_hash.';
