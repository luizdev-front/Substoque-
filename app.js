// --- CONFIGURAÇÃO DE UI E ESTADO ---

// Função para abrir/fechar o modal
window.toggleModal = (open) => {
    const modal = document.getElementById('modal');
    if (open) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.getElementById('item-form').reset();
    }
};

// --- MONITORAMENTO DE AUTENTICAÇÃO ---

window.auth.onAuthStateChanged((user) => {
    const loginScreen = document.getElementById('login-screen');
    const dashboard = document.getElementById('dashboard');

    if (user) {
        loginScreen.classList.add('hidden');
        dashboard.classList.remove('hidden');
        escutarDados(user.uid); // Começa a ouvir o banco de dados
    } else {
        loginScreen.classList.remove('hidden');
        dashboard.classList.add('hidden');
    }
});

// --- LÓGICA DE LOGIN / CADASTRO ---

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Tenta fazer login
        await window.fb.signInWithEmailAndPassword(window.auth, email, password);
    } catch (error) {
        // Se o usuário não existir, tenta cadastrar
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            try {
                await window.fb.createUserWithEmailAndPassword(window.auth, email, password);
                alert("Conta criada com sucesso!");
            } catch (signUpError) {
                alert("Erro ao cadastrar: " + signUpError.message);
            }
        } else {
            alert("Erro: " + error.message);
        }
    }
});

// Botão de Sair
document.getElementById('btn-logout').addEventListener('click', () => window.auth.signOut());

// --- OPERAÇÕES DO BANCO DE DADOS (CRUD) ---

// Salvar novo item
document.getElementById('item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = window.auth.currentUser;
    if (!user) return;

    const nome = document.getElementById('item-nome').value;
    const quantidade = Number(document.getElementById('item-qtd').value);
    const unidade = document.getElementById('item-unidade').value;

    // Lógica simples de status
    let status = 'em_estoque';
    if (quantidade <= 0) status = 'esgotado';
    else if (quantidade < 10) status = 'baixo_estoque';

    try {
        await window.fb.addDoc(window.fb.collection(window.db, "materias"), {
            nome,
            quantidade,
            unidade,
            status,
            userId: user.uid,
            createdAt: new Date()
        });
        toggleModal(false); // Fecha o modal após salvar
    } catch (error) {
        console.error("Erro ao salvar item:", error);
        alert("Erro ao salvar no banco de dados.");
    }
});

// Escutar dados em tempo real (Realtime)
function escutarDados(uid) {
    const q = window.fb.query(
        window.fb.collection(window.db, "materias"),
        window.fb.where("userId", "==", uid)
    );

    // O onSnapshot atualiza a tela automaticamente quando o banco muda
    window.fb.onSnapshot(q, (querySnapshot) => {
        const items = [];
        querySnapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });
        renderTable(items);
    });
}

// Deletar item
window.deleteItem = async (id) => {
    if (confirm("Tem certeza que deseja excluir este item?")) {
        try {
            await window.fb.deleteDoc(window.fb.doc(window.db, "materias", id));
        } catch (error) {
            console.error("Erro ao deletar:", error);
        }
    }
};

// --- RENDERIZAÇÃO ---

function renderTable(items) {
    const tbody = document.getElementById('inventory-table');
    const searchTerm = document.getElementById('search').value.toLowerCase();

    // Filtro de busca simples
    const filteredItems = items.filter(item => 
        item.nome.toLowerCase().includes(searchTerm)
    );

    tbody.innerHTML = filteredItems.map(item => `
        <tr class="border-b hover:bg-slate-50">
            <td class="p-4 font-medium">${item.nome}</td>
            <td class="p-4">${item.quantidade} ${item.unidade}</td>
            <td class="p-4">
                <span class="px-2 py-1 rounded text-xs ${getStatusClass(item.status)}">
                    ${item.status.replace('_', ' ')}
                </span>
            </td>
            <td class="p-4 text-right">
                <button onclick="deleteItem('${item.id}')" class="text-red-500 hover:text-red-700 font-bold">Excluir</button>
            </td>
        </tr>
    `).join('');
}

function getStatusClass(status) {
    if (status === 'em_estoque') return 'bg-green-100 text-green-700';
    if (status === 'baixo_estoque') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
}

// Ouvinte para a barra de busca
document.getElementById('search').addEventListener('input', () => {
    // Como estamos usando onSnapshot, podemos apenas forçar um re-render 
    // ou deixar o Firebase lidar. Aqui, para busca local, chamamos a renderização.
});
