import { useEffect, useState } from "react";
import { api } from "./servicos/api";
import type { Imovel } from "./types";

function App() {
  // Lista que vai guardar os imóveis, começa como um array vazio :)
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [telefone, setTelefone] = useState<string>("")
  const [imovelSelecionado, setImovelSelecionado] = useState<string | null>(null) 



  // useEffect consome minha api assim que a tela carrega
  useEffect(() => {
    const carregarImoveis = async () => {
      try {
        const resposta = await api.get('/lista');
        // setImoveis atualiza o nosso estado com a lista vinda do banco
        setImoveis(resposta.data.data);
      } catch (erro) {
        console.log('Erro ao carregar imóveis no frontend', erro);
      }
    };

    carregarImoveis();
  }, []);




  const lidarComEnvioLead = async (evento: React.FormEvent) => {
    evento.preventDefault() //Evita que a página recarregue ao enviar o formulário :)
    
    if (!imovelSelecionado || !telefone) {
      alert('Por favor, selecione um imóvel e digite seu telefone!')
      return
    } 
  

    try {
      // Fazemos o POST mandando exatamente os nomes das variáveis que o backend
      const resposta = await api.post('/lead', {
        codigo_imovel: imovelSelecionado,
        telefone: telefone
      })

      alert(resposta.data.message)
    
      //Limpa os campos após sucesso
      setTelefone("")
      setImovelSelecionado(null)
    } catch (erro: any) {
      console.error('Erro ao enviar o contato: ', erro)
      alert(erro.response?.data?.message || 'Erro ao registrar interesse.')
    }
}




  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", backgroundColor: "#f4f4f9", minHeight: "100vh" }}>
      <h1>🏠 Vitrine Digital - Imobiliária Morar Bem</h1>

      {/* Exibição da vitrine de imóveis */}
      <div style={{ display: "flex", gap: "20px", marginTop: "20px", flexWrap: "wrap" }}>
        {imoveis.map((imovel) => (
          <div 
            key={imovel.codigo} 
            style={{
              border: imovelSelecionado === imovel.codigo ? "2px solid #007bff" : "1px solid #ccc",
              borderRadius: "8px",
              padding: "15px",
              backgroundColor: "#fff",
              width: "250px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
              transition: "0.2s"
            }}
          >
            <h3>{imovel.titulo}</h3>
            <p><strong>Código:</strong> {imovel.codigo}</p>
            <p style={{ color: "green", fontSize: "18px", fontWeight: "bold" }}>R$ {imovel.preco}</p>
            
            {/* Botão que define qual imóvel foi clicado */}
            <button 
              onClick={() => setImovelSelecionado(imovel.codigo)}
              style={{
                backgroundColor: imovelSelecionado === imovel.codigo ? "#007bff" : "#28a745",
                color: "#fff",
                border: "none",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                width: "100%"
              }}
            >
              {imovelSelecionado === imovel.codigo ? "Selecionado!" : "Tenho Interesse"}
            </button>
          </div>
        ))}
      </div>

      {/* 4. FORMULÁRIO DE CAPTURA (Só aparece se o usuário selecionar um imóvel) */}
      {imovelSelecionado && (
        <form onSubmit={lidarComEnvioLead} style={{ marginTop: "40px", padding: "20px", backgroundColor: "#fff", borderRadius: "8px", maxWidth: "400px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
          <h3>Fale com um corretor</h3>
          <p>Você demonstrou interesse no imóvel: <strong>{imovelSelecionado}</strong></p>
          
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Seu Telefone:</label>
            <input 
              type="text" 
              placeholder="(11) 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)} // Atualiza o estado a cada tecla digitada
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
          </div>

          <button type="submit" style={{ backgroundColor: "#007bff", color: "#fff", border: "none", padding: "10px 15px", borderRadius: "4px", cursor: "pointer", width: "100%" }}>
            Enviar Meu Contato
          </button>
        </form>
      )}
    </div>
  );
}

export default App;
