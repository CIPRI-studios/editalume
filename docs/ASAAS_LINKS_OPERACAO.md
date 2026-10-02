# Editalume — links Asaas e liberação comercial
_Conferência pública dos checkouts: 02/10/2026. Os links abaixo já existem no Asaas. **Nenhum deles é integrado ao login do Editalume neste momento.** Este documento não cria cobranças nem contém credenciais._

## 1. Links públicos verificados

| Produto | Tipo exibido no Asaas | Preço | Link |
|---|---|---|---|
| **Editalume Pro** | **Editalume Pro**; frequência **mensal** | R$ 49,90/mês | https://www.asaas.com/000/c/nruxbdhrq24sn9db |
| **Editalume Sob Medida Individual** | **Editalume Sob Medida Individual**; pagamento único à vista | R$ 49,90 | https://www.asaas.com/000/c/7ea8eja903t5z4wr |

Em ambos os checkouts públicos foram observadas opções de boleto/Pix, cartão de crédito e Pix; confirmar a disponibilidade efetiva no painel antes da venda.

**Problema crítico de descrição:** embora o título do checkout mensal tenha sido corrigido para **Editalume Pro**, sua **descrição ainda diz "Relatório personalizado de oportunidades em licitações públicas"**. Essa entrega caracteriza o serviço humano Sob Medida, e não as ferramentas Pro. O proprietário deve editar a descrição do link mensal antes de divulgar. Sugestão segura enquanto não houver alertas:

> Acesso mensal às funcionalidades Editalume Pro: filtros avançados, busca e navegação ampliadas, exportação CSV de até 200 resultados, indicadores da amostra, três pesquisas salvas e até 200 favoritos, condicionado à confirmação do pagamento e à ativação da conta cadastrada. Base pública amostral e não exaustiva. Alertas automáticos por e-mail não incluídos nesta fase.

**Não divulgar esse checkout ainda:** webhook autenticado, reconciliação do pagamento e vínculo Asaas–Supabase não estão em produção. A página do site permanece em lista de interesse até concluir testes reais e autorização de lançamento. **Criar assinatura no Asaas NÃO confere automaticamente acesso Pro.**

## 2. Corrigir identificação pública do vendedor

- O checkout ainda apresenta dados do proprietário pessoa física. Verificar no painel a identificação comercial legalmente aplicável, evitando publicar dados pessoais em materiais promocionais.
- O endereço de website no checkout ainda remete ao radar pessoal de outro projeto; solicitar alteração para https://cipri-studios.github.io/editalume/ e reconferir ambos os links em sessão sem login.
- Conferir e-mail comercial de suporte e publicar condições do Pro: recursos disponíveis, ausência de alertas automáticos na fase atual, data de ativação, cobrança mensal, cancelamento e suporte.
- Não solicitar dados de cartão ou CPF por e-mail, chat ou planilha; Asaas trata os dados de pagamento.

## 3. Operação do Sob Medida Individual

1. Receber por e-mail empresa, categoria, municípios/UF e necessidade.
2. Analisar viabilidade na base: oferecer até três oportunidades pertinentes **quando disponíveis**, escopo, prazo e condições antes de cobrar.
3. Após aceite, enviar **somente** o link avulso https://www.asaas.com/000/c/7ea8eja903t5z4wr .
4. Confirmar quitação real no painel Asaas antes de entregar e anotar status mínimo no CRM. Não ativar Pro por esse pagamento.
5. Respeitar pilotos gratuitos já prometidos.

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
