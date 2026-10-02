# Editalume — links Asaas e liberação comercial
_Conferência pública dos checkouts: 02/10/2026. Os links abaixo já existem no Asaas. **Nenhum deles é integrado ao login do Editalume neste momento.** Este documento não cria cobranças nem contém credenciais._

## 1. Links públicos verificados

| Produto | Tipo exibido no Asaas | Preço | Link |
|---|---|---|---|
| **Editalume Pro** | **Editalume Pro**; frequência **mensal** | R$ 49,90/mês | https://www.asaas.com/000/c/nruxbdhrq24sn9db |
| **Editalume Sob Medida Individual** | **Editalume Sob Medida Individual**; pagamento único à vista | R$ 49,90 | https://www.asaas.com/000/c/7ea8eja903t5z4wr |

Em ambos os checkouts públicos foram observadas opções de boleto/Pix, cartão de crédito e Pix; confirmar a disponibilidade efetiva no painel antes da venda.

**Descrição atual verificada (02/10/2026):** o texto do Pro foi atualizado corretamente, incluindo filtros, exportação, buscas salvas, favoritos e ressalva dos alertas. **Restam problemas de formatação:** título e introdução duplicados e marcadores de lista com barras invertidas/asteriscos literais. Corrigir no Asaas em texto simples e conferir a página pública após salvar.

**Não divulgar esse checkout ainda:** webhook autenticado, reconciliação do pagamento e vínculo Asaas–Supabase não estão em produção. A página do site permanece em lista de interesse até concluir testes reais e autorização de lançamento. **Criar assinatura no Asaas NÃO confere automaticamente acesso Pro.**

## 2. Corrigir identificação pública do vendedor

- O checkout ainda apresenta dados do proprietário pessoa física. Verificar no painel a identificação comercial legalmente aplicável, evitando publicar dados pessoais em materiais promocionais.
- O endereço de website no checkout ainda remete ao radar pessoal de outro projeto; solicitar alteração para https://cipri-studios.github.io/editalume/ e reconferir ambos os links em sessão sem login.
- Conferir e-mail comercial de suporte e publicar condições do Pro: recursos disponíveis, ausência de alertas automáticos na fase atual, data de ativação, cobrança mensal, cancelamento e suporte.
- Não solicitar dados de cartão ou CPF por e-mail, chat ou planilha; Asaas trata os dados de pagamento.

## 3. Operação do Sob Medida Individual (fluxo de checkout direto)

1. O botão da seção Sob Medida leva diretamente ao link de compra única https://www.asaas.com/000/c/7ea8eja903t5z4wr. O site comunica escopo: até três oportunidades manualmente selecionadas **quando disponíveis na amostra**, sem garantia de oportunidade, contratação ou êxito.
2. Existe uma ação separada **Informar dados do pedido**, que abre uma mensagem para `cipristudios@gmail.com` com nome/empresa, e-mail usado no Asaas, atividade/categoria, municípios/UF e observações. O cliente deve voltar ao Editalume após pagar para preencher esse briefing; o Asaas pode não redirecioná-lo automaticamente enquanto o fluxo do painel não for configurado.
3. A equipe cruza a confirmação do pagamento **no painel do Asaas**, não por print, redirecionamento ou resposta declaratória. Não pedir dados do cartão. O serviço manual só é entregue após validação e alinhamento de prazo. Se não houver oportunidades pertinentes, comunicar prontamente o resultado e negociar encaminhamento com o comprador conforme as condições comerciais aplicáveis; definir e publicar termos de reembolso/cancelamento antes de intensificar vendas.
4. Se o cliente quiser confirmar o escopo antes de comprar, o link de consulta prévia por e-mail continua disponível. A compra individual **nunca** ativa o Pro. Pilotos gratuitos já prometidos são respeitados.
5. **Operação pendente no Asaas:** corrigir URL do vendedor (ainda aponta para projeto antigo) e validar identidade comercial. Em seguida, considerar configurar redirecionamento de pagamento aprovado para uma página de onboarding/briefing, sem interpretar o redirecionamento como comprovação de quitação.

## 4. Checklist para liberar assinatura Pro no site

- [ ] Descrição do link mensal corrigida, com funcionalidades reais e exclusão expressa de alertas automáticos nesta fase.
- [ ] Identidade e URL do vendedor verificadas nos dois checkouts.
- [ ] Termos de assinatura/cancelamento e contato de suporte publicados.
- [ ] Duas contas reais QA (Free e Pro de teste autorizado): autenticação, limites, favoritos, CSV e expiração.
- [ ] Identificação segura do usuário Supabase em fluxo de contratação (login antes do checkout, associação via backend, sem confiar no redirect como pagamento).
- [ ] Webhook autenticado do Asaas com evento idempotente, mapeamento do cliente/assinatura e reconciliação pelo Asaas antes de ativar ou renovar `editalume_entitlements`.
- [ ] Falhas, atraso, estorno, cancelamento, expiração e reconciliação manual testados no ambiente de testes.
- [ ] Autorização explícita do proprietário para expor link e receber pagamentos reais.

O link existe e está validado quanto a **nome e preço**, mas a integração recorrente com a plataforma e o início das vendas **não estão concluídos**.
