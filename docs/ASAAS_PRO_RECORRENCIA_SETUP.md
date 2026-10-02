# Editalume Pro — recorrência Asaas × Supabase
_Checkpoint técnico: 02/10/2026. Homologação: funções implantadas, cobranças comerciais **bloqueadas** até QA e autorização do proprietário._

## Entregue (verificável)

- Tabelas backend `editalume_billing_intents`, `editalume_asaas_subscriptions`, campos adicionais no ledger existente e `editalume_entitlements.billing_source`, adicionados com migrações do Supabase; acesso público e de usuários autenticados às novas tabelas **revogado**; RLS ativo.
- Edge Functions implantadas: `editalume-pro-billing-intent[-sandbox]` e `editalume-pro-billing-webhook[-sandbox]`. Login é conferido diretamente pelo Supabase Auth e exige e-mail verificado. Webhook exige **token independente** e reconsulta a API do Asaas. As versões sandbox jamais alteram `editalume_entitlements`.
- O cliente deve **entrar no Editalume e registrar a intenção antes de abrir o link recorrente**, usando o mesmo e-mail na compra. O checkout existente é uma URL pública genérica: acesso direto fora dessa etapa não pode ser associado à conta automaticamente com segurança.
- O webhook reconcilia eventos, ID do link Pro, valor de R$ 49,90, ciclo mensal, cliente/assinatura, recibos confirmados e validade paga. Eventos repetidos e fora de ordem recomputam a situação a partir da API, sem conceder acesso só com o retorno do navegador ou `SUBSCRIPTION_CREATED`.
- A página de conta mantém o botão de assinatura **oculto** enquanto o backend não confirmar que o lançamento está habilitado.

## Como desbloquear a homologação SEM dinheiro real

1. No **Asaas Sandbox**, tenha uma conta de teste e crie **outro** link de pagamento com `chargeType=RECURRENT`, `subscriptionCycle=MONTHLY`, valor exato R$ 49,90. Guarde a URL de teste e o **ID da API** desse link (não confundir com a parte final da URL). Os links de produção já fornecidos **não servem para o sandbox**.
2. Em [Supabase — Edge Function Secrets](https://supabase.com/dashboard/project/jhxhbgprjqppzfrjdfvj/settings/functions), cadastre as seguintes variáveis **no painel, sem colar valores no GitHub, em mensagens ou no site**:
   - `ASAAS_SANDBOX_API_KEY` = chave da API sandbox (diferente da de produção);
   - `ASAAS_SANDBOX_WEBHOOK_TOKEN` = segredo aleatório separado, com pelo menos 32 caracteres;
   - `ASAAS_SANDBOX_PRO_PAYMENT_LINK_ID` = ID que a API retorna para o novo link recorrente sandbox;
   - `ASAAS_SANDBOX_PRO_LINK_URL` = URL pública **sandbox** do link criado.
3. No painel **Asaas Sandbox > Integrações > Webhooks**, configure:
   - URL: `https://jhxhbgprjqppzfrjdfvj.supabase.co/functions/v1/editalume-pro-billing-webhook-sandbox`
   - Token de autenticação: exatamente o `ASAAS_SANDBOX_WEBHOOK_TOKEN` cadastrado no Supabase, **nunca a API Key**.
   - Eventos: `PAYMENT_CREATED`, `PAYMENT_UPDATED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `PAYMENT_DELETED`, `SUBSCRIPTION_CREATED`, `SUBSCRIPTION_UPDATED`, `SUBSCRIPTION_INACTIVATED`, `SUBSCRIPTION_DELETED`. Use entrega sequencial se o painel disponibilizar.
4. Entrar numa **conta de teste do Editalume com e-mail confirmado**. A equipe pode então chamar o endpoint autenticado `/editalume-pro-billing-intent-sandbox` com a sessão de teste (NÃO inserir a senha ou JWT em mensagens) e seguir para o link sandbox. O sandbox permite verificar correspondência por e-mail, primeira cobrança, renovação, atraso, estorno, cancelamento e eventos duplicados.
5. Critérios mínimos para aprovado: ledger em `processing_state='processed'`; associação ao ID e e-mail corretos; `period_until` só preenchido após pagamento realmente confirmado; compra individual ou assinatura de outro link nunca criam associação Pro; sandbox não altera conta premium real. **Não simular uma compra real para testar.**

## Preparação da produção — não ligar antes da autorização explícita

- O link oficial mensal atual é `https://www.asaas.com/000/c/nruxbdhrq24sn9db`; o individual é `https://www.asaas.com/000/c/7ea8eja903t5z4wr`. Nunca usá-los indistintamente.
- Na **conta de produção do Asaas**, o ID do link Pro pode ser consultado em `GET /v3/paymentLinks?name=Editalume%20Pro`. Selecionar o registro cuja URL coincide **exatamente** com o link oficial e conferir `chargeType=RECURRENT`, `subscriptionCycle=MONTHLY`, valor R$ 49,90. Não copiar ID de outro link.
- No painel de segredos Supabase, configurar `ASAAS_LIVE_API_KEY`, `ASAAS_LIVE_WEBHOOK_TOKEN` (outro segredo independente, mínimo 32 caracteres) e `ASAAS_LIVE_PRO_PAYMENT_LINK_ID`.
- Criar webhook de **produção** no Asaas com os mesmos eventos acima e URL:
  `https://jhxhbgprjqppzfrjdfvj.supabase.co/functions/v1/editalume-pro-billing-webhook`.
- `ASAAS_LIVE_QA_APPROVED` e `ASAAS_LIVE_LAUNCH_ENABLED` devem permanecer **ausentes/false** até haver relatório de testes reais autorizado, revisão das condições comerciais e confirmação expressa do proprietário. A ativação comercial exige ambas configuradas como `true`. Quando a assinatura aparece no site, o backend ainda reconsulta a API do Asaas para garantir URL, valor e periodicidade corretos.
- Antes de ligar, conferir no Asaas a identidade pública, a URL oficial do Editalume e a descrição sem repetição/formatação incorreta. Publicar termos de cancelamento/expiração, política de privacidade e caminho de suporte.
- **Importante:** assinantes que acessarem o link genérico por fora do fluxo de login poderão ficar sem associação automática. Manter atendimento manual de reconciliação por comprovante conferido pelo painel do Asaas enquanto o fluxo externo circular. Não enviar campanhas convidando a comprar diretamente pelo link genérico.

## Pendências operacionais ainda não realizadas

- Chaves e tokens do Asaas não estão disponíveis nas ferramentas conectadas. Precisam ser inseridos pelo proprietário **diretamente nos painéis**; não assumir que as variáveis já existem.
- Não existe teste completo de pagamento sandbox, portanto as funções estão em homologação, **não aprovadas como sistema de cobrança ativo**.
- Adicionar rotina periódica autenticada de reconciliação para alertar eventos não processados e permitir recuperação de falhas prolongadas; o webhook já solicita repetição com HTTP 503 em erros transitórios.
- O cancelamento será solicitado ao suporte até ser criado um fluxo self-service. Uma inativação no Asaas não é equivalente a devolução de cobranças já geradas. Especificar condições de cancelamento antes da venda.
- Confirmar duas contas reais (Free/Pro autorizado) e validar limites RLS, CSV e expiração em ambiente controlado.

### Referências técnicas oficiais

- https://docs.asaas.com/reference/listar-links-de-pagamentos
- https://docs.asaas.com/docs/sobre-os-webhooks
- https://docs.asaas.com/docs/eventos-para-assinaturas
- https://docs.asaas.com/reference/listar-cobrancas-de-uma-assinatura
