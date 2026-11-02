use http_body_util::BodyExt;
use reqwest::{Client, StatusCode};
use serde::Deserialize;
use serde_json::{Value, json};
use vercel_runtime::{Error, Request, Response, ResponseBody};

const REQUIRED_FIELDS_MESSAGE: &str = "O código e telefone são obrigatórios!";
const INVALID_PHONE_MESSAGE: &str = "O telefone deve ter 10 ou 11 digitos...";

#[derive(Deserialize)]
struct LeadRequest {
    codigo_imovel: String,
    telefone: String,
}

struct Supabase {
    client: Client,
    url: String,
    key: String,
}

impl Supabase {
    fn from_env() -> Result<Self, &'static str> {
        let url = std::env::var("SUPABASE_URL")
            .map_err(|_| "A variável SUPABASE_URL não está configurada.")?;
        let key = std::env::var("SUPABASE_SERVICE_ROLE_KEY")
            .map_err(|_| "A variável SUPABASE_SERVICE_ROLE_KEY não está configurada.")?;

        if url.trim().is_empty() || key.trim().is_empty() {
            return Err("As variáveis do Supabase não podem estar vazias.");
        }

        Ok(Self {
            client: Client::new(),
            url: url.trim_end_matches('/').to_owned(),
            key,
        })
    }

    fn request(&self, path: &str) -> reqwest::RequestBuilder {
        self.client
            .request(reqwest::Method::GET, format!("{}/rest/v1/{path}", self.url))
            .header("apikey", &self.key)
            .bearer_auth(&self.key)
    }

    async fn listar_imoveis(&self) -> Result<Value, ()> {
        let response = self
            .request("imoveis?select=codigo,titulo,preco")
            .send()
            .await
            .map_err(|error| {
                eprintln!("Falha ao consultar imóveis no Supabase: {error}");
            })?;

        if !response.status().is_success() {
            eprintln!(
                "Consulta de imóveis no Supabase retornou HTTP {}.",
                response.status()
            );
            return Err(());
        }

        let mut rows = response.json::<Value>().await.map_err(|error| {
            eprintln!("Resposta inválida ao consultar imóveis no Supabase: {error}");
        })?;

        let Some(properties) = rows.as_array_mut() else {
            eprintln!("O Supabase retornou uma lista de imóveis em formato inválido.");
            return Err(());
        };

        for property in properties {
            if let Some(price) = property.get_mut("preco")
                && let Some(number) = price.as_number()
            {
                *price = Value::String(number.to_string());
            }
        }

        Ok(rows)
    }

    async fn criar_lead(&self, lead: &LeadRequest) -> Result<Value, LeadCreateError> {
        let response = self
            .client
            .post(format!("{}/rest/v1/leads?select=*", self.url))
            .header("apikey", &self.key)
            .bearer_auth(&self.key)
            .header("Prefer", "return=representation")
            .json(&json!({
                "id_imovel": lead.codigo_imovel,
                "telefone": lead.telefone,
            }))
            .send()
            .await
            .map_err(|error| {
                eprintln!("Falha ao registrar lead no Supabase: {error}");
                LeadCreateError::Internal
            })?;

        let status = response.status();
        let body = response.json::<Value>().await.map_err(|error| {
            eprintln!("Resposta inválida ao registrar lead no Supabase: {error}");
            LeadCreateError::Internal
        })?;

        if !status.is_success() {
            if body.get("code").and_then(Value::as_str) == Some("23503") {
                return Err(LeadCreateError::UnknownProperty);
            }

            eprintln!("Cadastro de lead no Supabase retornou HTTP {status}.");
            return Err(LeadCreateError::Internal);
        }

        let Some(lead) = body.as_array().and_then(|leads| leads.first()) else {
            eprintln!("O Supabase não retornou o lead cadastrado.");
            return Err(LeadCreateError::Internal);
        };

        Ok(lead.clone())
    }
}

enum LeadCreateError {
    UnknownProperty,
    Internal,
}

fn allowed_origin(origin: Option<&str>) -> Option<String> {
    let origin = origin?;
    let allowed_origins =
        std::env::var("FRONTEND_ORIGIN").unwrap_or_else(|_| "http://localhost:5173".to_owned());

    if allowed_origins.trim() == "*" {
        return Some("*".to_owned());
    }

    allowed_origins
        .split(',')
        .map(str::trim)
        .find(|allowed| !allowed.is_empty() && *allowed == origin)
        .map(str::to_owned)
}

fn json_response(
    status: StatusCode,
    payload: Value,
    origin: Option<&str>,
) -> Result<Response<ResponseBody>, Error> {
    let mut response = Response::builder()
        .status(status)
        .header("Content-Type", "application/json; charset=utf-8")
        .header("Vary", "Origin");

    if let Some(origin) = allowed_origin(origin) {
        response = response
            .header("Access-Control-Allow-Origin", origin)
            .header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            .header("Access-Control-Allow-Headers", "Content-Type");
    }

    Ok(response.body(ResponseBody::from(payload.to_string()))?)
}

