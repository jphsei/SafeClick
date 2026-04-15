-- ============================================================
-- SafeClick - Dados iniciais (Seed)
-- ============================================================

-- ============================================================
-- ESCOLAS
-- ============================================================

INSERT INTO public.escolas (id, nome, cidade, email) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Escola Secundária de Exemplo', 'Porto', 'admin@escola.pt'),
    ('22222222-2222-2222-2222-222222222222', 'Colégio Demo', 'Lisboa', 'admin@colegio.pt');

-- ============================================================
-- BADGES
-- ============================================================

INSERT INTO public.badges (id, nome, descricao, pontos_bonus, criterio) VALUES
    ('b1000001-0000-0000-0000-000000000001', 'Primeiro Passo', 'Completou o primeiro módulo de e-learning.', 10, 'Concluir 1 módulo'),
    ('b1000001-0000-0000-0000-000000000002', 'Detetive Digital', 'Identificou corretamente 5 tentativas de phishing.', 25, 'Reportar 5 simulações de phishing'),
    ('b1000001-0000-0000-0000-000000000003', 'Mestre das Passwords', 'Completou o módulo de gestão de passwords com 100%.', 20, 'Nota 100% no quiz de passwords'),
    ('b1000001-0000-0000-0000-000000000004', 'Estudante Dedicado', 'Completou 5 módulos de e-learning.', 50, 'Concluir 5 módulos'),
    ('b1000001-0000-0000-0000-000000000005', 'Especialista em Cibersegurança', 'Completou todos os módulos disponíveis.', 100, 'Concluir todos os módulos'),
    ('b1000001-0000-0000-0000-000000000006', 'Quiz Master', 'Obteve 100% em 3 quizzes seguidos.', 30, '3 quizzes com nota máxima consecutivos'),
    ('b1000001-0000-0000-0000-000000000007', 'Alerta Máximo', 'Não clicou em nenhuma simulação de phishing.', 40, '10 simulações sem clicar');

-- ============================================================
-- MÓDULOS DE E-LEARNING
-- ============================================================

INSERT INTO public.modulos (id, titulo, descricao, dificuldade, estado, ordem, pontos_conclusao, duracao_minutos, tags) VALUES
    ('c0000001-0000-0000-0000-000000000001',
     'Introdução à Cibersegurança',
     'Aprende os conceitos fundamentais de cibersegurança e como proteger-te online.',
     'basico', 'publicado', 1, 20, 30,
     ARRAY['fundamentos', 'intro', 'segurança']),

    ('c0000001-0000-0000-0000-000000000002',
     'Reconhecer Phishing e Fraudes Online',
     'Aprende a identificar emails, mensagens e websites fraudulentos antes de seres vítima.',
     'basico', 'publicado', 2, 25, 45,
     ARRAY['phishing', 'fraude', 'email']),

    ('c0000001-0000-0000-0000-000000000003',
     'Gestão Segura de Passwords',
     'Descobre como criar passwords fortes e gerir as tuas credenciais de forma segura.',
     'basico', 'publicado', 3, 20, 25,
     ARRAY['passwords', 'autenticação', 'segurança']),

    ('c0000001-0000-0000-0000-000000000004',
     'Segurança nas Redes Sociais',
     'Aprende a proteger a tua privacidade e informação pessoal nas redes sociais.',
     'intermedio', 'publicado', 4, 25, 35,
     ARRAY['redes sociais', 'privacidade', 'dados pessoais']),

    ('c0000001-0000-0000-0000-000000000005',
     'Navegação Segura na Internet',
     'Boas práticas para navegar na internet de forma segura, incluindo uso de VPN e HTTPS.',
     'intermedio', 'publicado', 5, 25, 40,
     ARRAY['navegação', 'vpn', 'https', 'privacidade']),

    ('c0000001-0000-0000-0000-000000000006',
     'Segurança de Dispositivos Móveis',
     'Como proteger o teu smartphone e tablet de ameaças digitais.',
     'intermedio', 'publicado', 6, 25, 30,
     ARRAY['mobile', 'smartphone', 'apps']),

    ('c0000001-0000-0000-0000-000000000007',
     'Ransomware e Malware',
     'Entende o que é ransomware e malware, como se espalham e como te proteger.',
     'avancado', 'publicado', 7, 30, 50,
     ARRAY['malware', 'ransomware', 'vírus']);

