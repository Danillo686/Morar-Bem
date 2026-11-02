import { api } from "./api";
import { supabase } from "./supabase";
import type { Imovel } from "../types";

export type DataSource = "api" | "supabase";

export interface DataResult<T> {
  data: T;
  source: DataSource;
}

interface ApiPropertyList {
  data: Imovel[];
}

interface ApiLeadResult {
  message: string;
}

export async function listarImoveis(): Promise<DataResult<Imovel[]>> {
  try {
    const response = await api.get<ApiPropertyList>("/api/lista");
    return { data: response.data.data, source: "api" };
  } catch (apiError) {
    console.warn("API de imóveis indisponível; tentando consultar o Supabase diretamente.", apiError);
  }

  if (!supabase) {
    throw new Error("API indisponível e conexão direta com o Supabase não configurada.");
  }

  const { data, error } = await supabase
    .from("imoveis")
    .select("codigo,titulo,preco");

  if (error) {
    console.error("Falha ao carregar imóveis pela API e pelo Supabase:", error);
    throw new Error("Não foi possível carregar os imóveis pela API nem pelo Supabase.");
  }

  return {
    data: data.map((property) => ({
      codigo: property.codigo,
      titulo: property.titulo,
      preco: String(property.preco),
    })),
    source: "supabase",
  };
}

export async function criarLead(
  codigoImovel: string,
  telefone: string,
): Promise<DataResult<string>> {
  const propertyCode = codigoImovel.trim();
  const phoneDigits = telefone.replace(/\D/g, "");

  if (!propertyCode) {
    throw new Error("Selecione um imóvel antes de enviar seu contato.");
  }
  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    throw new Error("O telefone deve ter 10 ou 11 dígitos.");
  }

  try {
    const response = await api.post<ApiLeadResult>("/api/lead", {
      codigo_imovel: propertyCode,
      telefone: phoneDigits,
    });
    return { data: response.data.message, source: "api" };
  } catch (apiError) {
    console.warn("API de leads indisponível; tentando registrar o interesse no Supabase.", apiError);
  }

  if (!supabase) {
    throw new Error("API indisponível e conexão direta com o Supabase não configurada.");
  }

  const { error } = await supabase.from("leads").insert({
    id_imovel: propertyCode,
    telefone: phoneDigits,
  });

  if (error) {
    if (error.code === "23503") {
      throw new Error("Não foi possível cadastrar o interesse: esse código de imóvel não existe.");
    }

    console.error("Falha ao registrar lead pela API e pelo Supabase:", error);
    throw new Error("Não foi possível registrar seu interesse pela API nem pelo Supabase.");
  }

  return {
    data: "Interesse registrado com sucesso!",
    source: "supabase",
  };
}
