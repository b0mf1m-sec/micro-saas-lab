// 1. Nossa lista de informações (Array)
const emails = ["bruno@teste.com", "contato@loja.com", "teste@admin.com", "suporte@saas.com", "vendas@empresa.com"];

// 2. O laço de repetição (Loop 'for')
for (let i = 0; i < emails.length; i++) {
  
  // 3. A condição (If)
  if (emails[i] === "teste@admin.com") {
    console.log("Acesso liberado! O admin foi encontrado na posição: " + i);
  }
  
}