-- ============================================================
-- AULAS (3-4 por módulo)
-- ============================================================

-- Módulo 1: Introdução à Cibersegurança
INSERT INTO public.aulas (id, modulo_id, titulo, conteudo, ordem, duracao_minutos, pontos) VALUES
    ('a0000001-0001-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001',
     'O que é a Cibersegurança?',
     '<h2>O que é a Cibersegurança?</h2><p>A cibersegurança é o conjunto de práticas, tecnologias e processos que protegem sistemas, redes e programas de ataques digitais. Estes ataques visam normalmente aceder, alterar ou destruir informações sensíveis, extorquir dinheiro aos utilizadores ou interromper processos de negócio normais.</p>',
     1, 8, 5),
    ('a0000001-0001-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001',
     'Principais Ameaças Digitais',
     '<h2>Tipos de Ameaças</h2><p>Existem vários tipos de ameaças digitais: vírus, trojans, ransomware, phishing, engenharia social, entre outros. Conhecer cada uma é o primeiro passo para te protegeres.</p>',
     2, 10, 5),
    ('a0000001-0001-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001',
     'Boas Práticas Fundamentais',
     '<h2>Como te Protegeres</h2><p>Manter os sistemas atualizados, usar passwords fortes, ativar a autenticação de dois fatores e fazer backups regulares são práticas essenciais para qualquer utilizador.</p>',
     3, 12, 5);

-- Módulo 2: Phishing
INSERT INTO public.aulas (id, modulo_id, titulo, conteudo, ordem, duracao_minutos, pontos) VALUES
    ('a0000001-0002-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002',
     'O que é Phishing?',
     '<h2>Phishing Explicado</h2><p>Phishing é uma técnica de engenharia social onde atacantes se fazem passar por entidades de confiança (bancos, serviços online, etc.) para roubar credenciais ou dados pessoais.</p>',
     1, 10, 5),
    ('a0000001-0002-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002',
     'Como Identificar um Email Falso',
     '<h2>Sinais de Alerta</h2><p>Verifica sempre o endereço do remetente, procura erros ortográficos, desconfia de urgência excessiva, não cliques em links suspeitos e verifica URLs antes de introduzires credenciais.</p>',
     2, 15, 5),
    ('a0000001-0002-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000002',
     'Tipos de Phishing',
     '<h2>Variantes de Phishing</h2><p>Além do email phishing clássico, existem: spear phishing (direcionado), smishing (via SMS), vishing (via chamada), e pharming (redirecionamento DNS).</p>',
     3, 10, 5),
    ('a0000001-0002-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000002',
     'O que Fazer se Fores Vítima',
     '<h2>Passos de Resposta</h2><p>Se suspeitares que foste vítima de phishing: altera imediatamente as tuas passwords, notifica a entidade visada, ativa o 2FA e reporta às autoridades competentes.</p>',
     4, 10, 5);

-- Módulo 3: Passwords
INSERT INTO public.aulas (id, modulo_id, titulo, conteudo, ordem, duracao_minutos, pontos) VALUES
    ('a0000001-0003-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000003',
     'Características de uma Boa Password',
     '<h2>Password Segura</h2><p>Uma password forte deve ter: pelo menos 12 caracteres, letras maiúsculas e minúsculas, números e símbolos especiais. Evita palavras do dicionário e informações pessoais.</p>',
     1, 8, 5),
    ('a0000001-0003-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000003',
     'Gestores de Passwords',
     '<h2>Password Managers</h2><p>Um gestor de passwords permite guardar e gerar passwords únicas e complexas para cada serviço, sem precisares de as memorizar todas. Exemplos: Bitwarden, 1Password, KeePass.</p>',
     2, 8, 5),
    ('a0000001-0003-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000003',
     'Autenticação de Dois Fatores (2FA)',
     '<h2>2FA - Proteção Extra</h2><p>A autenticação de dois fatores adiciona uma camada extra de segurança: além da password, precisas de um segundo fator (código por SMS, app autenticadora, chave física).</p>',
     3, 9, 5);

