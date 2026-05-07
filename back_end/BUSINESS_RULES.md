# Regras de Negocio NeuroLab Center

Matriz das 50 regras usadas como referencia para o back-end Python + MySQL.

## Login e Cadastro

1. **CPF unico**: nao pode haver mais de um usuario com o mesmo CPF. Aplicado por `usuarios.cpf UNIQUE`.
2. **CPF obrigatorio**: todo cadastro exige CPF. Aplicado em `auth_service.create_user`.
3. **Formato de CPF**: CPF precisa ter 11 digitos validos. Aplicado em `utils/cpf.py`.
4. **Senha criptografada**: senha sempre e salva com bcrypt. Aplicado em `utils/security.py`.
5. **CPF inexistente nao loga**: login falha se CPF nao existir. Aplicado em `auth_service.authenticate_user`.
6. **Senha incorreta nao loga**: login falha se bcrypt nao conferir. Aplicado em `auth_service.authenticate_user`.
7. **Cadastro duplicado de CPF**: CPF duplicado retorna erro de negocio. Aplicado em `auth_service.create_user`.
8. **Idade minima sem responsavel**: paciente menor de 16 anos precisa de responsavel. Configuravel em `MINOR_CONFIRMATION_AGE`.
9. **CPF de responsavel obrigatorio para menor**: cadastro de menor exige `cpf_responsavel`.
10. **CPF de responsavel precisa existir e ser responsavel**: o CPF informado deve existir, estar ativo e ter `tipo_usuario = responsavel`.

## Menor de Idade e Responsavel

11. **Menor vinculado a responsavel**: `pacientes.cpf_responsavel` guarda o vinculo.
12. **Um responsavel para varios menores**: permitido pelo indice `idx_pacientes_responsavel`.
13. **Menor nao cria responsavel automaticamente**: o responsavel precisa existir antes.
14. **CPF de responsavel pode ser alterado**: `PUT /api/pacientes/<cpf>/responsavel` exige nova autenticacao do responsavel atual.
15. **Agendamento de menor precisa CPF de responsavel**: aplicado em `agendamento_service.criar_agendamento`.
16. **Menor nao agenda sem responsavel**: agendamento bloqueado se o menor nao tiver responsavel vinculado.
17. **CPF de responsavel confirma agendamento**: aplicado em `/api/confirmar_agendamento`.
18. **Link de confirmacao com CPF de responsavel**: `GET /api/confirmar_agendamento?id=&cpf=&token=` valida o link.
19. **CPF de responsavel errado nao confirma**: retorna 403.
20. **Confirmacao expira**: prazo padrao de 12h em `RESPONSIBLE_CONFIRMATION_EXPIRES_HOURS`; apos expirar, status vira `expirado`.

## Agendamento

21. **CPF do paciente obrigatorio no agendamento**: `cpf_cliente` e validado e buscado em `pacientes`.
22. **CPF de responsavel obrigatorio para menor no agendamento**: `cpf_responsavel` e validado para menores.
23. **Horario unico por medico/unidade/data/hora**: `slot_ativo` com `UNIQUE KEY uk_agendamento_slot_ativo`.
24. **Antecedencia minima**: configurada por tipo (`consulta`, `exame`, `teleconsulta`).
25. **Antecedencia maxima**: padrao de 90 dias em `APPOINTMENT_MAX_DAYS_AHEAD`.
26. **Horario dentro do atendimento da unidade**: validado por `horario_ini` e `horario_fim`.
27. **Horario ocupado nao e livre**: `GET /api/agendamentos/disponibilidade` retorna horarios ocupados.
28. **Agendamento por CEP**: se `id_unidade` nao vier, `cep` escolhe a unidade ativa mais compativel.
29. **Medico so atende unidade autorizada**: validado em `medicos_unidades`.
30. **SUS apenas onde aceita SUS**: exige `unidades.aceita_sus` e `medicos_unidades.aceita_sus`.

## Status, Reagendamento e Cancelamento

31. **Status pendente para menor**: menor inicia como `pendente`; adulto inicia como `confirmado`.
32. **Confirmacao muda para confirmado**: responsavel valido muda `pendente` para `confirmado`.
33. **Agendamento expirado**: link expirado muda `pendente` para `expirado`.
34. **Cancelamento dentro do prazo**: status vira `cancelado`.
35. **Cancelamento fora do prazo**: status vira `falta`.
36. **Maximo de reagendamentos por CPF**: limite em 30 dias via `agendamento_eventos`.
37. **Reagendamento exige aprovacao especial**: excedeu limite, status vira `aprovacao_manual`.
38. **Reagendamento mantem regra de CPF**: CPF precisa ser paciente ou responsavel vinculado.
39. **Cancelado nao reconfirma**: confirmacao so aceita status `pendente`.
40. **Falta nao reconfirma**: confirmacao so aceita status `pendente`.

## Feedback e Historico

41. **Um feedback por agendamento**: `feedback.id_agendamento UNIQUE`.
42. **Feedback so apos atendimento**: exige status `confirmado` e data/hora passada.
43. **Feedback nota 1 a 5**: validado no servico e por `CHECK`.
44. **Media por medico/unidade**: endpoints `/feedback/medicos/<id>/media` e `/feedback/unidades/<id>/media`.
45. **Comentario opcional**: aceito como `NULL`; comentarios publicos por medico/unidade tem endpoints dedicados.
46. **Historico por CPF**: `GET /api/pacientes/<cpf>/agendamentos`.
47. **Cancelado/falta aparece no historico**: historico nao filtra status.
48. **Feedback nao editavel**: nao ha endpoint de edicao ou exclusao de feedback.

## Banco de Dados

49. **CPF unico por usuario no banco**: `usuarios.cpf UNIQUE`.
50. **Indices em campos criticos**: indices em CPF, data, hora, unidade, medico e busca de slot em `schema.sql`.
