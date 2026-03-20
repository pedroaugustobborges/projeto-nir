import requests
import json

# ========================================
# CONFIGURAÇÕES DA API - ATUALIZE AQUI!
# ========================================
API_URL = 'https://api.colmeia.me/v1/rest/marketing-send-campaign'
ID_SOCIAL_NETWORK = 'oFzvyMeL6e8ALfPc4DPQICNTwWhuU9' #HECAD
AUTHORIZATION_TOKEN = 'OCP4LZlB0IswDY2tyXR5uXSgFZzvEvtq'  # Token não expirável retirado da página de EXTERNAL API
ID_CAMPAIGN_ACTION = 'T2kcHrphMvr9FoH406FpihK9cTeGnx' #RETIRADO do Copy ID da campanha 

def enviar_mensagem_whatsapp(Nome, Especialidade, celular):
    """
    Envia mensagem via API Colmeia
    
    Args:
        Nome (str): Nome do destinatário
        Especialidade (str): Especialidade médica
        celular (str): Número de telefone com DDD
    
    Returns:
        dict: Resposta da API
    """
    
    # Headers necessários
    headers = {
        'Content-Type': 'application/json',
        'idSocialNetwork': ID_SOCIAL_NETWORK,
        'Authorization': AUTHORIZATION_TOKEN
    }
    
    # Corpo da requisição (seguindo formato da documentação)
    payload = {
        "idCampaignAction": ID_CAMPAIGN_ACTION,
        "contactList": [
            {
                "Nome": Nome,
                "Especialidade": Especialidade,
                "telefone": celular  # Usando 'telefone' conforme documentação
            }
        ]
    }
    
    try:
        # Fazendo a requisição POST
        response = requests.post(API_URL, headers=headers, json=payload)
        
        # Verificando o status da resposta
        print(f"Status Code: {response.status_code}")
        print(f"Resposta: {response.text}")
        
        # Retornando a resposta em JSON (se disponível)
        if response.status_code == 200:
            print("\n✅ Mensagem enviada com sucesso!")
            return response.json() if response.text else {"status": "success"}
        else:
            print(f"\n❌ Erro ao enviar mensagem: {response.status_code}")
            return {"error": response.text}
            
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Erro na requisição: {str(e)}")
        return {"error": str(e)}


if __name__ == "__main__":
    # Parâmetros da mensagem
    Nome = "Pedro"
    Especialidade = "Cardiologia"
    celular = "5562993013303"  # Formato: código país (55) + DDD + número
    
    print("=== Enviando mensagem via WhatsApp ===")
    print(f"Nome: {Nome}")
    print(f"Especialidade: {Especialidade}")
    print(f"Celular: {celular}")
    print("=" * 40)
    
    # Enviando a mensagem
    resultado = enviar_mensagem_whatsapp(Nome, Especialidade, celular)
    
    # Exibindo resultado
    print("\nResultado completo:")
    print(json.dumps(resultado, indent=2, ensure_ascii=False))