-- ============================================================
-- QUIZZES
-- ============================================================

INSERT INTO public.quizzes (id, titulo, descricao, modulo_id, pontos_conclusao, nota_minima) VALUES
    ('d0000001-0001-0000-0000-000000000001',
     'Quiz: Fundamentos de Cibersegurança',
     'Testa os teus conhecimentos sobre os conceitos básicos de cibersegurança.',
     'c0000001-0000-0000-0000-000000000001',
     20, 60.00),

    ('d0000001-0002-0000-0000-000000000001',
     'Quiz: Identificar Phishing',
     'Consegues identificar um ataque de phishing? Testa os teus conhecimentos!',
     'c0000001-0000-0000-0000-000000000002',
     25, 60.00),

    ('d0000001-0003-0000-0000-000000000001',
     'Quiz: Gestão de Passwords',
     'Avalia os teus conhecimentos sobre práticas seguras de gestão de passwords.',
     'c0000001-0000-0000-0000-000000000003',
     20, 60.00);

-- ============================================================
-- PERGUNTAS (Quiz 1 - Fundamentos)
-- ============================================================

INSERT INTO public.perguntas (id, quiz_id, enunciado, tipo, explicacao, pontos, ordem) VALUES
    ('e1000001-0001-0000-0000-000000000001', 'd0000001-0001-0000-0000-000000000001',
     'O que é cibersegurança?',
     'escolha_multipla',
     'Cibersegurança é o conjunto de práticas que protege sistemas e redes de ataques digitais.',
     1, 1),
    ('e1000001-0001-0000-0000-000000000002', 'd0000001-0001-0000-0000-000000000001',
     'Qual das seguintes é uma boa prática de segurança?',
     'escolha_multipla',
     'Manter o software atualizado fecha vulnerabilidades conhecidas que os atacantes exploram.',
     1, 2),
    ('e1000001-0001-0000-0000-000000000003', 'd0000001-0001-0000-0000-000000000001',
     'Ransomware é um tipo de malware que encripta os teus ficheiros e pede resgate.',
     'verdadeiro_falso',
     'Correto! Ransomware bloqueia o acesso aos teus dados e pede pagamento para os desbloquear.',
     1, 3),
    ('e1000001-0001-0000-0000-000000000004', 'd0000001-0001-0000-0000-000000000001',
     'Qual a principal ameaça para utilizadores comuns na internet?',
     'escolha_multipla',
     'O phishing é a ameaça mais comum, explorando a falta de atenção dos utilizadores.',
     1, 4),
    ('e1000001-0001-0000-0000-000000000005', 'd0000001-0001-0000-0000-000000000001',
     'É seguro ligar a redes Wi-Fi públicas sem proteção adicional.',
     'verdadeiro_falso',
     'Falso! Redes Wi-Fi públicas são perigosas. Usa sempre uma VPN em redes públicas.',
     1, 5);

-- Opções para pergunta 1
INSERT INTO public.opcoes_resposta (pergunta_id, texto, correta, ordem) VALUES
    ('e1000001-0001-0000-0000-000000000001', 'Conjunto de práticas que protege sistemas de ataques digitais', TRUE, 1),
    ('e1000001-0001-0000-0000-000000000001', 'Software para criar websites seguros', FALSE, 2),
    ('e1000001-0001-0000-0000-000000000001', 'Um tipo de vírus informático', FALSE, 3),
    ('e1000001-0001-0000-0000-000000000001', 'Sistema operativo seguro', FALSE, 4);

-- Opções para pergunta 2
INSERT INTO public.opcoes_resposta (pergunta_id, texto, correta, ordem) VALUES
    ('e1000001-0001-0000-0000-000000000002', 'Manter o software sempre atualizado', TRUE, 1),
    ('e1000001-0001-0000-0000-000000000002', 'Usar a mesma password em todos os sites', FALSE, 2),
    ('e1000001-0001-0000-0000-000000000002', 'Partilhar a password com amigos de confiança', FALSE, 3),
    ('e1000001-0001-0000-0000-000000000002', 'Desativar o antivírus para o sistema ser mais rápido', FALSE, 4);

