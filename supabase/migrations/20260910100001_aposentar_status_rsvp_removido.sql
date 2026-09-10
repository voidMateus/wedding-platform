-- `respostas_rsvp.status_rsvp = 'removido'` sai do vocabulário: era valor morto.
--
-- O achado (2026-09-10, ao desenhar o funil de estágios do convite): nada no
-- produto nunca gravou esse valor.
--
--   - "Remover do convite" não escreve resposta nenhuma — faz
--     `convidados.convite_id = null` (`invites/[id]/guests/[guestId].delete.ts`).
--   - O schema do RSVP público só aceita `confirmado`/`recusado`
--     (`rsvpGuestStatusSchema`).
--   - O fluxo do convidado já LIA `removido` como `pendente`
--     (`RsvpInviteFlow.vue`), o que confirma que ninguém o tratava como
--     resposta de verdade.
--
-- Ele veio do schema anterior ao rename para português (era `removed`) e
-- sobreviveu por inércia — aparecendo em seletor, em chip de filtro e no mapa
-- de tons como se fosse um estado alcançável.
--
-- POR QUE REMOVER, E NÃO SÓ ESCONDER: com o funil, `respondido` passou a
-- significar "todos os membros têm resposta", e a contagem da view considera
-- resposta tudo que não é `pendente`. Um `removido` gravado por acidente
-- contaria como resposta, e um convite sem ninguém confirmado passaria a dizer
-- "Respondido" — o pior desfecho possível para um estado que o produto nem
-- sabe produzir. Fechar o CHECK é o que torna isso impossível.
--
-- O UPDATE é defensivo, não corretivo: em dev não existe uma linha só com esse
-- valor (medido). Se prod tiver alguma, ela é dado legado sem significado — e
-- vira `pendente`, que é exatamente como a tela do convidado já a exibia. Sem
-- isso, o ALTER falharia contra dado existente e derrubaria a promoção de
-- migrations no merge.
update respostas_rsvp set status_rsvp = 'pendente' where status_rsvp = 'removido';

alter table respostas_rsvp drop constraint respostas_rsvp_status_rsvp_check;

alter table respostas_rsvp add constraint respostas_rsvp_status_rsvp_check
  check (status_rsvp in ('pendente', 'confirmado', 'recusado', 'lista_espera'));

-- `salvar_rsvp_convidado` continua com a lista antiga na própria validação, e
-- isso é deliberado: recriar a função inteira aqui só para tirar um item de um
-- `if` seria copiar cem linhas de corpo por nenhuma garantia nova. O CHECK
-- acima é o portão real — um `removido` que passe pela validação da função
-- morre na constraint —, e a camada de API já o recusa antes, no Zod
-- (`rsvpAdminStatusSchema`). A próxima migration que mexer na função ajusta a
-- lista de passagem.
comment on constraint respostas_rsvp_status_rsvp_check on respostas_rsvp is
  'Vocabulário de resposta de RSVP. `removido` foi aposentado em 2026-09-10 por ser valor morto (nada no produto o gravava) e por contar como resposta na consolidação do convite — ver docs/PRODUCT.md seção 5.2.';
