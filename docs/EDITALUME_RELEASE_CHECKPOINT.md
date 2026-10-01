# Editalume — checkpoint técnico de lançamento

**Status: beta técnica para pilotos gratuitos.** Não iniciar assinaturas Pro pagas nem prometer alertas antes das verificações abaixo. Organização `CIPRI-studios`; repositório `CIPRI-studios/editalume`; site oficial temporário https://cipri-studios.github.io/editalume/. A compra de domínio foi adiada até os primeiros clientes.

## Implementado e protegido
- Grátis: busca básica por termo e UF, prévia de **5 resultados** por busca e **5 favoritos privados** na conta. Sem cadastro, até 3 novos favoritos no dispositivo; salvos antigos permanecem. Editais originais continuam públicos no PNCP.
- Pro verificado por entitlement real no Supabase: filtros por município, setor, prazo e valor; ordenação adicional, paginação de 12 por tela e até 60 por chamada, até **200 favoritos privados**, **3 pesquisas privadas salvas**, cinco indicadores agregados da amostra filtrada e **CSV autenticado de até 200 resultados** em páginas de 50.
- A prévia complementar estática de São Paulo também apresenta os filtros avançados apenas a Pro na interface. Os dados subjacentes PNCP são públicos; a exclusividade Pro se refere às ferramentas e conveniências, não à apropriação dos editais.
- Login por link de e-mail preservado; opção de criação/entrada por senha publicada, com testes automatizados. **Falta validar com contas reais nos navegadores dos usuários.**
- Valor planejado R$ 49,90/mês; checkout recorrente e e-mails diários **NÃO ativos**. A tabela de buscas bloqueia `alerts_enabled=true` até a entrega funcionar.

## Segurança de acesso (migrations)
- `editalume_server_verified_free_pro_search`: servidor ignora filtros especiais/offset para Free e limita a 5 resultados; só token de usuário com Pro ativo/verificado libera funcionalidades avançadas.
- `editalume_pro_saved_search_and_email_delivery_gate`: Free ou Pro expirado não cria/altera pesquisas privadas; até três para Pro; ninguém ativa alerta inoperante. Proprietários podem excluir pesquisas após expiração.
- `editalume_pro_filtered_sample_insights`: os agregados de prazo, valor e municípios exigem Pro ativo/verificado no backend.
- QA em transações de banco com rollback confirmou Free bloqueado, paginação e filtros Pro, 3 pesquisas + quarto bloqueado, alertas bloqueados e agregados coerentes. Nenhum entitlement temporário foi mantido.

## Histórico verificável
PRs: [#2 Free/Pro](https://github.com/CIPRI-studios/editalume/pull/2), [#3 token/servidor](https://github.com/CIPRI-studios/editalume/pull/3), [#4 indicadores](https://github.com/CIPRI-studios/editalume/pull/4), [#5 CSV até 200](https://github.com/CIPRI-studios/editalume/pull/5), [#6 consistência SP](https://github.com/CIPRI-studios/editalume/pull/6). O deploy usa GitHub Actions e renova snapshots públicos por workflow a cada quatro horas; depende temporariamente da coleta em `caueccipriano/mylife-caue-app`. Executar QA sintático, contrato Free/Pro, exportação funcional mockada, regressão de senha e consistência de divulgação antes de merges.

## Dependências e riscos ainda abertos
1. Conferir pelo painel do Supabase que `https://cipri-studios.github.io/editalume/conta.html` consta no allow-list de redirecionamentos, preservando a URL antiga. A conexão atual não possui leitura dessa configuração Auth.
2. Fazer QA ponta a ponta em **duas contas reais**, Free e uma Pro de teste devidamente autorizada: login por link e senha, logout, favoritos isolados, limitação Free, pesquisas Pro, painel, CSV, expiração e teste no PC/celular.
3. Contratar/configurar, quando autorizado, **serviço de e-mail transacional** e confirmar alertas diários, consentimento, descadastramento, falhas e deduplicação. Enquanto isso, não ativar alertas.
4. Em fase autorizada separada, configurar **assinatura recorrente** Asaas com webhook autenticado, idempotência, reconciliação de pagamento, cancelamento/expiração e suporte comercial. O link avulso de relatório não é checkout de assinatura.
5. Revisar privacidade/termos finais antes de cobrar. O Supabase Advisor apontou recomendação de proteção contra senhas vazadas, cuja disponibilidade/custo depende do plano; **não fazer upgrade pago automático**. As notificações RLS sem políticas em tabelas de eventos/fila privadas são de acesso intencionalmente reservado a serviços; revisar periodicamente.
6. Manter o endereço antigo como fallback até os testes reais; evitar alegar cobertura exaustiva das 27 UFs, índices garantidos ou prazos permanentemente abertos.

**Próxima ação do proprietário:** teste de login real por e-mail/senha e, somente se desejar, autorização explícita para acesso Pro de teste. Nenhuma cobrança foi configurada.