-- Opções para pergunta 3 (V/F)
INSERT INTO public.opcoes_resposta (pergunta_id, texto, correta, ordem) VALUES
    ('e1000001-0001-0000-0000-000000000003', 'Verdadeiro', TRUE, 1),
    ('e1000001-0001-0000-0000-000000000003', 'Falso', FALSE, 2);

-- Opções para pergunta 4
INSERT INTO public.opcoes_resposta (pergunta_id, texto, correta, ordem) VALUES
    ('e1000001-0001-0000-0000-000000000004', 'Phishing', TRUE, 1),
    ('e1000001-0001-0000-0000-000000000004', 'Ataques de força bruta a servidores', FALSE, 2),
    ('e1000001-0001-0000-0000-000000000004', 'Exploração de zero-days', FALSE, 3),
    ('e1000001-0001-0000-0000-000000000004', 'SQL Injection', FALSE, 4);

-- Opções para pergunta 5 (V/F)
INSERT INTO public.opcoes_resposta (pergunta_id, texto, correta, ordem) VALUES
    ('e1000001-0001-0000-0000-000000000005', 'Verdadeiro', FALSE, 1),
    ('e1000001-0001-0000-0000-000000000005', 'Falso', TRUE, 2);

-- ============================================================
-- PERGUNTAS (Quiz 2 - Phishing)
-- ============================================================

INSERT INTO public.perguntas (id, quiz_id, enunciado, tipo, explicacao, pontos, ordem) VALUES
    ('e1000001-0002-0000-0000-000000000001', 'd0000001-0002-0000-0000-000000000001',
     'Recebes um email do "Banco SeguroPT" a pedir que cliques num link e confirmes os teus dados. O remetente é "seguropt@gmail.com". O que fazes?',
     'escolha_multipla',
     'Bancos nunca usam emails de Gmail. Contacta o banco diretamente pelos canais oficiais para verificar.',
     1, 1),
    ('e1000001-0002-0000-0000-000000000002', 'd0000001-0002-0000-0000-000000000001',
     'Um email de phishing pode conter erros ortográficos e gramaticais.',
     'verdadeiro_falso',
     'Verdadeiro! Erros ortográficos e de gramática são frequentemente sinais de emails fraudulentos.',
     1, 2),
    ('e1000001-0002-0000-0000-000000000003', 'd0000001-0002-0000-0000-000000000001',
     'Qual das seguintes URLs é mais provavelmente legítima para aceder ao teu banco?',
     'escolha_multipla',
     'O domínio correto deve ser o domínio oficial do banco. Verifica sempre o URL completo na barra do browser.',
     1, 3),
    ('e1000001-0002-0000-0000-000000000004', 'd0000001-0002-0000-0000-000000000001',
     'Smishing é uma forma de phishing realizada através de SMS.',
     'verdadeiro_falso',
     'Verdadeiro! Smishing usa SMS para enganar as vítimas a clicar em links maliciosos ou fornecer dados.',
     1, 4),
    ('e1000001-0002-0000-0000-000000000005', 'd0000001-0002-0000-0000-000000000001',
     'O que deves fazer se receberes um email suspeito no trabalho ou escola?',
     'escolha_multipla',
     'Reporta sempre à equipa de TI ou ao professor responsável. Nunca cliques em links ou abras anexos de emails suspeitos.',
     1, 5);

-- Opções Quiz 2 - Pergunta 1
INSERT INTO public.opcoes_resposta (pergunta_id, texto, correta, ordem) VALUES
    ('e1000001-0002-0000-0000-000000000001', 'Apagar o email e contactar o banco pelos canais oficiais', TRUE, 1),
    ('e1000001-0002-0000-0000-000000000001', 'Clicar no link e confirmar os dados rapidamente', FALSE, 2),
    ('e1000001-0002-0000-0000-000000000001', 'Reencaminhar o email para os teus contactos como aviso', FALSE, 3),
    ('e1000001-0002-0000-0000-000000000001', 'Responder ao email a pedir mais informações', FALSE, 4);

