// app.js
const SUPABASE_URL = 'SUA_URL_DO_SUPABASE';
const SUPABASE_KEY = 'SUA_ANON_KEY_DO_SUPABASE';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Gerenciamento de Estado de Autenticação
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        fetchData(); // Busca dados do banco
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
    }
});

// CREATE: Adicionar nova matéria
async function addItem(nome, quantidade, unidade) {
    const { data: { user } } = await supabase.auth.getUser();
    
    let status = 'em_estoque';
    if (quantidade <= 0) status = 'esgotado';
    else if (quantidade < 10) status = 'baixo_estoque';

    const { error } = await supabase
        .from('materias_primas')
        .insert([{ nome, quantidade, unidade, status, user_id: user.id }]);
    
    if (!error) fetchData();
}

// READ: Buscar dados com Filtro
async function fetchData() {
    const searchTerm = document.getElementById('search').value;
    
    let query = supabase.from('materias_primas').select('*');
    
    if (searchTerm) {
        query = query.ilike('nome', `%${searchTerm}%`);
    }

    const { data, error } = await query.order('nome', { ascending: true });
    
    if (data) renderTable(data);
}

// DELETE
async function deleteItem(id) {
    if (confirm("Deseja excluir este item?")) {
        await supabase.from('materias_primas').delete().eq('id', id);
        fetchData();
    }
}

// Renderização da UI
function renderTable(items) {
    const tbody = document.getElementById('inventory-table');
    tbody.innerHTML = items.map(item => `
        <tr class="border-b hover:bg-slate-50">
            <td class="p-4 font-medium">${item.nome}</td>
            <td class="p-4">${item.quantidade} ${item.unidade}</td>
            <td class="p-4">
                <span class="px-2 py-1 rounded text-xs ${getStatusClass(item.status)}">
                    ${item.status.replace('_', ' ')}
                </span>
            </td>
            <td class="p-4 text-right space-x-2">
                <button onclick="deleteItem('${item.id}')" class="text-red-500 hover:underline">Excluir</button>
            </td>
        </tr>
    `).join('');
}

function getStatusClass(status) {
    if (status === 'em_estoque') return 'bg-green-100 text-green-700';
    if (status === 'baixo_estoque') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
}

