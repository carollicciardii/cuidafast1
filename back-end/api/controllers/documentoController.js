import mindeeClient from "../config/mindee.js";
import * as mindee from "mindee";

export async function validarDocumento(caminhoArquivo) {
  try {

    const inferenceParams = {
      modelId: "9763ad16-d97a-455f-ac06-c54e1c3e053e", 
      rag: false
    };
    const inputSource = new mindee.PathInput({ inputPath: caminhoArquivo });


    const response = await mindeeClient.enqueueAndGetInference(
      inputSource,
      inferenceParams
    );


    return response.inference.prediction;
  } catch (error) {
    console.error("Erro ao validar documento:", error);
    throw error;
  }
}