-- Opções Quiz 2 - Pergunta 2 (V/F)
INSERT INTO public.opcoes_resposta (pergunta_id, texto, correta, ordem) VALUES
    ('e1000001-0002-0000-0000-000000000002', 'Verdadeiro', TRUE, 1),
    ('e1000001-0002-0000-0000-000000000002', 'Falso', FALSE, 2);

-- Opções Quiz 2 - Pergunta 3
INSERT INTO public.opcoes_resposta (pergunta_id, texto, correta, ordem) VALUES
    ('e1000001-0002-0000-0000-000000000003', 'https://www.bancoseguro.pt/login', TRUE, 1),
    ('e1000001-0002-0000-0000-000000000003', 'http://bancoseguro.site/acesso', FALSE, 2),
    ('e1000001-0002-0000-0000-000000000003', 'https://bancoseguro-pt.com/login', FALSE, 3),
    ('e1000001-0002-0000-0000-000000000003', 'http://www.banco-seguro.info', FALSE, 4);

-- Opções Quiz 2 - Pergunta 4 (V/F)
INSERT INTO public.opcoes_resposta (pergunta_id, texto, correta, ordem) VALUES
    ('e1000001-0002-0000-0000-000000000004', 'Verdadeiro', TRUE, 1),
    ('e1000001-0002-0000-0000-000000000004', 'Falso', FALSE, 2);

-- Opções Quiz 2 - Pergunta 5
INSERT INTO public.opcoes_resposta (pergunta_id, texto, correta, ordem) VALUES
    ('e1000001-0002-0000-0000-000000000005', 'Reportar ao responsável de TI/professor e não clicar em nada', TRUE, 1),
    ('e1000001-0002-0000-0000-000000000005', 'Abrir o anexo para ver se é perigoso', FALSE, 2),
    ('e1000001-0002-0000-0000-000000000005', 'Clicar no link para confirmar se é legítimo', FALSE, 3),
    ('e1000001-0002-0000-0000-000000000005', 'Ignorar e não fazer nada', FALSE, 4);

-- ============================================================
-- SIMULAÇÕES DE PHISHING
-- ============================================================

INSERT INTO public.simulacoes_phishing (id, titulo, descricao, assunto_email, corpo_email, remetente_falso, url_falso, pistas, dificuldade, pontos_sucesso) VALUES
    ('f0000001-0001-0000-0000-000000000001',
     'Alerta de Segurança do Banco',
     'Simulação de phishing fingindo ser um banco a solicitar confirmação de dados.',
     'URGENTE: A sua conta foi suspensa - Ação imediata necessária',
     '<div style="font-family:Arial"><h2>Banco Nacional de Portugal</h2><p>Prezado Cliente,</p><p>Detectámos atividade suspeita na sua conta. Para evitar o bloqueio permanente, confirme os seus dados <strong>nas próximas 24 horas</strong>.</p><p><a href="#">CLIQUE AQUI PARA CONFIRMAR</a></p><p>Equipa de Segurança BNP</p></div>',
     'seguranca@banco-nacional-pt.com',
     'http://banco-nacional-pt.verificacao.xyz/login',
     ARRAY[
         'O endereço de email usa um domínio suspeito (.com em vez de .pt)',
         'Bancos nunca pedem dados por email',
         'Linguagem de urgência excessiva é sinal de fraude',
         'O URL do link não corresponde ao site oficial do banco'
     ],
     'basico', 15),

    ('f0000001-0002-0000-0000-000000000001',
     'Email Falso dos Serviços CTT',
     'Simulação de phishing fingindo ser os CTT a informar sobre uma encomenda.',
     'A sua encomenda está retida - Taxa de entrega pendente',
     '<div style="font-family:Arial"><img src="#" alt="CTT Logo"><p>Caro cliente,</p><p>A sua encomenda (Ref: PT9823476) está retida no armazém. Para proceder à entrega, é necessário pagar uma taxa de 2,99€.</p><p><a href="#">Pagar agora</a></p></div>',
     'entregas@ctt-portugal-servicos.net',
     'http://ctt-pagamento.site/taxa',
     ARRAY[
         'O domínio do email não é o oficial dos CTT (ctt.pt)',
         'CTT nunca cobram taxas adicionais por email',
         'O URL de pagamento é suspeito e não pertence aos CTT',
         'Verifica sempre no site oficial dos CTT o estado das encomendas'
     ],
     'basico', 15),

    ('f0000001-0003-0000-0000-000000000001',
     'Phishing de Redes Sociais',
     'Email a fingir ser de uma rede social com pedido de confirmação de login.',
     'Alguém tentou aceder à sua conta - Confirme a sua identidade',
     '<div style="font-family:Arial"><p>Olá,</p><p>Detectámos uma tentativa de login na sua conta a partir de um dispositivo desconhecido (Windows 11, Lisboa, PT).</p><p>Se não foi você, clique aqui para proteger a sua conta imediatamente:</p><p><a href="#">Proteger Conta Agora</a></p></div>',
     'security-noreply@instagramn.com',
     'http://instagram-security.verificar.info/account',
     ARRAY[
         'O domínio do email tem um erro: "instagramn" em vez de "instagram"',
         'O URL de verificação não é instagram.com',
         'Esta é uma técnica de engenharia social que explora o medo',
         'Verifica sempre as sessões ativas diretamente na app oficial'
     ],
     'intermedio', 20);

