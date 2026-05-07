USE neurolabcenter;

INSERT IGNORE INTO usuarios (cpf, nome, telefone, email, senha_hash, tipo_usuario)
VALUES
('12345678909', 'Marcos Silva', '11912345678', 'marcos@exemplo.com', '$2b$12$placeholderplaceholderplaceholderplaceholderplaceholderpl', 'responsavel'),
('98765432100', 'Pedro Silva', '11912345679', 'pedro@exemplo.com', '$2b$12$placeholderplaceholderplaceholderplaceholderplaceholderpl', 'paciente'),
('11144477735', 'Dra. Ana Beatriz Ferreira', '(11) 4002-8922', 'ana@neurolabcenter.com.br', '$2b$12$placeholderplaceholderplaceholderplaceholderplaceholderpl', 'medico'),
('52998224725', 'Dr. Carlos Eduardo Moura', '(11) 4002-8922', 'carlos@neurolabcenter.com.br', '$2b$12$placeholderplaceholderplaceholderplaceholderplaceholderpl', 'medico');

INSERT IGNORE INTO pacientes (cpf, nome, data_nascimento, cpf_responsavel)
VALUES
('98765432100', 'Pedro Silva', '2017-03-14', '12345678909');

INSERT IGNORE INTO unidades (id, nome, endereco, cidade, cep, telefone, horario_ini, horario_fim, aceita_sus, ativo)
VALUES
(1, 'NeuroLabCenter Santo Andre', 'R. Amazonas, 48 - Centro', 'Santo Andre', '09000000', '(11) 4002-8922', '07:00:00', '19:00:00', TRUE, TRUE),
(2, 'NeuroLabCenter Sao Bernardo', 'Av. Kennedy, 303 - Jardim do Mar', 'Sao Bernardo do Campo', '09726000', '(11) 4002-8923', '08:00:00', '18:00:00', FALSE, TRUE),
(3, 'NeuroLabCenter Teleconsulta', 'Atendimento online', 'Online', '00000000', '(11) 4002-8922', '07:00:00', '21:00:00', FALSE, TRUE);

INSERT IGNORE INTO convenios (id, nome, ativo)
VALUES
(1, 'Unimed', TRUE),
(2, 'Bradesco Saude', TRUE),
(3, 'SulAmerica', TRUE),
(4, 'Amil', TRUE);

INSERT IGNORE INTO unidades_convenios (id_unidade, id_convenio)
VALUES
(1, 1), (1, 2), (1, 3), (1, 4),
(2, 1), (2, 2),
(3, 1), (3, 2), (3, 3), (3, 4);

INSERT IGNORE INTO exames (id, nome, descricao, preparo_recomendado, duracao_minutos, ativo)
VALUES
(1, 'Eletroencefalograma', 'Exame EEG para avaliacao de atividade cerebral.', 'Cabelos limpos e secos, sem gel ou creme.', 40, TRUE),
(2, 'Eletroneuromiografia', 'Avaliacao neurofisiologica de nervos e musculos.', 'Evitar cremes na pele no dia do exame.', 60, TRUE),
(3, 'Polissonografia', 'Exame do sono.', 'Seguir rotina habitual de sono e levar itens pessoais.', 480, TRUE);

INSERT IGNORE INTO medicos (id, id_usuario, crm, especialidade)
SELECT 1, id, 'CRM/SP 84201', 'Neurologia Geral e Epilepsia'
  FROM usuarios
 WHERE cpf = '11144477735';

INSERT IGNORE INTO medicos (id, id_usuario, crm, especialidade)
SELECT 2, id, 'CRM/SP 67453', 'Sono e Cognicao'
  FROM usuarios
 WHERE cpf = '52998224725';

INSERT IGNORE INTO medicos_unidades (id_medico, id_unidade, aceita_particular, aceita_convenio, aceita_sus, aceita_teleconsulta, ativo)
VALUES
(1, 1, TRUE, TRUE, TRUE, TRUE, TRUE),
(1, 3, TRUE, TRUE, FALSE, TRUE, TRUE),
(2, 1, TRUE, TRUE, FALSE, TRUE, TRUE),
(2, 2, TRUE, TRUE, FALSE, FALSE, TRUE),
(2, 3, TRUE, TRUE, FALSE, TRUE, TRUE);

INSERT IGNORE INTO agendamentos (
    id, id_paciente, id_medico, id_unidade, id_convenio, id_exame,
    data_consulta, hora_consulta, tipo_consulta, tipo_atendimento,
    status, observacao, cpf_responsavel_confirmacao, confirmado_em
)
SELECT
    1, p.id, 1, 1, NULL, NULL,
    DATE_SUB(CURDATE(), INTERVAL 7 DAY), '10:00:00', 'consulta', 'particular',
    'confirmado', 'Consulta confirmada para exemplo de feedback.', p.cpf_responsavel, DATE_SUB(NOW(), INTERVAL 7 DAY)
  FROM pacientes p
 WHERE p.cpf = '98765432100';

INSERT IGNORE INTO agendamentos (
    id, id_paciente, id_medico, id_unidade, id_convenio, id_exame,
    data_consulta, hora_consulta, tipo_consulta, tipo_atendimento,
    status, observacao, cpf_responsavel_confirmacao, confirmacao_token, confirmacao_expira_em
)
SELECT
    2, p.id, 1, 1, NULL, 1,
    DATE_ADD(CURDATE(), INTERVAL 7 DAY), '11:00:00', 'exame', 'particular',
    'pendente', 'Exame pendente aguardando confirmacao do responsavel.', p.cpf_responsavel,
    '00000000-0000-0000-0000-000000000001', DATE_ADD(NOW(), INTERVAL 12 HOUR)
  FROM pacientes p
 WHERE p.cpf = '98765432100';

INSERT IGNORE INTO agendamento_eventos (id, id_agendamento, tipo_evento, cpf_autor, detalhe)
VALUES
(1, 1, 'criado', '98765432100', 'status=confirmado'),
(2, 1, 'confirmado', '12345678909', 'confirmado pelo responsavel'),
(3, 2, 'criado', '98765432100', 'status=pendente');

INSERT IGNORE INTO feedback (id_agendamento, nota, comentario)
VALUES
(1, 5, 'Otimo atendimento.');

INSERT IGNORE INTO agendamento_eventos (id, id_agendamento, tipo_evento, cpf_autor, detalhe)
VALUES
(4, 1, 'feedback', '98765432100', 'nota=5');
