import streamlit as st

st.title("Welcome to CorvoDelivery")

st.write("This is the starting point for managing your delivery service with CorvoDelivery!")
# Painel de Administradores: Gerenciar entregadores
if st.sidebar.button("Admin Panel"):
    st.header("Painel de Administradores")
    
    st.subheader("Adicionar Entregador")
    name = st.text_input("Nome do Entregador")
    contact = st.text_input("Contato do Entregador")
    
    if st.button("Adicionar"):
        st.write(f"Entregador {name} adicionado com sucesso!")

    st.subheader("Lista de Entregadores")
    # Simulação de dados para demonstrar
    entregadores = [{"nome": "João", "contato": "12345"}, {"nome": "Maria", "contato": "67890"}]
    for e in entregadores:
        st.write(f"- {e['nome']} ({e['contato']})")
        if st.button(f"Remover {e['nome']}"):
            st.write(f"Entregador {e['nome']} removido.")
          # Separador de Entregadores: Visualizar entregas e ações de status
if st.sidebar.button("Delivery Panel"):
    st.header("Painel de Entregadores")
    
    st.subheader("Entregas Pendentes")
    # Simulação de dados de entregas
    entregas = [
        {"id": 1, "cliente": "Cliente X", "status": "Pendente"},
        {"id": 2, "cliente": "Cliente Y", "status": "Pendente"},
    ]
    
    for entrega in entregas:
        st.write(f"Entrega ID: {entrega['id']} para {entrega['cliente']} - {entrega['status']}")
        if st.button(f"Marcar como Entregue - ID {entrega['id']}"):
            st.write(f"Entrega {entrega['id']} marcada como concluída.")
        if st.button(f"Pausar Entrega - ID {entrega['id']}"):
            st.write(f"Entrega {entrega['id']} está pausada.")
          # Relatório de Entregas: Concluídas e Pendentes
if st.sidebar.button("Delivery Reports"):
    st.header("Relatório de Entregas")
    
    # Simulação de dados para o relatório
    entregas_concluidas = 5
    entregas_pendentes = 3

    st.metric(label="Entregas Concluídas", value=entregas_concluidas)
    st.metric(label="Entregas Pendentes", value=entregas_pendentes)

    st.subheader("Detalhes das Entregas")
    entregas = [
        {"id": 1, "cliente": "Cliente A", "status": "Concluída"},
        {"id": 2, "cliente": "Cliente B", "status": "Pendente"},
    ]
    
    for entrega in entregas:
        st.write(f"ID: {entrega['id']} | Cliente: {entrega['cliente']} | Status: {entrega['status']}")
        # Login e Novo Registo
st.sidebar.title("Autenticação")

# Selecione entre Login ou Novo Registo
auth_choice = st.sidebar.selectbox("Selecione uma opção:", ["Login", "Novo Registo"])

if auth_choice == "Login":
    st.header("Login")
    username = st.text_input("Nome de Utilizador")
    password = st.text_input("Palavra-passe", type="password")
    if st.button("Entrar"):
        # Simulação de validação de login
        if username == "admin" and password == "1234":
            st.success(f"Bem-vindo {username}!")
        else:
            st.error("Credenciais inválidas. Por favor, tente novamente.")

elif auth_choice == "Novo Registo":
    st.header("Novo Registo")
    new_username = st.text_input("Escolha um Nome de Utilizador")
    new_password = st.text_input("Escolha uma Palavra-passe", type="password")
    confirm_password = st.text_input("Confirme a Palavra-passe", type="password")
    if st.button("Registar"):
        if new_password == confirm_password:
            st.success("Conta criada com sucesso!")
            st.write(f"Bem-vindo, {new_username}!")
        else:
            st.error("As palavras-passe não coincidem. Por favor, tente novamente.")