-- ============================================================
-- RECURSOS PEDAGÓGICOS
-- ============================================================

INSERT INTO public.recursos_pedagogicos (titulo, descricao, tipo, modulo_id, visivel) VALUES
    ('Plano de Aula: Introdução à Cibersegurança',
     'Plano detalhado para uma aula de 90 minutos sobre fundamentos de cibersegurança para o ensino secundário.',
     'plano_aula',
     'c0000001-0000-0000-0000-000000000001',
     TRUE),
    ('Apresentação: Tipos de Ameaças Digitais',
     'Apresentação de slides com os principais tipos de ameaças digitais, exemplos reais e estatísticas atuais.',
     'apresentacao',
     'c0000001-0000-0000-0000-000000000001',
     TRUE),
    ('Guia do Professor: Simulações de Phishing',
     'Guia completo para o professor conduzir simulações de phishing em sala de aula de forma pedagógica.',
     'guia',
     'c0000001-0000-0000-0000-000000000002',
     TRUE),
    ('Plano de Aula: Segurança de Passwords',
     'Plano de aula interativo com atividades práticas sobre criação e gestão de passwords seguras.',
     'plano_aula',
     'c0000001-0000-0000-0000-000000000003',
     TRUE);

-- ============================================================
-- UTILIZADORES DE TESTE
-- Criados no seed para persistirem entre reinicios do Supabase.
--
--   Professor : professor@safeclick.pt  /  ProfTeste@1234
--   Aluno     : aluno@safeclick.pt      /  AlunoTeste@1234
--
-- A trigger trg_criar_perfil_novo_utilizador cria automaticamente
-- a linha em public.perfis a partir de raw_user_meta_data.
-- ============================================================

INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES
(
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'professor@safeclick.pt',
    extensions.crypt('ProfTeste@1234', extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nome_completo":"Professor Teste","papel":"professor"}',
    NOW(),
    NOW(),
    '', '', '', ''
),
(
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'aluno@safeclick.pt',
    extensions.crypt('AlunoTeste@1234', extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nome_completo":"Aluno Teste","papel":"aluno"}',
    NOW(),
    NOW(),
    '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- identity records required by Supabase Auth for email/password login
INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES
(
    'aaaaaaaa-0000-0000-0000-000000000001',
    'professor@safeclick.pt',
    'aaaaaaaa-0000-0000-0000-000000000001',
    '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","email":"professor@safeclick.pt"}',
    'email',
    NOW(),
    NOW(),
    NOW()
),
(
    'aaaaaaaa-0000-0000-0000-000000000002',
    'aluno@safeclick.pt',
    'aaaaaaaa-0000-0000-0000-000000000002',
    '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","email":"aluno@safeclick.pt"}',
    'email',
    NOW(),
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;
