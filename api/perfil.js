import {
  actualizarFotoPerfil,
  listarCuidadores,
  buscarPerfilPorEmail,
  getPerfilCuidador,
  getPerfilCliente,
} from "../../back-end/api/controllers/perfilController";

export default async function handler(req, res) {
  const { method, url, query } = req;

  try {

    if (url === "/api/perfil/foto" && method === "PUT") {
      const body = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => resolve(JSON.parse(data)));
        req.on("error", reject);
      });
      
      const r = await actualizarFotoPerfil(body);
      return res.status(200).json(r);
    }

    if (url === "/api/perfil/cuidadores" && method === "GET") {
      const r = await listarCuidadores();
      return res.status(200).json(r);
    }

    if (url.startsWith("/api/perfil/buscar") && method === "GET") {
      const { email } = query;
      const r = await buscarPerfilPorEmail(email);
      return res.status(200).json(r);
    }

    if (url.startsWith("/api/perfil/cuidador/") && method === "GET") {
      const id = url.split("/").pop();
      const r = await getPerfilCuidador(id);
      return res.status(200).json(r);
    }

    if (url.startsWith("/api/perfil/cliente/") && method === "GET") {
      const id = url.split("/").pop();
      const r = await getPerfilCliente(id);
      return res.status(200).json(r);
    }
    
    return res.status(405).json({ message: "Método não permitido" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erro interno" });
  }
}