fn preflight_response(origin: Option<&str>) -> Result<Response<ResponseBody>, Error> {
    let mut response = Response::builder()
        .status(StatusCode::NO_CONTENT)
        .header("Vary", "Origin");

    if let Some(origin) = allowed_origin(origin) {
        response = response
            .header("Access-Control-Allow-Origin", origin)
            .header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            .header("Access-Control-Allow-Headers", "Content-Type")
            .header("Access-Control-Max-Age", "86400");
    }

    Ok(response.body(ResponseBody::from(""))?)
}

pub async fn handle_lista(req: Request) -> Result<Response<ResponseBody>, Error> {
    let origin = req
        .headers()
        .get("origin")
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);

    if req.method() == "OPTIONS" {
        return preflight_response(origin.as_deref());
    }

    if req.method() != "GET" {
        return json_response(
            StatusCode::METHOD_NOT_ALLOWED,
            json!({"message": "Método não permitido."}),
            origin.as_deref(),
        );
    }

    let supabase = match Supabase::from_env() {
        Ok(supabase) => supabase,
        Err(error) => {
            eprintln!("Configuração do Supabase inválida: {error}");
            return json_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                json!({"message": "Erro interno no servidor..."}),
                origin.as_deref(),
            );
        }
    };

    match supabase.listar_imoveis().await {
        Ok(properties) => json_response(
            StatusCode::OK,
            json!({
                "message": "Lista de imóveis carregada com sucesso!",
                "data": properties,
            }),
            origin.as_deref(),
        ),
        Err(()) => json_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            json!({"message": "Erro interno no servidor..."}),
            origin.as_deref(),
        ),
    }
}

pub async fn handle_lead(req: Request) -> Result<Response<ResponseBody>, Error> {
    let origin = req
        .headers()
        .get("origin")
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);

    if req.method() == "OPTIONS" {
        return preflight_response(origin.as_deref());
    }

    if req.method() != "POST" {
        return json_response(
            StatusCode::METHOD_NOT_ALLOWED,
            json!({"message": "Método não permitido."}),
            origin.as_deref(),
        );
    }

    let body = req.into_body().collect().await?.to_bytes();
    let lead = match serde_json::from_slice::<LeadRequest>(&body) {
        Ok(lead) => lead,
        Err(_) => {
            return json_response(
                StatusCode::BAD_REQUEST,
                json!({"message": REQUIRED_FIELDS_MESSAGE}),
                origin.as_deref(),
            );
        }
    };

    let lead = match validate_lead(lead) {
        Ok(lead) => lead,
        Err(message) => {
            return json_response(
                StatusCode::BAD_REQUEST,
                json!({"message": message}),
                origin.as_deref(),
            );
        }
    };

    let supabase = match Supabase::from_env() {
        Ok(supabase) => supabase,
        Err(error) => {
            eprintln!("Configuração do Supabase inválida: {error}");
            return json_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                json!({"message": "Erro interno..."}),
                origin.as_deref(),
            );
        }
    };

    match supabase.criar_lead(&lead).await {
        Ok(lead) => json_response(
            StatusCode::CREATED,
            json!({
                "message": "Interesse registrado com sucesso!",
                "lead": lead,
            }),
            origin.as_deref(),
        ),
        Err(LeadCreateError::UnknownProperty) => json_response(
            StatusCode::BAD_REQUEST,
            json!({
                "message": "Não foi possível cadastrar o interesse... Esse código de imóvel não existe",
            }),
            origin.as_deref(),
        ),
        Err(LeadCreateError::Internal) => json_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            json!({"message": "Erro interno..."}),
            origin.as_deref(),
        ),
    }
}

fn validate_lead(mut lead: LeadRequest) -> Result<LeadRequest, &'static str> {
    lead.codigo_imovel = lead.codigo_imovel.trim().to_owned();
    if lead.codigo_imovel.is_empty() || lead.telefone.trim().is_empty() {
        return Err(REQUIRED_FIELDS_MESSAGE);
    }

    lead.telefone = lead.telefone.chars().filter(char::is_ascii_digit).collect();

    if !(10..=11).contains(&lead.telefone.len()) {
        return Err(INVALID_PHONE_MESSAGE);
    }

    Ok(lead)
}

#[cfg(test)]
mod tests {
    use super::{LeadRequest, validate_lead};
    use serde_json::Value;

    #[test]
    fn normalizes_phone_and_property_code() {
        let lead = validate_lead(LeadRequest {
            codigo_imovel: " AP01 ".to_owned(),
            telefone: "(11) 99999-1234".to_owned(),
        })
        .expect("lead válido");

        assert_eq!(lead.codigo_imovel, "AP01");
        assert_eq!(lead.telefone, "11999991234");
    }

    #[test]
    fn rejects_phone_with_invalid_length() {
        let result = validate_lead(LeadRequest {
            codigo_imovel: "AP01".to_owned(),
            telefone: "12345".to_owned(),
        });

        assert!(result.is_err());
    }

    #[test]
    fn rejects_empty_property_code() {
        let result = validate_lead(LeadRequest {
            codigo_imovel: " ".to_owned(),
            telefone: "11999991234".to_owned(),
        });

        assert!(result.is_err());
    }

    #[test]
    fn preserves_decimal_price_as_text() {
        let property: Value = serde_json::from_str(r#"{"preco":250.00}"#).expect("JSON válido");
        let price = property
            .get("preco")
            .and_then(Value::as_number)
            .expect("preço numérico");

        assert_eq!(price.to_string(), "250.00");
    }
}
